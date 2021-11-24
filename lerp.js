// References:
//  https://stackoverflow.com/questions/4353525/floating-point-linear-interpolation
//  https://math.stackexchange.com/questions/907327/accurate-floating-point-linear-interpolation#answer-1798323
//  https://math.stackexchange.com/questions/4184626/what-is-the-ulp-variance-of-the-common-implementation-of-lerp?noredirect=1&lq=1

// Note counterexamples to conjecture that a+(b-a)/2 <= (a+b)/2 <= b-(b-a)/2:
//   a=9/64 b=13/16
//   a=7/32 b=15/16
//   a=5/64 b=7/8
//   a=9/32 b=7/8
//   a=13/64 b=3/4
//   a=5/64 b=3/4
//   a=5/32 b=3/4
//   a=1/16 b=3/4
//   a=1/32 b=5/8

// TODO: js console error "Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist." when reloading after 3m or so
//   - possibly relevant:
//       https://stackoverflow.com/questions/54181734/chrome-extension-message-passing-unchecked-runtime-lasterror-could-not-establi/54686484#answer-54686484
//   - I think it's the "Google Docs Offline" extension.
//     ARGH, no, it happened even with that turned off :-(
//     WTF?

// TODO: lots of failures with "magically exact", wtf?  Especially when b is 1. 
// e.g. this shows a circle near t=0  (at t=14/4096):
// http://localhost:8000/lerp.html?numFractionBits=4&minExponent=-12&a=5/32&b=1
// and this, not so near 0, at t=27/512:
// http://localhost:8000/lerp.html?numFractionBits=4&minExponent=-12&a=19/256&b=1
// and this, near zero, at t=1/1024
// http://localhost:8000/lerp.html?numFractionBits=2&minExponent=-12&a=7/512&b=1
// See the todos in that function.

// TODO: "smartest" seems perfect, but only if minExponent is sufficiently low.  can we make it perfect even with not-so-low minE?
// TODO: make the selection of lerp algorithm persist in url bar
// TODO: the stuff in url bar should probably be '#' params rather than '?' params
// TODO: oscillating between two methods mode?  could be helpful, although the most common thing we want, that is, comparison with magic exact, is accompliced via the ringed dots
// TODO: make lerp-favicon.png a real picture of something
// TODO: the usual event screwup, need to listen on window instead
// TODO: the usual select-the-text screwup; how to disable?
// TODO: put the a and b labels next to the moving line
// TODO: label axes
// TODO: allow adjusting minExponent too
// TODO: show numFractionBits and minExponent
// TODO: change names so caller only says aIntent,bIntent, to reduce confusion
// TODO: show in fractional form
// TODO: figure out if there's a better way!
// TODO: show more interesting lines for the various algorithms
// TODO: dragging a or b up or down slowly doesn't redraw until I've stopped moving; that's unfriendly
// TODO: highlight non-monotonicity! (how?)
// TODO: custom expressions?  would be cool, need to be able to parse
//             ()
//             + -
//             *   (maybe not division? not sure)
//             ?:
//             < <= > >=
//             variables? hmm


/*
  Possible stackexchange problem:
    exact floating point sums, and correctly rounded approximations thereof

    I would like to know a simple method for computing and representing the exact sum of an arbitrary number of IEEE-784 floating point values,
    and also for correctly rounding it to the nearest representable number, using the round-ties-to-even rule.

    I propose the following very simple method, based on IEEE-784 addition and subtraction
    with rounding usint he round-ties-to-even rule:

       Put the numbers to be summed in an array A
       while there exist two adjacent numbers a,b in A such that a(+)b != a:
         swap a and b if necessary so that abs(a)>=abs(b)
         replace a,b with fast_two_sum(a,b)
       remove any zeros from the end of A

     where fast_two_sum is the following function,
     attributed to Dekker in various papers such as Shewchuk's
     short "Robust Adaptive Floating-Point Geometric Predicates"
     and longer "Adaptive Precision Floating-Point Arithmetic and Fast Robust Geometric Predicates":

         def fast_two_sum(a,b):
           assert abs(a) >= abs(b)
           hi = a(+)b
           lo = b(-)(hi(-)a)
           assert hi+lo = a+b
           assert hi(+)lo == hi
           return (hi,lo)


    There is some freedom in the choice of what order to examine adjacent pairs a,b,
    although this freedom doesn't affect the final answer.
    Reasonable performance can be achieved by obvious heuristics such as pre-sorting from high to low,
    and then sweeping back and forth across the array.
    Better worst-case performance (O(n log n)) can be achieved with more care, but I won't go into that here (Priest's paper gives details).

    At the end of the algorithm, the sum has been replaced by its "canonical non-overlapping sum representation".
    That is, the exact sum of the final array is the same as the exact sum of the original numbers,
    and the numbers in the final array are decreasing, and they are "non-overlapping" in their ranges of bit positions.
    Furthermore, given all those constraints, abs(A[0]) is as large as possible,
    and then abs(A[1]) is as large as possible given A[0], etc.
    I.e. the bits are pushed towards the beginning of the array, as much as possible.

    Now, how do we correctly round that final exact-sum array
    to the nearest representable single number, with ties-to-even?

    Well, the first number A[0] is *almost* the right answer.
    In fact, it's always *exactly* the right answer, except in one annoying case, it seems.
    That case is when all of the following are true:
      - A[1] and A[2] exist and have the same sign, and
      - A[0](+)A[1] got rounded to A[0] by virtue of being a tie that was rounded to even, and
      - A[1](+)A[2] got rounded to A[1] by virtue of being a tie that was rounded to even.
    In that case, A[0]+A[1]+A[2](+...) has a unique nearest representable number (i.e. it's not a tie),
    and that number is *not* A[0]; it's A[0]'s successor (if A[1],A[2] > 0) or predecessor (if A[1],A[2] < 0).

    So my question is: is there a simple way to calculate the nearest representable number to the final A[0]+A[1]+A[2]+...,
    with ties correctly rounded to even?
    The simplest way I can think of is to test for exactly the above special case.
    That is: test whether A[1] and A[2] exist, and have the same sign, and are in exactly the right proportions with A[0]
    such that the bad case happens.  That's not terribly complicated, but it's bit messier than I'd like.

    So, is there a simpler more concise way?

    Shewchuk's two papers deal with non-overlapping linear sums with more relaxed constraints,
    such that A[0] is not necessarily a very good approximation.
    For such representations, they suggest an APPROXIMATE procedure that simply sums the final numbers
    from smallest to largest instead, observing that the result errs by less than one ulp.
    While this is true, it still yields A[0] in the above example, which is not the correctly rounded answer.

    Shewchuk's papers also refer to Priest's paper "Algorithms for Arbitrary Precision Floating Point Arithmetic".
    I've looked at that, and it doesn't seem to address this exact issue, but refers to another paper
    by Pichat: "Correction d'une somme en arithmetique a virgule flottante".  I'm not sure whether that paper
    addresses the issue, since I have not translated it from French yet.
    ------------------------------

    TODO: read priest!  http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.55.3546&rep=rep1&type=pdf
          it doesn't address this exact point, but refers to Prichat.
          Argh, Prichat's paper is in french!

*/
/*
  Q: is epsilon 2^-52 or 2^-53?
  PA: https://en.wikipedia.org/wiki/Double-precision_floating-point_format
      says:
      - it's 2^-53
      - but that means the max relative rounding error... *spacing*
        between 1 and the next number is actually 2^-52, because
        there are 52 bits of fraction.  Hmm weird,
        that's not the definition of epsilon I'm familiar with, I don't think?
        Right, std::numeric_limits<double>::epsilon is 2^-52, not 2^-53.
        Yeah, https://en.wikipedia.org/wiki/Machine_epsilon shows 2 different definitions. [b] is the one used by numeric_limits.  Yeah it says all that.

  Q: how do I do arbitrary precision floating point, as a list of non-overlapping doubles x0+x1+x2+... as many as are needed?
     Seems like, for example, I should be able to do, at least, arbitrary summation, by splitting each number into same number of parts
     according to the min and max exponent, then doing the sum in those parts, then recombining??
     I think I need to start by understanding shewchuk: https://people.eecs.berkeley.edu/~jrs/papers/robust-predicates.pdf
     Yes, he operates in this framework.  Cool.  Done.

  From shewchuk:
    dekker: if |a|>=|b|:
        Fast-two-sum(a,b):
          x = a + b
          b_virtual = x - a
          y = b - b_virtual
          return (x,y)
          I.e.
          return (a+b, b-(a+b-a))
          I.e.
          return (a+b, b-(b+a-a))  <= seems nicest maybe
          I.e.
          return (a+b, (a-(a+b))+b)
          return (a+b, b+(a-(a+b)))

    So that implies:
        Fast-two-difference(a,b):
          return (a-b, -b-(-b+a-a))
          return (a-b, -b+(b-a+a))
          return (a-b, (b-a+a)-b)  <= seems nicest maybe
          return (a-b, (a-(a-b))-b)

    Q: is there a symmetric version of that, that doesn't care which of a or b is bigger?


    knuth:
        two-sum(a,b):
          x = a+b
          b_virtual = x-a
          a_virtual = x-b_virtual
          b_roundoff = b-b_virtual
          a_roundoff = a-a_virtual
          y = a_roundoff+b_roundoff
          return x,y
          I.e.
          return (a+b,a_roundoff+b_roundoff)
          return (a+b,(a-a_virtual)+(b-b_virtual))
          return (a+b,(a-(x-b_virtual))+(b-(x-a)))
          return (a+b,(a-((a+b)-((a+b)-a)))+(b-((a+b)-a)))
        jeez, seems too complicated


    All right, so can we extend that into an accurate a+(b-a)*t?
    Let -! mean exact, etc., so - means the hardware one.
    If 0<=b<=a:
      b-!a = (b-a, b-(b-a+a))
    If 0<=a<=b:
      b-!a = (b-a) +! ((a-b+b)-a)
      So exact-ish (b-!a)*!t =
            (b-a)*!t +! ((a-b+b)-a)*!t
            =
      bleah.
    Note, however, that this part is a 2x2 determinant (aka dot product),
    which kahan can do exactly.  So, then just need to add a to the result?  Hmm.
    Or, can frame it as:
           1*!a +! (b-a)*!t + ((a-b+b)-a)*!t
    Ok, that's a length-3 dot product.  We should be able to do this!!
    https://accurate-algorithms.readthedocs.io/en/latest/ch05dotprod.html
    (also same in https://readthedocs.org/projects/accurate-algorithms/downloads/pdf/latest/)
    gives algorithm Dot2, for computing a dot product.
    That algorithm is:

      function [p] = Dot2 (x, y, N)
        [p, s] = TwoProduct (x(1), y(1));
        for i = 2:N
          [h, r] = TwoProduct (x(i), y(i));
          [p, q] = TwoSum (p, h);
          s = fl(s + fl(q + r));
        end
        p = fl(p + s);
      end

    I.e. in python:
      def TwoSum(a,b):
        ... swap if necessary so that |a|>=|b| ...
        x = a(+)b
        y = (a(-)x)(+)b = b(-)(x(-)a) = b(-)(b(+)a(-)a)
      def TwoProduct(a,b):
        x = a*b
        y = fma(a,b,-x)
        return x,y
      def Dot2(x,y):
        [p,s] = TwoProduct(x[0],y[0])
        for xi,yi in zip(x,y)[1:]:
          [h,r] = TwoProduct(xi,yi)
          [p,q] = TwoSum(p,h)
          s += (q + r)   (with rounding at each step)
        return p + s
    note that the special treatment of the first pair is just an optimization.  so it's more simply expressed as:
      def Dot2(xs,ys):
        Hi,Lo = 0,0
        for x,y in zip(xs,ys):
          [hi,lo0] = TwoProduct(x,y)
          [Hi,lo1] = TwoSum(Hi,hi)
          Lo += (lo0 + lo1)   (with rounding at each step)
        return Hi+Lo

      in particular, Sum(xs):
        Hi,Lo = 0,0
        for x in xs:
          Hi,lo = TwoSum(Hi,x)
          Lo = Lo(+)lo
        return Hi+Lo.
      hmm, is this kahan summation?  not quite, I think.
      one potential problem is that Lo never feeds back into Hi, until the very end.  I think that's not true of Kahan!
      probably kahan summation sets Hi,Lo = TwoSum(Hi,Lo) at each step (but can assume Hi is the larger, in this step, so faster?).  Not sure.
      At any rate, does it hurt to normalize at each step??  That is: Hi,Lo = TwoSum(Hi,Lo), but without needing the swap check at the beginning, probably.

      AH, I see what this is.
      For each pair:
        TwoProduct them (giving an error term)
        Add the result to the running sum (giving another error term)
        add the two new error terms into the running error term.

      This does not seem right!  It can't be right to not let Lo feed back into Hi...
      that means Lo can get too big for its britches and lose precision!!!
      So what's a simple example of that??
      Well, let's see, when a multiplication needs *all* the bits in order to be accurate...
      e.g. 1/3 * 1/3, or something like that?


    In particular, that should tell us how to compute:
        a*b+c as x+y
        a*(b+c) as x+y  (since it's the same as: a*b + a*c as x+y)
        a+b+c (since it's the same as 1*a+1*b+1*c)

    1. a*b+c as x+y
      1a: do it as a*b + c*1
            p,s = TwoProduct(a,b)
              x = a(*)b
              y = fma(a,b,-x)
            p,s = a(*)b, fma(a,b,-(a(*)b))
            h,0 = TwoProduct(c,1) = c,0
            p,q = TwoSum(p,h) = TwoSum(p,c) = TwoSum(a(*)b,c)  (need to test order for this)
            s = s (+) q = fma(a,b,-(a(*)b)) (+) the y of TwoSum(a(*)b,c)
            return p(+)s
     1b: do it as c*1 + a*b
            p,s = TwoProduct(c,1) = c,0
            h,r = TwoProduct(a,b) = a(*)b, fma(a,b,-(a(*)b)))
            p,q = TwoSum(p,h) = TwoSum(c,a(*)b)  (need to test order for this)
            s = (q+r) = (the y of TwoSum(a(*)b,c) (+) (the y of TwoProduct(a,b))
                      = (the y of TwoSum(a(*)b,c) (+) fma(a,b,-(a(*)b)))
            return p(+)s
     Yes, same answer either way.

    3. a+b+c as x+y
            p,s = TwoProduct(a,1) = a,0

            h,r = TwoProduct(b,1) = b,0
            p,q = TwoSum(p,h) = TwoSum(a,b)
            s = s(+)(q(+)r) = 0+(the y of TwoSum(a,b))+0 = (the y of TwoSum(a,b))
            h,r = TwoProduct(c,1

    Review: kahan summation, from https://en.wikipedia.org/wiki/Kahan_summation_algorithm#The_algorithm , (reversing the sense of c for my sanity):

      def KahanSum(input):
        hi,lo = 0.,0.
        for i:
          yy = input[i] + lo
          tt = hi + yy
          lo = yy - (tt - hi)
          hi = tt

          i.e.
            yy = input[i] + lo
            tt = hi + yy
            hi,lo = tt, yy-(tt-hi)
          i.e.
            temp = input[i] + lo  (and that's the end of the old lo... which is weird, isn't it? that doesn't seem right; can't it disappear something important?)
            hi,lo = hi+temp, temp-(temp+hi-hi)

        return hi,lo

    So let's see, does that naturally extend to a dot product algorithm?
      def KahanDotProduct(xs,ys):
        hi,lo = 0.,0.
        for i:
          temp = fma(xs[i],ys[i],lo)
          hi,lo = hi+temp, temp-(temp+hi-hi)
        return hi,lo
    (Oh, realized this later, this isn't a faithful extension)
    Huh.  How does this compare to the TwoProduct algorithm described earlier??
    And, does it coincide with "Kahan's 2x2 determinant"?  Hmm.

    Oh argh, this https://indico.cern.ch/event/625333/contributions/2628505/attachments/1490516/2316655/codas_fpa.pdf
    says "Kahan Summation Algorithm does not work for “ill-conditioned” sums  In particular if an element is larger than the sum" ... which is the case here :-(


    Ok let's explore https://stackoverflow.com/questions/39804069/robust-linear-interpolation#answer-52979923 .

      diff = B-A
        a=B
        b=-A
        sum = a+b = B-A
        z = sum-a = sum-B = B-A-B
        err1 = a-(sum-z)+(b-z) = B-(B-A-(B-A-B))+(B-(B-A-B))
      err1 = B-(B-A-(B-A-B))+(B-(B-A-B))
        a = diff = B-A
        b = t
        prod = a*b = (B-A)*t
        err2 = fma(a,b,-prod) = fma(B-A,t,-((B-A)*t))
      prod = (B-A)*t
      answer = A+prod = A+(B-A)*t

    Bleah.  Not sure what to do with the errs.

    BUT... that method *does* illuminate how to tell
    the exact error of multiplication!
    That is, given a and b, a*!b is exactly x+y
    where:
        x = a*b
        y = fma(a,b,-x)
        return (x,y)
    and x,y have no overlap.  Hmm, can we use that??

    Well, we want a+!(b-!a)*!t rounded to nearest.
    Ok, we know we can get c,d such that c+!d == b-!a, with no overlap.
    So then we want:
           a+!(c+!d)*!t
        = a +! c*!t +! d*!t

  ====
  Ok now that I am maybe smarter:

  lerp(a,b) = (1-t)*a + t*b
            = a - t*a + t*b
            = a + t*(b-a)

  Hmm.  Well let's start by trying 3 more canned algorithms:
                a - t*a + b
                b - t*a + a
                a + b - t*a


*/

"use strict";
console.log("in lerp.js")
registerSourceCodeLinesAndRequire([
  "./getURLParameter.js",
  "./setURLParam.js",
  "./PRINT.js",
  "./CHECK.js",
  "./STRINGIFY.js",
], function(
  getURLParameterModule,
  setURLParamModule,
  PRINT,
  CHECK,
  STRINGIFY,
  shouldBeUndefined
){
  console.log("    in lerp.js require callback");
  CHECK.EQ(shouldBeUndefined, undefined);

  //const numFractionBitsDefault = 2;
  //const minExponentDefault = -5;

  const numFractionBitsDefault = 3;
  const minExponentDefault = -6;  // 4 if using 512*1024

  let numFractionBits = getURLParameterModule.getURLParameterFloatOr("numFractionBits", numFractionBitsDefault);
  let minExponent = getURLParameterModule.getURLParameterFloatOr("minExponent", minExponentDefault);

  let aString = getURLParameterModule.getURLParameterOr("a", "11/256");
  let bString = getURLParameterModule.getURLParameterOr("b", "1");

  const enable_custom_string = getURLParameterModule.getURLParameterOr("enable_custom", null);

  const parseBinaryFloat = s => {
    CHECK.NE(s, undefined);
    let sign = 1;
    let i = 0;
    if (i < s.length && s[i] === '-') {
      sign *= -1;
      i++;
    }
    let answer = 0;
    while (i < s.length && (s[i] === '0' || s[i] === '1')) {
      answer = answer*2 + (s[i++]-'0');
    }
    if (i < s.length && s[i] == '.') {
      i++;
      let multiplier = .5;
      while (i < s.length && (s[i] === '0' || s[i] === '1')) {
        answer += (s[i++]-'0')*multiplier;
        multiplier *= .5;
      }
    }
    answer *= sign;
    return answer;
  };  // parseBinaryFloat
  const toBinaryString = x => {
    CHECK.NE(x, undefined);
    const toBinaryStringOfInt = i => {
      let answer = ''+(i%2);
      i = Math.floor(i/2);
      while (i != 0) {
        answer = (i%2) + answer;
        i = Math.floor(i/2);
      }
      return answer;
    };
    let answer = "";
    let scratch = x;
    if (scratch < 0) {
      scratch *= -1;
      answer = "-";
    }
    let intpart = Math.floor(scratch);
    scratch -= intpart;
    answer += toBinaryStringOfInt(intpart);
    if (scratch !== 0.) {
      answer += ".";
      while (scratch !== 0.) {
        scratch *= 2;
        if (scratch >= 1.) {
          answer += "1";
          scratch -= 1.;
        } else {
          answer += "0";
        }
      }
    }
    return answer;
  };
  const toDebugString = x => {
    CHECK.NE(x, undefined);
    if (Array.isArray(x)) {
      let answer = "[";
      for (let i = 0; i < x.length; ++i) {
        if (i > 0) answer += ",";
        answer += toDebugString(x[i]);
      }
      answer += "]";
      return answer;
    }

    const answers = [
      ""+x,
      toBinaryString(x),
      toFractionString(x),
    ];
    let answer = "("+answers[0];
    for (let i = 1; i < answers.length; ++i) {  // skip 0
      if (answers[i] != answers[i-1]) {
        answer += "="+answers[i];
      }
    }
    answer += ")";
    return answer;
  };
  let PRINTDEBUG = PRINT.makePRINTlikeFunction('PRINTDEBUG', (expr, value) => console.log(expr+" = "+toDebugString(value)));

  const toFractionString = x => {
    CHECK.NE(x, undefined);
    let numerator = x;
    let denominator = 1.;
    while (Math.floor(numerator) != numerator) {
      numerator *= 2.;
      denominator *= 2.;
    }
    if (denominator == 1.)
      return ""+numerator;
    else
      return numerator+"/"+denominator;
  };
  const parseFractionString = s => {
    CHECK.NE(s, undefined);
    const parts = s.split("/");
    CHECK(parts.length == 1 || parts.length == 2);
    if (parts.length == 1) {
      return parseFloat(parts[0]);
    } else {
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
  };
  const parseBoolean = s => {
    CHECK.NE(s, undefined);
    if (s === "true") {
      return true;
    } else if (s === "false") {
      return false;
    } else {
      throw new Error("bad boolean value "+JSON.stringify(s));
    }
  };

  let a = parseFractionString(aString);
  let b = parseFractionString(bString);

  //a = round_to_nearest_representable(a);
  //b = round_to_nearest_representable(b);

  const enable_custom = enable_custom_string===null ? false : parseBoolean(enable_custom_string);

  const xformUrlPart = urlPart=>urlPart;
  setURLParamModule.setURLAndParamsInURLBar(xformUrlPart,
                                            [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)],['enable_custom', enable_custom_string!==null?''+enable_custom:null]],
                                            /*whetherToEncodeValue=*/false);  // don't encode the '/' as  %2F


  //======================================
  // Begin float utilities
  const get_rounding_quantum = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    const subnormalThreshold = 2**minExponent;
    if (Math.abs(x) < subnormalThreshold) {
      return subnormalThreshold / 2**numFractionBits;
    } else {
      const roundedDownToPowerOf2 = 2**Math.floor(Math.log2(Math.abs(x)));
      return roundedDownToPowerOf2 / 2**numFractionBits;
    }
  };
  const round_down_to_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    return Math.floor(x/quantum)*quantum;
  };
  const round_up_to_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    return Math.ceil(x/quantum)*quantum;
  };

  const round_to_nearest_representable_without_checking_against_opposite = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("            in round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+toDebugString(x)+")");
    CHECK.GE(numFractionBits, 0);
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    if (verboseLevel >= 1) console.log("              quantum = "+toDebugString(quantum));
    const Lo = Math.floor(x/quantum);
    const Hi = Math.ceil(x/quantum);
    if (verboseLevel >= 1) console.log("              Lo = "+toDebugString(Lo));
    if (verboseLevel >= 1) console.log("              Hi = "+toDebugString(Hi));
    let answer;
    if (Lo == Hi) {
      answer = Lo*quantum;
      if (verboseLevel >= 1) console.log("            out round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+"), returning Lo*quantum="+toDebugString(Lo*quantum)+" because Lo==Hi");
    } else {
      const lo = Lo*quantum;
      const hi = Hi*quantum;
      if (x-lo < hi-x) {
        answer = lo;
      } else if (x-lo > hi-x) {
        answer = hi;
      } else if (Lo%2 == 0) {
        answer = lo;
      } else {
        answer = hi;
      }
    }
    if (verboseLevel >= 1) console.log("            out round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+"), returning Lo*quantum="+toDebugString(answer));
    return answer;
  };

  const round_to_nearest_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    const answer = round_to_nearest_representable_without_checking_against_opposite(numFractionBits, minExponent, x);
    CHECK.EQ(round_to_nearest_representable_without_checking_against_opposite(numFractionBits, minExponent, -x), -answer);
    return answer;
  };

  const is_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    return round_down_to_representable(numFractionBits, minExponent, x) == x;
  };
  const pred_without_checking_against_succ = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    CHECK(is_representable(numFractionBits, minExponent, x));
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    // quantum is not exactly what we want.  but it's not more than a couple of orders of magnitude off.
    const answer = round_down_to_representable(numFractionBits, minExponent, x - quantum/4.);
    CHECK.LT(answer, x);
    CHECK(is_representable(numFractionBits, minExponent, answer));
    CHECK(!is_representable(numFractionBits, minExponent, (answer+x)/2.));
    return answer;
  };
  const succ_without_checking_against_pred = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    let verboseLevel = 0;
    if (verboseLevel >= 1) console.log("            in succ_without_checking_against_pred(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+toDebugString(x)+")");
    CHECK(is_representable(numFractionBits, minExponent, x));
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    // quantum is not exactly what we want.  but it's not more than a couple of orders of magnitude off.
    const answer = round_up_to_representable(numFractionBits, minExponent, x + quantum/4.);
    if (verboseLevel >= 1) console.log("            out succ_without_checking_against_pred(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+toDebugString(x)+"), returning "+toDebugString(answer));
    CHECK.GT(answer, x);
    CHECK(is_representable(numFractionBits, minExponent, answer));
    CHECK(!is_representable(numFractionBits, minExponent, (x+answer)/2.));
    return answer;
  };
  const pred = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    const answer = pred_without_checking_against_succ(numFractionBits, minExponent, x);
    CHECK.EQ(succ_without_checking_against_pred(numFractionBits, minExponent, answer), x);
    return answer;
  };
  const succ = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK.GE(numFractionBits, 0);
    const answer = succ_without_checking_against_pred(numFractionBits, minExponent, x);
    CHECK.EQ(pred_without_checking_against_succ(numFractionBits, minExponent, answer), x);
    return answer;
  };
  // a,b need not be representable
  const getFloatsInRange = (numFractionBits, minExponent, a, b) => {
    CHECK.NE(b, undefined);
    CHECK.GE(numFractionBits, 0);
    let verboseLevel = 0;
    if (verboseLevel >= 1) console.log("        in getFloatsInRange(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", a="+toDebugString(a)+", b="+toDebugString(b)+")");
    const first = round_up_to_representable(numFractionBits, minExponent, a);
    const last = round_down_to_representable(numFractionBits, minExponent, b);
    const answer = [];
    for (let x = first; x <= last; x = succ(numFractionBits, minExponent, x)) {
      answer.push(x);
    }
    if (verboseLevel >= 1) console.log("        out getFloatsInRange(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", a="+toDebugString(a)+", b="+toDebugString(b)+"), returning "+toDebugString(answer));
    return answer;
  };
  const plus = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    return round_to_nearest_representable(numFractionBits, minExponent, a+b);
  };
  const minus = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    return round_to_nearest_representable(numFractionBits, minExponent, a-b);
  };
  const times = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    return round_to_nearest_representable(numFractionBits, minExponent, a*b);
  };
  // TODO: prevent double rounding, using paper
  // "When double rounding is odd":
  // https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.75.5554&rep=rep1&type=pdf
  const dividedby = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    CHECK.NE(b, 0);  // we don't do nan or inf, so disallow division by 0
    return round_to_nearest_representable(numFractionBits, minExponent, a/b);
  };
  const fma = (numFractionBits, minExponent, a, b, c) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    CHECK(is_representable(numFractionBits, minExponent, c));
    return round_to_nearest_representable(numFractionBits, minExponent, a*b+c);
  };

  // Stuff from https://people.eecs.berkeley.edu/~jrs/papers/robust-predicates.pdf
  const fast_two_sum = (numFractionBits, minExponent, a, b) => {
    CHECK.NE(b, undefined);
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    // "fast" means we *know* |a|>=|b|, rather than sorting them.
    CHECK.GE(Math.abs(a), Math.abs(b));
    const x = plus(numFractionBits, minExponent, a, b);
    const b_virtual  = minus(numFractionBits, minExponent, x, a);
    const y = minus(numFractionBits, minExponent,  b, b_virtual);
    return [x,y];
  };
  const two_sum = (numFractionBits, minExponent, a, b) => {
    CHECK.NE(b, undefined);
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    if (Math.abs(a) >= Math.abs(b)) return fast_two_sum(numFractionBits, minExponent, a, b);
    else return fast_two_sum(numFractionBits, minExponent, b, a);
  };
  const linear_expansion_sum = (numFractionBits, minExponent, e, f) => {
    CHECK.NE(f, undefined);
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("in linear_expansion_sum(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+" f="+toDebugString(f)+")");
    CHECK.GE(numFractionBits, 0);
    const allow_zeros = false;  // should be false, but can set to true to get more insight into what's going on
    // largest to smallest (opposite from paper's convention).
    // We do *not* require nonoverlappingness, just so that we can use this function sumwhat illegally for simple sums of arbitrarily many things (although more than 2**(nF+2)+2 1's fails)
    {
      let previous = 0;
      for (let i = 0; i < e.length; ++i) {
        if (previous == 0) {
          previous = Math.abs(e[i]);
        } else {
          CHECK.LE(Math.abs(e[i]), previous);
        }
      }
      previous = 0;
      for (let i = 0; i < f.length; ++i) {
        if (previous == 0) {
          previous = Math.abs(f[i]);
        } else {
          CHECK.LE(Math.abs(f[i]), previous);
        }
      }
    }
    // merge e and f into a single sequence g, in order of nonincreasing magnitude (opposite of what's in the paper)
    const g = [];
    {
      let i = 0;
      let j = 0;
      while (i < e.length && j < f.length) {
        if (Math.abs(e[i]) >= Math.abs(f[j])) {
          g.push(e[i++]);
        } else {
          g.push(f[j++]);
        }
      }
      while (i < e.length) g.push(e[i++]);
      while (j < f.length) g.push(f[j++]);
      CHECK.EQ(i, e.length);
      CHECK.EQ(j, f.length);
    }
    if (verboseLevel >= 1) console.log("  g = "+toDebugString(g));
    const answer = [];
    {
      let Q = 0;
      let q = 0;
      for (let i = g.length-1; i >= 0; --i) {
        if (verboseLevel >= 1) console.log("      adding g["+i+"] = "+toDebugString(g[i]));
        let R_i, h_iminus2;
        if (false) {  // argh! this fails when fed (2**(nF+2)+3) 1's!    OH that violates this function's contract anyway! it's supposed to be just two addends, each of which is a nonintersecting series.  so, whatever.
          [R_i, h_iminus2] = fast_two_sum(numFractionBits, minExponent, g[i], q);
        } else {
          [R_i, h_iminus2] = two_sum(numFractionBits, minExponent, g[i], q);
        }
        if (i >= g.length-2) {
          CHECK.EQ(h_iminus2, 0);
        } else {
          if (allow_zeros || h_iminus2 != 0) answer.push(h_iminus2);
        }
        [Q,q] = two_sum(numFractionBits, minExponent, Q,R_i);
      }
      if (allow_zeros || q != 0) answer.push(q);
      if (allow_zeros || Q != 0) answer.push(Q);
    }
    answer.reverse();
    for (let i = 0; i < answer.length-1; ++i) {
      CHECK.GT(Math.abs(answer[i]), Math.abs(answer[i+1]));
      //CHECK.EQ(plus(numFractionBits, minExponent, answer[i], answer[i+1]), answer[i]);  // this is true only if it was true of inputs, which we aren't requiring
    }

    if (verboseLevel >= 1) console.log("out linear_expansion_sum(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+" f="+toDebugString(f)+"), returning "+STRINGIFY(answer));
    return answer;
  };  // linear_expansion_sum

  const my_normalize_expansion = (numFractionBits, minExponent, e) => {
    // No assumptions on order at all, I don't think... although probably if it starts in increasing order, it'll be O(n^2)
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("in my_normalize_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+")");
    const ridiculous_number_of_iterations = 2*e.length**2;
    const answer = [...e];
    let nIn = answer.length;
    let iIn = 0;
    let nOut = 0;
    let number_of_iterations = 0;
    while (iIn < nIn) {
      if (verboseLevel >= 1) console.log("  top of loop: nOut="+nOut+" iIn="+iIn+" nIn="+nIn+"  "+toDebugString(answer.slice(0,nOut))+toDebugString(answer.slice(nOut,iIn))+toDebugString(answer.slice(iIn,nIn)));
      // Invariant: answer[0..nOut-1] are normalized,
      // and the sum of answer[0..nOut-1] and answer[iIn..nIn] is the actual um.
      if (answer[iIn] === 0.) {
        iIn++;
      } else if (nOut === 0) {
        answer[nOut++] = answer[iIn++];
      } else {
        const a = answer[nOut-1];
        const b = answer[iIn];
        if (verboseLevel >= 1) console.log("    a="+toDebugString(a)+" b="+toDebugString(b));
        let x,y;
        [x,y] = two_sum(numFractionBits, minExponent, a, b);
        if (verboseLevel >= 1) console.log("    x="+toDebugString(x)+" y="+toDebugString(y));
        if (x == a && b == y) {
          if (verboseLevel >= 1) console.log("    no change; advancing");
          answer[nOut++] = answer[iIn++];
        } else if (x === 0 && y === 0) {
          if (verboseLevel >= 1) console.log("    both zero");
          --nOut;
          nIn++;
        } else if (y === 0) {
          if (verboseLevel >= 1) console.log("    only y is 0");
          CHECK.NE(x, a);
          --nOut;
          answer[iIn] = x;
        } else {  // both nonzero
          if (verboseLevel >= 1) console.log("    both nonzero");
          CHECK.NE(x, a);
          --nOut;
          answer[iIn] = y;
          --iIn;
          answer[iIn] = x;
        }
      }
      number_of_iterations++;
      CHECK.LT(number_of_iterations, ridiculous_number_of_iterations);

      // TODO: these bounds are empirical.  Need to prove it, or replace it with something provable.
      CHECK.LE(number_of_iterations, e.length==0 ? 0 : e.length==1 ? 1 : e.length==2 ? 4 : e.length==3 ? 10 : e.length==4 ? 13 : e.length==5 ? 15 : -6);

      // 3 needed 11: ???
      // 4 needed 13: http://localhost:8000/lerp.html?numFractionBits=5&minExponent=-15&a=-45/256&b=17/32 smartest
      // 5 needed 15: http://localhost:8000/lerp.html?numFractionBits=4&minExponent=-15&a=-31/512&b=3/8 smartest

      if (verboseLevel >= 1) console.log("  bottom of loop: nOut="+nOut+" iIn="+iIn+" nIn="+nIn+"  "+toDebugString(answer.slice(0,nOut))+toDebugString(answer.slice(nOut,iIn))+toDebugString(answer.slice(iIn,nIn)));
    }
    answer.length = nOut;
    if (verboseLevel >= 1) console.log("out my_normalize_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+"), returning "+toDebugString(answer));
    for (let i = 0; i < answer.length; ++i) CHECK.NE(answer[i], 0.);
    for (let i = 0; i < answer.length-1; ++i) CHECK.EQ(plus(numFractionBits, minExponent, answer[i], answer[i+1]), answer[i]);
    return answer;
  };  // my_normalize_expansion
  PRINT(my_normalize_expansion(numFractionBits, minExponent, [1,1]));

  // Deep equals for expansions.
  const expansions_are_same = (e, f) => {
    if (e.length != f.length) return false;
    for (let i = 0; i < e.length; ++i) if (e[i] != f[i]) return false;
    return true;
  };  // expansions_are_same

  // TODO: I think I'm deprecating this in favor of my_normalize_expansion? not sure
  const canonicalize_linear_expansion = (numFractionBits, minExponent, e) => {
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("in canonicalize_linear_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+")");
    let f = e;
    let nPasses = 0;
    while (true) {
      if (verboseLevel >= 1) console.log("  after "+nPasses+ " pass"+(nPasses==1?"":"es")+": "+toDebugString(f));
      if (verboseLevel >= 1) {
        for (let i = 0; i < f.length; ++i) {
          if (verboseLevel >= 1) console.log("      f["+i+"] = "+toBinaryString(f[i]));
        }
      }
      const g = linear_expansion_sum(numFractionBits, minExponent, f, []);
      if (expansions_are_same(f, g)) {
        if (verboseLevel >= 1) console.log("  stationary after "+nPasses+" pass"+(nPasses==1?"":"es")+"!");
        break;
      }
      f = g;
      nPasses++;
      if (nPasses > 2*e.length) {
        if (verboseLevel >= 1) console.log("  THAT'S RIDICULOUS, STOPPING");
        break;
      }
    }
    // Some sanity checking...
    for (let i = 0; i < f.length-1; ++i) {
      CHECK.GT(Math.abs(f[i]), Math.abs(f[i+1]));
      CHECK.EQ(plus(numFractionBits, minExponent, f[i], f[i+1]), f[i]);
    }
    CHECK.EQ(''+f, ''+my_normalize_expansion(numFractionBits, minExponent, e));
    if (verboseLevel >= 1) console.log("out canonicalize_linear_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+STRINGIFY(e)+"), returning "+toDebugString(f));
    return f;
  };  // canonicalize_linear_expansion

  // TODO: wait a minute, what the heck are we supposed to do if we get subnormal??  I'm confused.
  // Some things just aren't splittable, right??
  const split = (numFractionBits, minExponent, a) => {
    CHECK.NE(a, undefined);
    CHECK.GE(numFractionBits, 1);

    // From shewchuk's paper.
    // The short paper hardcodes the split point to be ceil(p/2); the long paper allows any split point s such that ceil[p/2] <= s <= p-1.
    // Note that the paper's p is my nF+1.
    // Note: both short and long papers paper require p>=3 (i.e. nF>=2), not sure why.  It seems to work with nF=1.

    //CHECK.GE(numFractionBits, 1);

    const p = numFractionBits + 1;  // the paper's notion of "number of bits"
    const s = Math.ceil(p/2)  // the paper's notion of split point
    // the two sizes, in the paper's notation, are now p-s and s-1.
    // So, in my notation, it's nF+1-s-1 = nF-s, and s-1-1 = s-2.
    const nF_hi = numFractionBits-s;
    //const nF_lo = s-2;
    const nF_lo = s-1;  // XXX FUDGE - evidently I haven't quite got a handle on the logic

    const multiplier = 2**s + 1;
    const c = times(numFractionBits, minExponent, multiplier, a);
    const a_big = minus(numFractionBits, minExponent, c, a);
    const a_hi = minus(numFractionBits, minExponent, c, a_big);
    const a_lo = minus(numFractionBits, minExponent, a, a_hi);

    CHECK.EQ(a_hi+a_lo, a);
    CHECK.EQ(plus(numFractionBits, minExponent, a_hi, a_lo), a);

    PRINTDEBUG(a);
    PRINT(s);
    PRINT(nF_hi);
    PRINT(nF_lo);
    PRINTDEBUG(a_hi);
    PRINTDEBUG(a_lo);
    // a_hi should have width (at most) nF-s
    CHECK(is_representable(nF_hi, minExponent, a_hi));
    // a_lo should have width (at most) s-2
    if (nF_lo >= 0) {
      CHECK(is_representable(nF_lo, minExponent, a_lo));
    } else {
      CHECK.EQ(s-2, 0);
      CHECK.EQ(a_hi, a);
      CHECK.EQ(a_lo, 0);
    }

    return [a_hi,a_lo];
  };  // split

  // Unfortunately not really usable, since I don't know what split() should do when it encounters subnormals.
  const two_product = (numFractionBits, minExponent, a, b) => {
    const verboseLevel = 2;
    if (verboseLevel >= 1) console.log("in two_product(numFractionBits="+numFractionBits+" minExponent="+minExponent+" a="+toDebugString(a)+" b="+toDebugString(b)+")");
    // From shewchuk's paper(s).
    // (Note, can be done much more easily using fma; see two_product_using_fma below)
    CHECK.NE(b, undefined);
    //CHECK.GE(numFractionBits+1, 4);  // that's what the paper says, not sure why.  in fact the long paper says >=6 !? but maybe that's for increased properties, that is, nonadjacentness.  TODO: check whether it fails for less.  ANSWER: nF=3 (i.e. paper's n=4) is fine as advertized.  nF=2 (paper's n=3) is fine too. nF=1 (paper's n=2) is fine too.  nF=0 (paper's p=1) is not fine, it fails at is_representable in split().  need to find out why.
    const x = times(numFractionBits, minExponent, a, b);
    if (verboseLevel >= 1) console.log("  x = "+toDebugString(x));
    let a_hi, a_lo, b_hi, b_lo;
    [a_hi, a_lo] = split(numFractionBits, minExponent, a);
    if (verboseLevel >= 1) console.log("  [a_hi, a_lo] = "+toDebugString([a_hi, a_lo]));
    [b_hi, b_lo] = split(numFractionBits, minExponent, b);
    if (verboseLevel >= 1) console.log("  [b_hi, b_lo] = "+toDebugString([b_hi, b_lo]));
    const err1 = minus(numFractionBits, minExponent, x, times(numFractionBits, minExponent, a_hi, b_hi));
    const err2 = minus(numFractionBits, minExponent, err1, times(numFractionBits, minExponent, a_lo, b_hi));
    const err3 = minus(numFractionBits, minExponent, err2, times(numFractionBits, minExponent, a_hi, b_lo));
    if (verboseLevel >= 1) console.log("  a_hi*b_hi = "+toDebugString(times(numFractionBits, minExponent, a_hi, b_hi)));
    if (verboseLevel >= 1) console.log("  err1 = "+toDebugString(err1));
    if (verboseLevel >= 1) console.log("  a_lo*b_hi = "+toDebugString(times(numFractionBits, minExponent, a_lo, b_hi)));
    if (verboseLevel >= 1) console.log("  err2 = "+toDebugString(err2));
    if (verboseLevel >= 1) console.log("  a_hi*b_lo = "+toDebugString(times(numFractionBits, minExponent, a_hi, b_lo)));
    if (verboseLevel >= 1) console.log("  err3 = "+toDebugString(err3));
    if (verboseLevel >= 1) console.log("  a_lo*b_lo = "+toDebugString(times(numFractionBits, minExponent, a_lo, b_lo)));
    const y = minus(numFractionBits, minExponent, times(numFractionBits, minExponent, a_lo, b_lo), err3);
    if (verboseLevel >= 1) console.log("  y = "+toDebugString(y));
    const answer = [x,y];

    // Lets draw the whole picture, like on page 20 of https://people.eecs.berkeley.edu/~jrs/papers/robustr.pdf .
    // Inputs are:
    //   nF=5
    //   a=59=111011
    //   b=59=111011
    // It should come out as:
    //         a =                                1 1 1 0 1 1
    //         b =                                1 1 1 0 1 1
    //                                -----------------------
    //         x =          a*b     = 1 1 0 1 1 0             * 2^6
    //                   a_hi*b_hi  = 1 1 0 0 0 1             * 2^6
    //                                -----------
    //      err1 =    x-(a_hi*b_hi) =       1 0 1 0 0 0       * 2^3
    //                   a_lo*b_hi  =         1 0 1 0 1 0     * 2^2
    //                                      -------------
    //      err2 = err1-(a_lo*b_hi) =         1 0 0 1 1 0     * 2^2
    //                   a_hi*b_lo  =         1 0 1 0 1 0     * 2^2
    //                                        -----------
    //      err3 = err2-(a_hi*b_lo) =             - 1 0 0 0 0
    //                   a_lo*b_lo  =                 1 0 0 1
    //                                            -----------
    //        -y = err3-(a_lo*b_lo) =             - 1 1 0 0 1
    if (verboseLevel >= 1) {
      const num_columns = (numFractionBits+1)*2+1;
      const width = 2*num_columns-1;
      if (verboseLevel >= 2) console.log("      num_columns = "+num_columns);

      const s = Math.ceil((numFractionBits+1)/2);
      const nFhi = (numFractionBits+1)-s-1;
      const nFlo = s-1-1;
      if (verboseLevel >= 2) console.log("      s="+s+" nFhi="+nFhi+" nFlo="+nFlo);

      // Where do we put the binary point, in a and b and answer?
      let aLogMultiplierToGetInt = a==0 ? 0 : numFractionBits-Math.floor(Math.log2(Math.abs(a)));
      let bLogMultiplierToGetInt = b==0 ? 0 : numFractionBits-Math.floor(Math.log2(Math.abs(b)));
      if (verboseLevel >= 2) console.log("      aLogMultiplierToGetInt = "+aLogMultiplierToGetInt);
      if (verboseLevel >= 2) console.log("      bLogMultiplierToGetInt = "+bLogMultiplierToGetInt);
      let abLogMultiplierToGetInt = aLogMultiplierToGetInt + bLogMultiplierToGetInt;
      if (verboseLevel >= 2) console.log("      abLogMultiplierToGetInt = "+abLogMultiplierToGetInt);

      if (aLogMultiplierToGetInt < 0 || bLogMultiplierToGetInt < 0) {
        console.log("  (can't do the cool display of this yet)");
      } else {
        const ahibhi = times(numFractionBits, minExponent, a_hi, b_hi);
        const alobhi = times(numFractionBits, minExponent, a_lo, b_hi);
        const ahiblo = times(numFractionBits, minExponent, a_hi, b_lo);
        const aloblo = times(numFractionBits, minExponent, a_lo, b_lo);
        // XXX TODO: hey! why is this allowed without a "let" or "const"??
        aString = toBinaryString(a*2**aLogMultiplierToGetInt).replace(/(.)/g, ' $1').trim();
        bString = toBinaryString(b*2**bLogMultiplierToGetInt).replace(/(.)/g, ' $1').trim();

        //CHECK.EQ((x*2**abLogMultiplierToGetInt) % 2**(numFractionBits+1), 0);
        //CHECK.EQ((ahibhi*2**abLogMultiplierToGetInt) % 2**(numFractionBits+1), 0);

        // TODO: blank out the right parts of these appropriately.
        // TODO: put in a decimal point.
        let abExactString = toBinaryString(a*b*2**abLogMultiplierToGetInt).split('').join(' ');
        let xString = toBinaryString(x*2**abLogMultiplierToGetInt).split('').join(' ');
        let ahiString = toBinaryString(a_hi*2**aLogMultiplierToGetInt).split('').join(' ');
        let aloString = toBinaryString(a_lo*2**aLogMultiplierToGetInt).split('').join(' ');
        let bhiString = toBinaryString(b_hi*2**bLogMultiplierToGetInt).split('').join(' ');
        let bloString = toBinaryString(b_lo*2**bLogMultiplierToGetInt).split('').join(' ');
        let ahibhiString = toBinaryString(ahibhi*2**abLogMultiplierToGetInt).split('').join(' ');
        let alobhiString = toBinaryString(alobhi*2**abLogMultiplierToGetInt).split('').join(' ');
        let ahibloString = toBinaryString(ahiblo*2**abLogMultiplierToGetInt).split('').join(' ');
        let alobloString = toBinaryString(aloblo*2**abLogMultiplierToGetInt).split('').join(' ');
        let err1String = toBinaryString(err1*2**abLogMultiplierToGetInt).split('').join(' ');
        let err2String = toBinaryString(err2*2**abLogMultiplierToGetInt).split('').join(' ');
        let err3String = toBinaryString(err3*2**abLogMultiplierToGetInt).split('').join(' ');
        let minusyString = toBinaryString(-y*2**abLogMultiplierToGetInt).split('').join(' ');

        const insertBinaryPoint = (s,logMultiplierToGetInt,numFractionBits,should_be_undefined) => {
          CHECK.NE(numFractionBits, undefined);
          CHECK.EQ(should_be_undefined, undefined);
          CHECK.GE(logMultiplierToGetInt, 0);
          if (s.endsWith('  0')) return s;  // CBB: not very principled, not sure it works in general

          const answer = s.split('');
          if (logMultiplierToGetInt != 0) {

            // Major hackery: turn spaces into zeros, and move minus sign, as necessary, to prevent ".  -1010" and such.
            const pos = s.length - 2*logMultiplierToGetInt;
            CHECK.EQ(answer[pos], ' ');
            answer[pos] = '.';
            let isNegative = false;  // until proven otherwise
            for (let i = pos+1; i < answer.length && (answer[i] == ' ' || answer[i] == '-'); i += 2) {
              if (answer[i] == '-') {
                isNegative = true;
              }
              answer[i] = '0';
            }
            if (isNegative) {
              answer[pos-1] = '-';
            }
          }

          // Now fudge some more... allow at most numFractionBits+1 bits starting with the first 1;
          // turn all the rest (which must be '0's) into spaces.
          const index_of_first_1 = answer.indexOf('1');
          //PRINT(answer);
          //PRINT(index_of_first_1);
          if (index_of_first_1 != -1) {
            for (let i = index_of_first_1; i < answer.length; i += 2) {
              if ((i - index_of_first_1)/2 >= numFractionBits+1) {
                CHECK.EQ(answer[i], '0');
                answer[i] = ' ';
              }
            }
          }

          return answer.join('');
        };  // insertBinaryPoint

        console.log("      ==================================================");
        console.log("      a_hi =                        "+insertBinaryPoint(ahiString.padStart(width), aLogMultiplierToGetInt, numFractionBits));
        console.log("      a_lo =                        "+insertBinaryPoint(aloString.padStart(width), aLogMultiplierToGetInt, numFractionBits));
        console.log("                                    "+''.padStart(Math.max(ahiString.length,aloString.length,aString.length), '-').padStart(width));
        console.log("         a =                        "+insertBinaryPoint(aString.padStart(width), aLogMultiplierToGetInt, numFractionBits));
        console.log("");
        console.log("      b_hi =                        "+insertBinaryPoint(bhiString.padStart(width), bLogMultiplierToGetInt, numFractionBits));
        console.log("      b_lo =                        "+insertBinaryPoint(bloString.padStart(width), bLogMultiplierToGetInt, numFractionBits));
        console.log("                                    "+''.padStart(Math.max(ahiString.length,aloString.length,aString.length), '-').padStart(width));
        console.log("         b =                        "+insertBinaryPoint(bString.padStart(width), bLogMultiplierToGetInt, numFractionBits));
        console.log("");
        console.log("                                    "+''.padStart(Math.max(aString.length,bString.length,xString.length), '-').padStart(width));
        console.log("                        a*b       = "+insertBinaryPoint(abExactString.padStart(width), abLogMultiplierToGetInt, 1e10));
        console.log("");
        console.log("         x =            a(*)b     = "+insertBinaryPoint(xString.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                     a_hi(*)b_hi  = "+insertBinaryPoint(ahibhiString.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                                    "+''.padStart(Math.max(xString.length,ahibhiString.length,err1String.length), '-').padStart(width));
        console.log("      err1 =    x(-)(a_hi(*)b_hi) = "+insertBinaryPoint(err1String.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                     a_lo(*)b_hi  = "+insertBinaryPoint(alobhiString.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                                    "+''.padStart(Math.max(err1String.length,alobhiString.length,err2String.length), '-').padStart(width));
        console.log("      err2 = err1(-)(a_lo(*)b_hi) = "+insertBinaryPoint(err2String.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                     a_hi(*)b_lo  = "+insertBinaryPoint(ahibloString.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                                    "+''.padStart(Math.max(err2String.length,ahibloString.length,err3String.length), '-').padStart(width));
        console.log("      err3 = err2(-)(a_hi(*)b_lo) = "+insertBinaryPoint(err3String.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                     a_lo(*)b_lo  = "+insertBinaryPoint(alobloString.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("                                    "+''.padStart(Math.max(err3String.length,alobloString.length,minusyString.length),'-').padStart(width));
        console.log("        -y = err3(-)(a_lo(*)b_lo) = "+insertBinaryPoint(minusyString.padStart(width), abLogMultiplierToGetInt, numFractionBits));
        console.log("      ==================================================");
      }
    }


    if (verboseLevel >= 1) console.log("out two_product(numFractionBits="+numFractionBits+" minExponent="+minExponent+" a="+toDebugString(a)+" b="+toDebugString(b)+"), returning "+toDebugString(answer));
    //CHECK(expansions_are_same(answer, two_product_using_fma(numFractionBits, minExponent, a, b)));  // TODO: enable this when bug fixed!
    CHECK.EQ(''+answer, ''+two_product_using_fma(numFractionBits, minExponent, a, b));  // TODO: enable this when bug fixed!
    return answer;
  };  // two_product
  const two_product_using_fma = (numFractionBits, minExponent, a, b) => {
    // Ah, cool!  So the value of fma here is that it it saves all that work of two_product above.
    let hi = times(numFractionBits, minExponent, a, b);
    let lo = fma(numFractionBits, minExponent, a, b, -hi);
    return [hi, lo];
  };  // two_product_using_fma
  const scale_expansion = (numFractionBits, minExponent, e, b) => {
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("in scale_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+" b="+toDebugString(b)+")");
    for (let i = 0; i < e.length-1; ++i) CHECK.GE(Math.abs(e[i]), Math.abs(e[i+1]));  // nonincreasing magnitudes
    if (e.length == 0) return [];
    const answer = []
    {
      let Q, h;
      //[Q,h] = two_product(numFractionBits, minExponent, e[e.length-1], b);  // couldn't get this to work :-(
      [Q,h] = two_product_using_fma(numFractionBits, minExponent, e[e.length-1], b);
      if (h != 0) answer.push(h);
      if (verboseLevel >= 1) console.log("  initial Q,h = "+toDebugString(Q)+","+toDebugString(h));
      for (let i = e.length-1-1; i >= 0; --i) {
        if (verboseLevel >= 1) console.log("      top of loop");
        let T,t;
        //[T,t] = two_product(numFractionBits, minExponent, e[i], b);
        [T,t] = two_product_using_fma(numFractionBits, minExponent, e[i], b);
        [Q,h] = two_sum(numFractionBits, minExponent, Q,t);
        if (h != 0) answer.push(h);
        [Q,h] = fast_two_sum(numFractionBits, minExponent, T,Q);
        if (h != 0) answer.push(h);
        if (verboseLevel >= 1) console.log("      bottom of loop");
      }
      if (Q != 0) answer.push(Q)
    }
    answer.reverse();
    if (verboseLevel >= 1) console.log("out scale_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+" b="+toDebugString(b)+"), returning "+toDebugString(answer));
    return answer;
  };  // scale_expansion
  const approximate = (numFractionBits, minExponent, e) => {
    // Note, this can get it wrong in the case where it looks like two ties but wasn't a tie
    for (let i = 0; i < e.length-1; ++i) CHECK.GE(e[i], e[i+1]);  // nonincreasing magnitudes
    let answer = 0;
    for (let i = e.length-1; i >= 0; --i) answer += e[i];
    return answer;
  };  // approximate
  const round_canonical_expansion_to_nearest = (numFractionBits, minExponent, e) => {
    if (e.length == 0) return 0;
    if (e.length <= 2) return e[0];
    if ((e[1]<0) !== (e[2]<0)) return e[0];  // the two-ties-in-same-direction-give-wrong-answer thing can't happen
    // It's almost surely e[0].  The only case when it isn't is if:
    //  - e[1] and e[2] have the same sign, and
    //  - e[1] has only one bit, and it's the next bit after e[0]
    // Example: nF=3: 1/2 + 1/32 + 1/512 = .1 + .00001 + .000000001 = .100010001
    // In this case, the correct answer is .1001, not .1000.

    // we don't bother doing the 2* operation in nF precision since that's definitely representable exactly.


    const answerMaybe = e[1]>0 ? succ(numFractionBits, minExponent, e[0]) : pred(numFractionBits, minExponent, e[0]);
    if (minus(numFractionBits, minExponent, answerMaybe, e[0]) !== 2*e[1])  return e[0];
    return answerMaybe;

    // SUBTLETY:  barely-overlappingness isn't what we naively think it is, at a power of 2!
    // Example: nF=3, the expressible numbers near 1 are:
    //           1.011
    //           1.010
    //           1.001
    //           1.000
    //           0.1111
    //           0.1110
    //
  };  // round_expansion_to_nearest

  const dot_exact_expansion = (numFractionBits, minExponent, as,bs) => {
    CHECK.EQ(as.length, bs.length);
    const addends = [];
    for (let i = 0; i < as.length; ++i) {
      let hi,lo;
      [hi,lo] = two_product_using_fma(numFractionBits, minExponent, as[i], bs[i]);
      addends.push(hi);
      addends.push(lo);
    }

    addends.sort((a,b)=>(Math.abs(a)<Math.abs(b)?1:Math.abs(a)>Math.abs(b)?-1:0));  // descending magnitudes

    const answer = canonicalize_linear_expansion(numFractionBits, minExponent,
                                                 linear_expansion_sum(numFractionBits, minExponent, addends, []));
    return answer;
  };  // dot_correct_expansion
  const dot_correct = (numFractionBits, minExponent, as,bs) => {
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("in dot_correct(numFractionBits="+numFractionBits+" minExponent="+minExponent+" as="+toDebugString(as)+" bs="+toDebugString(bs)+")");
    const answer_canonical_expansion = dot_exact_expansion(numFractionBits, minExponent, as,bs);
    if (verboseLevel >= 1) console.log("  answer_canonical_expansion = "+toDebugString(answer_canonical_expansion));
    const answer = round_canonical_expansion_to_nearest(numFractionBits, minExponent, answer_canonical_expansion);
    if (verboseLevel >= 1) console.log("out dot_correct(numFractionBits="+numFractionBits+" minExponent="+minExponent+" as="+toDebugString(as)+" bs="+toDebugString(bs)+"), returning "+toDebugString(answer));
    return answer;
  };  // dot_correct

  if (true)
  {
    let xs = [];
    if (true)
    {
      let x = Math.floor(2**(numFractionBits+2)/3);
      for (let i = 0; i < 2; ++i) {
        xs.push(round_to_nearest_representable(numFractionBits, -100, x));
        x /= 2**(numFractionBits+1);
      }
    }
    if (false) {
      // Demonstrate that (sort-of-)canonicalization happens,
      // in that full values are pushed to the front.
      // Still has negatives, I think, which is weird?  Hmm.  But maybe it makes sense?
      xs.push(2**(numFractionBits+1));  // 4 -> 32 = 100000
      xs.push(2**numFractionBits + 1);  // 4 -> 17 = 010001
    }
    if (false) {
      // Let's see if I get canonicalization from 1's.
      // What I see is: for nF=3: the lower-order part goes:
      //    0,0,0 when it can, or
      //    -1,0,1,0, -1,0,1,0,  when it can, or
      //    0,1,2,-1,0,1,-2,-1, 0,1,2,-1,-2, or
      //    0,1,2,3,4,-3,-2,-1,0,1,2,3,-4, or
      //    0,1,2,3,4,5,6,7,8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,-8, or...
      // (interesting, there *is* still some redundancy, I wonder if I can get rid of that?)
      // (that is, the "period" (mega-base) can be 2**(n+1)+1 instead of 2**(n+1) ?)
      const n = 19;
      for (let i = 0; i < n; ++i) {
        xs.push(1);
      }
    }
    if (false) {
      // Okay let's start with something ambiguous, does it canonicalize?
      // E.g. for nF=3, 17 can be expressed as 16+1 (seems to be canonical) or 18-1.
      //xs.push(2**(numFractionBits+1));
      //xs.push(1);
      xs.push(2**(numFractionBits+1)+2);
      xs.push(-1);
      // YES, it seems to canonicalize 18-1 to 16+1!  Hooray!
    }

    PRINT(canonicalize_linear_expansion(numFractionBits, -100, xs));

    if (false) {
      console.log("  returning early!");
      return;
    }
  }


  // CBB: the numFractionBits and minExponent here are unrelated to anything else in the program
  const exact_lerp_cross_your_fingers = (a, b, t, should_be_undefined) => {
    CHECK.NE(t, undefined);
    CHECK.EQ(should_be_undefined, undefined);
    const exact0 = (1-t)*a + t*b;
    const exact1 = a-t*a+t*b;
    const exact2 = t*b-t*a+a;
    const exact3 = a+t*b-t*a;

    const T = 1-(1-t);
    CHECK.EQ(1-T, 1-t);
    const exact4 = (1-t)*a + T*b;
    const exact5 = a-T*a+T*b;
    const exact6 = T*b-T*a+a;
    const exact7 = a+T*b-T*a;

    CHECK.EQ(exact0, exact1);
    CHECK.EQ(exact0, exact2);
    CHECK.EQ(exact0, exact3);
    CHECK.EQ(exact0, exact4);
    CHECK.EQ(exact0, exact4);
    CHECK.EQ(exact0, exact5);
    CHECK.EQ(exact0, exact6);
    CHECK.EQ(exact0, exact7);
    // Note: that's still not conclusive, and in fact it may not be exactly representable at all.
    return exact0;
  };  // exact_lerp_cross_your_fingers

  const sum = array => array.reduce((a,b)=>a+b, 0);

  // TODO: this doesn't work-- I think my "linear expansion sum" thing has bugs.  maybe just kill it?  that would be a shame though.
  const magic_correct_lerp = (numFractionBits, minExponent, a, b, t) => {
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("    in magic_correct_lerp(numFractionBits="+STRINGIFY(numFractionBits)+"  minExponent="+STRINGIFY(minExponent)+" a="+toDebugString(a)+" b="+toDebugString(b)+" t="+toDebugString(t)+")");
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    CHECK(is_representable(numFractionBits, minExponent, t));

    const bminusa = linear_expansion_sum(numFractionBits, minExponent, [b], [-a]);
    if (verboseLevel >= 1) console.log("      bminusa = "+toDebugString(bminusa));

    // TODO: not right when a=0 b=27/32 t=19/32; it produces 1/2+17/1024=529/1024, should be 513/1024
    // TODO: not right when a=19/256, b=1, t=27/512, it produces 1/8, should be 16127/131072
    const bminusa_times_t = scale_expansion(numFractionBits, minExponent, bminusa, t);

    if (verboseLevel >= 1) console.log("      bminusa_times_t = "+toDebugString(bminusa_times_t));
    const answer_expansion_not_canonical = linear_expansion_sum(numFractionBits, minExponent, [a], bminusa_times_t);
    if (verboseLevel >= 1) console.log("      answer_expansion_not_canonical = "+toDebugString(answer_expansion_not_canonical));
    if (verboseLevel >= 1) console.log("      sum(answer_expansion_not_canonical) = "+toDebugString(answer_expansion_not_canonical.reduce((a,b)=>a+b,0)));
    const answer_expansion = canonicalize_linear_expansion(numFractionBits, minExponent, answer_expansion_not_canonical);
    if (verboseLevel >= 1) console.log("      answer_expansion = "+toDebugString(answer_expansion));
    if (verboseLevel >= 1) console.log("      sum(answer_expansion) = "+toDebugString(sum(answer_expansion)));
    const answer = round_canonical_expansion_to_nearest(numFractionBits, minExponent, answer_expansion);
    if (verboseLevel >= 1) console.log("    out magic_correct_lerp(numFractionBits="+STRINGIFY(numFractionBits)+"  minExponent="+STRINGIFY(minExponent)+" a="+toDebugString(a)+" b="+toDebugString(b)+" t="+toDebugString(t)+"), returning "+toDebugString(answer));
    return answer;
  };

  if (false) {
    // Okay, we know two-product screws up with nF=4 a=19 b=27.
    // But it's okay with the example from the paper: nF=5 a=b=59=111011  (I think that's right).
    // But, it also calls that "6 bit arithmetic" which is weird.
    // And, it says it's guaranteed to be right only when p>=6??  Argh, it's getting all muddy.
    // Let's see if I can come up with examples of screwing up.

    const nFmin = 1;
    const nFmax = 5;
    for (let nF = nFmin; nF <= nFmax; ++nF) {
      for (let b = 2**nF; b < 2**(nF+1); ++b)
      {
        for (let absa = 2**nF; absa <= b; ++absa) {
          for (let a = -absa; a <= absa; a += 2*absa) {

            console.log("  nF="+nF+" a="+toDebugString(a)+" b="+toDebugString(b));

            if (nF == 2 && (Math.abs(a) == 6) && b == 6) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }

            // What the hell?  These are the *only* examples that mess up for nF=4...
            // And there are *not* examples that mess up for nF=5 nor nF=7!  Fooey!
            if (nF == 4 && (Math.abs(a) == 19 || Math.abs(a)==20 || Math.abs(a)==21 || Math.abs(a)==27) && b == 27) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 4 && (Math.abs(a) == 19 || Math.abs(a)==20 || Math.abs(a)==21 || Math.abs(a)==27 || Math.abs(a)==28) && b == 28) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 4 && (Math.abs(a) == 19 || Math.abs(a)==20 || Math.abs(a)==21 || Math.abs(a)==27 || Math.abs(a)==28 || Math.abs(a)==29) && b == 29) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }

            // Some do screw up for nF=6 though... so this is some solid evidence.
            // Oh argh, no it's not!  Because the paper uses nF=5 :-(
            if (nF == 6 && (Math.abs(a) == 85 || Math.abs(a) == 86 || Math.abs(a)==87 || Math.abs(a)==88 || Math.abs(a)==89 || Math.abs(a)==90 || Math.abs(a)==91 || Math.abs(a)==101) && b == 101) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 6 && (a == 85 || a == 86 || a==87 || a==88 || a==89 || a==90 || a==91 || a==101 || a==102) && b == 102) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 6 && (a == 85 || a == 86 || a==87 || a==88 || a==89 || a==90 || a==91 || a==101 || a==102 || a==103) && b == 103) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 6 && (a == 85 || a == 86 || a==87 || a==88 || a==89 || a==90 || a==91 || a==101 || a==102 || a==103 || a==104) && b == 104) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 6 && (a == 85 || a == 86 || a==87 || a==88 || a==89 || a==90 || a==91 || a==101 || a==102 || a==103 || a==104 || a==105) && b == 105) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 6 && (a == 85 || a == 86 || a==87 || a==88 || a==89 || a==90 || a==91 || a==101 || a==102 || a==103 || a==104 || a==105 || a==106) && b == 106) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 6 && (a == 85 || a == 86 || a==87 || a==88 || a==89 || a==90 || a==91 || a==101 || a==102 || a==103 || a==104 || a==105 || a==106 || a==107) && b == 107) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 6 && (a == 69 || a==70 || a==71 || a==72 || a==73 || a==74 || a==75 || a==85 || a==86 || a==87 || a==88 || a==89 || a==90 || a==91 || a==101 || a==102 || a==103 || a==104 || a==105 || a==106 || a==107 || a==117) && b == 117) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }

            if (nF == 8 && (a==361) && b==361) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 8 && (a==361 || a==362) && b==362) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 8 && (a==361 || a==362 || a==363) && b==363) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 8 && (a==361 || a==362 || a==363 || a==364) && b==364) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }
            if (nF == 8 && (a==361 /*|| a==362 || a==363 || a==364*/) && b==365) {
              console.log("SKIPPING BECAUSE I KNOW IT'S BAD");
              continue;
            }

            PRINTDEBUG(two_product(nF, -100, a, b));
          }
        }
      }
    }
  }

  if (true) {
    console.log("=================");
    PRINTDEBUG((27/32) * (19/32));

    // Let's work through the example from the long paper, page 20:
    // It says:
    //    a = 111011
    //    b = 111011
    // But, wtf, those numbers aren't 6 bits, they are 5 bits??  I'm confused.
    // Ok I think he's informally saying 6 when he means 5.
    // So in this case nF=5, so s=3, so split into nF-3=2 and s-1=2, i.e. informally 3 and 3.
    // So, a_hi=b_hi=111000, a_lo=b_lo=11.
    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat("111011"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat("111011"), parseBinaryFloat("111011")));

    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat("11101.1"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat("11101.1"), parseBinaryFloat("111011")));

    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat("1.11011"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat("1.11011"), parseBinaryFloat("111011")));

    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat(".111011"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat(".111011"), parseBinaryFloat("111011")));

    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat(".0111011"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat(".0111011"), parseBinaryFloat("111011")));

    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat("0"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat("0"), parseBinaryFloat("111011")));

    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat("11"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat("11"), parseBinaryFloat("111011")));

    PRINTDEBUG(two_product_using_fma(5, -100, parseBinaryFloat("11.1111"), parseBinaryFloat("111011")));
    PRINTDEBUG(two_product(5, -100, parseBinaryFloat("11.1111"), parseBinaryFloat("111011")));

    if (true) {
      PRINTDEBUG(two_product_using_fma(6, -100, 104, 104));
      PRINTDEBUG(two_product(6, -100, 104, 104));
    }

    if (true) {
      // Trying to come up with a failure using numF=5 (like in the paper)?
      // 41=101001 50=110010 41*50=2050=100000000010
      PRINTDEBUG(two_product_using_fma(5, -100, 41, 50));
      PRINTDEBUG(two_product(5, -100, 41, 50));
    }

    if (true) {
      // This one is right.
      PRINTDEBUG(two_product_using_fma(4, -100, 19, 27));
      PRINTDEBUG(two_product_using_fma(4, -100, 27, 19));
      // TODO: not right: products 1/2+17/1024=529/1024, should be 513/1024
      PRINTDEBUG(two_product(4, -100, 27, 19));
      PRINTDEBUG(two_product(4, -100, 19, 27));
    }

    if (true) {
      // This one is right.
      PRINTDEBUG(two_product_using_fma(4, -100, 19/32, 27/32));
      PRINTDEBUG(two_product_using_fma(4, -100, 27/32, 19/32));
      // TODO: not right: products 1/2+17/1024=529/1024, should be 513/1024
      PRINTDEBUG(two_product(4, -100, 27/32, 19/32));
      PRINTDEBUG(two_product(4, -100, 19/32, 27/32));
    }


    PRINTDEBUG(exact_lerp_cross_your_fingers(0, 27/32, 19/32));
    PRINTDEBUG(round_to_nearest_representable(numFractionBits, -100, (27/32) * (19/32)));
    PRINTDEBUG(magic_correct_lerp(4, -20, 0, 27/32, 19/32));
    //PRINTDEBUG(scale_expansion(numFractionBits, -100, [27/32], 19/32));  // XXX not representable, get rid
    //PRINTDEBUG(sum(scale_expansion(numFractionBits, -100, [27/32], 19/32)));  // XXX not representable, get rid

    console.log("=================");
    /*
    http://localhost:8000/lerp.html?numFractionBits=4&minExponent=-20&a=0&b=27/32
    =================
    (27/32) * (19/32) = (0.5009765625=0.1000000001=513/1024)
    exact_lerp_cross_your_fingers(0, 27/32, 19/32) = (0.5009765625=0.1000000001=513/1024)
    round_to_nearest_representable(numFractionBits, minExponent, (27/32) * (19/32)) = (0.5=0.1=1/2)
    magic_correct_lerp(4, -20, 0, 27/32, 19/32) = (0.53125=0.10001=17/32)
    answer should be .5 ! why isn't it??
    =================
    */
  }

  // End float utilities
  //======================================

  const relerp = (x, x0,x1, y0,y1) => {
    const answer = (x-x0)/(x1-x0)*(y1-y0)+y0;
    return answer;
  }

  // Functions that rely on the current values of numFractionBits and minEponent
  const Round = x => round_to_nearest_representable(numFractionBits, minExponent, x);
  const Pred = x => pred(numFractionBits, minExponent, x);
  const Succ = x => succ(numFractionBits, minExponent, x);
  const Plus = (a,b) => plus(numFractionBits, minExponent, a, b);
  const Times = (a,b) => times(numFractionBits, minExponent, a, b);
  const DividedBy = (a,b) => dividedby(numFractionBits, minExponent, a, b);
  const Minus = (a,b) => minus(numFractionBits, minExponent, a, b);
  const Fma = (a,b,c) => fma(numFractionBits, minExponent, a, b, c);
  const TwoSum = (a,b) => {
    if (Math.abs(a) < Math.abs(b)) {
      [a,b] = [b,a];
    }
    const x = Plus(a,b);
    const y = Plus(Minus(a,x), b);
    CHECK.EQ(a+b, x+y);  // This can fail, I think, but let's keep it in place til it does
    return [x,y];
  };
  const TwoProduct = (a,b) => {
    const x = Times(a,b);
    const y = Fma(a,b,-x);
    return [x,y];
  };
  const DotKahanish = (xs,ys,tweak) => {
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("        in DotKahanish(xs="+STRINGIFY(xs)+" ys="+STRINGIFY(ys)+" tweak="+STRINGIFY(tweak)+")");
    CHECK.NE(tweak, undefined);
    CHECK(tweak === true || tweak === false);
    let lo = 0.;
    let hi = 0.;
    CHECK.EQ(xs.length, ys.length);
    for (let i = 0; i < xs.length; ++i) {
      if (verboseLevel >= 1) console.log("              top of loop: hi="+toFractionString(hi)+" lo="+toFractionString(lo));
      const temp = Fma(xs[i],ys[i], lo);
      if (verboseLevel >= 1) console.log("                temp = Fma("+xs[i]+"*"+ys[i]+" + "+STRINGIFY(lo)+") = "+STRINGIFY(temp));
      if (verboseLevel >= 1) console.log("                temp = Fma("+toFractionString(xs[i])+"*"+toFractionString(ys[i])+" + "+toFractionString(lo)+") = "+toFractionString(temp));
      lo = Minus(temp, Minus(Plus(hi,temp),hi));
      hi = Plus(hi, temp);
      if (verboseLevel >= 1) console.log("              bottom of loop: hi="+toFractionString(hi)+" lo="+toFractionString(lo));
    }
    //CHECK.EQ(Plus(hi,lo),hi);  // doesn't hold, but I'd like to understand why. wikipedia just returns hi. !?
    // XXX wait what?  why does wikipedia not return hi+lo?  (or, rather, sum-c) ?  Ask on stackoverflow or numeric analysis stackexchange about this.
    // There seem to be examples where it's better, and other examples where it's worse.  In particular:
    //          [1,-t,t]*[a,a,b] has one case where it's worse (for a=11/256 b=15/16 nF=3 mE=-6)  (however it went away when I increased mE to -8) (but when I increased nF to 4, got an example where tweaking makes it better! and others where its worse)  (hmm this seems to persist even when I keep increasing nF, so maybe this is an example to use in a post of a question)
    //          [t,-t,1]*[b,a,a] has cases where it's worse and cases where it's better!  both where the operands aren't significantly larger than the answer.  (didn't go away by increasing mE.)
    //
    // Keep going for simpler examples (making me think I just messed up the algorithm somewhere):
    //          [1,-t,t]*[a,a,b] differs, for small t, even when b is 1 (a=5/512 or 3/64 or 1/8). (nF=3 mE=-6)
    //          [t,-t,1]*[b,a,a] differs, for some t<.5, even when b is 0 (a=15/16 or 13/16 or 11/16 or 9/16) (nF=3 mE=-6).  I.e. inconsistent on -t*a + a.  That can't be right!!
    // Oh hmm, I think I need an example where it doesn't go subnormal... i.e. try to lower minExponent to be very negative.
    // Well, yeah, this still happens then.  Hmm.
    // Isn't it supposed to be that lo is the error in hi?  I.e. if lo!=0, then hi+lo should not be representable!
    //
    const answer = tweak ? Plus(hi,lo) : hi;
    if (verboseLevel >= 1) console.log("        out DotKahanish(xs="+STRINGIFY(xs)+" ys="+STRINGIFY(ys)+" tweak="+STRINGIFY(tweak)+"), returning "+STRINGIFY(answer)+"="+toFractionString(answer));
    return answer;
  };  // DotKahanish
  let skeptical_double_check_hack_xxx = false;
  let skeptical_verbose_level_override = undefined;
  const DotButImSkeptical = (xs,ys) => {
    let verboseLevel = 0;
    if (skeptical_verbose_level_override !== undefined) verboseLevel = skeptical_verbose_level_override;
    if (verboseLevel >= 1) console.log("        in DotButImSkeptical(xs="+toDebugString(xs)+" ys="+toDebugString(ys)+")");
    let Hi = 0.;
    let Lo = 0.;
    let Exact = 0.;  // just for debugging
    CHECK.EQ(xs.length, ys.length);
    for (let i = 0; i < xs.length; ++i) {
      if (verboseLevel >= 1) console.log("          i = "+i+": "+toDebugString(xs[i])+"*"+toDebugString(ys[i]));
      if (verboseLevel >= 1) console.log("            Hi="+toDebugString(Hi)+" Lo="+toDebugString(Lo)+" Hi+Lo="+toDebugString(Hi+Lo)+"->"+Round(Hi+Lo)+" Exact="+toDebugString(Exact)+"->"+toDebugString(Round(Exact))+"");
      Exact += xs[i]*ys[i];
      const [hi,lo] = TwoProduct(xs[i],ys[i]);
      if (skeptical_double_check_hack_xxx) {
        CHECK.EQ(hi+lo, xs[i]*ys[i]);
      }
      let lo1;
      [Hi,lo1] = TwoSum(Hi,hi);
      Lo = Plus(Lo, Plus(lo, lo1));
      if (verboseLevel >= 1) console.log("              lo="+toDebugString(lo)+" lo1="+toDebugString(lo1));

      if (verboseLevel >= 1) console.log("            Hi="+toDebugString(Hi)+" Lo="+toDebugString(Lo)+" Hi+Lo="+toDebugString(Hi+Lo)+"->"+Round(Hi+Lo)+" Exact="+toDebugString(Exact)+"->"+toDebugString(Round(Exact))+"");
      if (true) {  // Might this help?  This is the part I was worried about, but it actually doesn't seem to be the part where I'm losing accuracy the worst
        let Hi1,Lo1;
        [Hi1,Lo1] = TwoSum(Hi,Lo);
        //CHECK.EQ(Hi1,Hi);
        //CHECK.EQ(Lo1,Lo);
        [Hi,Lo] = [Hi1,Lo1];
      }
      if (verboseLevel >= 1) console.log("            Hi="+toDebugString(Hi)+" Lo="+toDebugString(Lo)+" Hi+Lo="+toDebugString(Hi+Lo)+"->"+Round(Hi+Lo)+" Exact="+toDebugString(Exact)+"->"+toDebugString(Round(Exact))+"");
    }
    const answer = Plus(Hi, Lo);
    if (verboseLevel >= 1) console.log("        out DotButImSkeptical(xs="+toDebugString(xs)+" ys="+toDebugString(ys)+"), returning "+toDebugString(answer));
    return answer;
  };  // DotButImSkeptical
  const DotCorrect = (xs,ys) => {
    return dot_correct(numFractionBits, minExponent, xs, ys);
  };

  if (false) {
    // DEBUGGING "smartest"... this really should not happen, it's supposed to be exact!
    // http://localhost:8000/lerp.html?numFractionBits=3&minExponent=-10&a=0&b=13/16  with any of the "smartest" algorithms checked, t=11/32, descending
    // Exact answer is 273/512
    // Hmm, I think this might be the pathological case, I'm probably not protecting against it properly.
    //     exact answer is: 0.100010001
    //     which is a little bit higher than the halfway point 0.10001 between representable 0.1000 and 0.1001.
    //     so, should round to: 0.1001
    //         but rounds to:   0.1000
    const a = 13/16;
    const b = 0;
    const t = 11/32;
    //PRINT(DotCorrect([1,-t,t],[a,a,b]));  // not safe if numFractionBits is 2, so don't do it
    PRINT(magic_correct_lerp(3, -100, a,b,t));
    //return;
  }

  if (false)
  {
    // DEBUGGING... this should not happen!!!  ok I've convinced myself that it does, I guess
    // http://localhost:8000/lerp.html?numFractionBits=3&minExponent=-6&a=15/16&b=0
    // a = 15./16.;
    // b = 0;
    // nF=3
    // mE=-6
    const t = 7/16.;
    CHECK(is_representable(numFractionBits,minExponent,t));  // CBB: not reliable, if numFractionBits is set to small
    PRINT(DotKahanish([t,-t,1],[b,a,a],false));
    PRINT(DotKahanish([t,-t,1],[b,a,a],true));
    PRINT(DotKahanish([-t,1],[a,a],false));  // .5
    PRINT(DotKahanish([-t,1],[a,a],true));  // .5625
    // Oh!  And the answer is... this is *not* a case of plain old Kahan summation!
    // The difference is, t*a is not expressible, so it got approximated... and lo did indeed get the error of that,
    // but now we're down an execution path that Kahan didn't anticipate!  Hmm.
    // Should really see what Kahan says about 2x2 determinant.
    // That algorithm, for ad-bc, is:
    //    w = b*c
    //    e = fma(-b,c, w)
    //    f = fma(a,d, -w)
    //    x = f + e
    // Let's translate that into easier-to-understand lo,hi terms.
    //    bc_hi = w = b*c
    //    bc_lo = -e = fma(b,c, w) = fma(b,c, -bc_hi)
    //    answer_hi = f = fma(a,d, -w) = fma(a,d, -bc_hi)   // although answer_hi might be a misnomer
    //    answer = f + e = answer_hi - bc_lo
    // And let's translate it into easier-to-understand ad+bc terms instead (dot product).
    //    bc_hi = b*c
    //    bc_lo = fma(b,c, -bc_hi)
    //    answer_hi = fma(a,d, bc_hi)   // although answer_hi might be a misnomer
    //    answer = answer_hi + bc_lo = fma(a,d, bc_hi) + fma(b,c, -bc_hi)
    // Q: is that exact??? (i.e. the actually correctly rounded answer?)
    // PA: well, think about how it could go wrong...
    //     maybe if the LHS is a tie, and the RHS would move the original LHS into a tie that *should* be resolved the other way?
    //     or, maybe even the RHS should be a tiebreaker but is just too small to manage it?  I think that's more likely.

    // And morph it more towards an algorithm for dot products...
    //    hi = b*c
    //    lo = fma(b,c, -hi)
    //    next_hi = fma(a,d, hi)
    //    next_lo = lo (?)  that's not right
    // Q: I know how to get the lo part of x*y: that's fma(x,y,-x*y).
    //    But how do I get the lo part of fma(x,y,z)?  I think maybe that's needed for general dot product?
    // A: well, that multiple-papers Dot2 algorithm does the loop as follows (but it seems non-ideal in terms of feedback):
    //      [hi,lo0] = TwoProduct(x,y)
    //      [Hi,lo1] = TwoSum(Hi,hi)
    //      Lo += (lo0 + lo1)   (with rounding at each step)
    //    Where:
    //      TwoProduct(x,y) = (x*y, fma(x,y,-x*y))
    //      TwoSum(a,b) = b(-)(b(+)a(-)a)   ASSUMING |a|>=|b|
    //    hmm.  That's not using as many fma's as Kahan's, is it?  Weird.
    //    In particular, for 2x2 det: kahan's uses 2 fma's, whereas Dot2 uses only one.  Hmm.
    //
    // Q: surely there are other references for how to do a good dot product using fma,
    //    since I now think readthedocs's Dot2 is bogus? (which is based on ogita, which claims
    //    twice precision, but I'm not sure I believe it)
    // PA: argh, most references on the web refer to ogita's or readthedocs which are the same thing and I think not right
    //    There is something: "Choosing a Twice More Accurate Dot Product Implementation" by graillat et al,
    //    I have the abstract which seems to imply they have 6 algorithms and maybe know what they are talking about?
    //
    //
  }


  let Lerp;  // determined by the radio buttons


  // NOTE: the grid lines don't really look good when width is >1, due to corners.  Would need to place the ends more carefully.
  const gridLineWidth = 1;

  // works well for gridLineWidth=2...
  //const width = 384+gridLineWidth;
  //const height = 768+gridLineWidth;

  const width = 512+gridLineWidth;
  const height = 1024+gridLineWidth;

  //const width = 256+gridLineWidth;
  //const height = 512+gridLineWidth;

  // input and output coords.
  const ox0 = gridLineWidth*.5;
  const ox1 = width-gridLineWidth*.5;
  const oy0 = height-gridLineWidth*.5;
  const oy1 = gridLineWidth*.5;

  const ix0 = 0.;
  const ix1 = 1.;
  // TODO: Extrapolation... maybe experiment some time
  //const ix0 = -1.;
  //const ix1 = 2.;
  const iy0 = -1.;
  const iy1 = 1.;

  // https://stackoverflow.com/questions/10643426/how-to-add-a-tooltip-to-an-svg-graphic#answer-50543963
  const showTooltip = (evt,text) => {
    let tooltip = window.tooltip;
    tooltip.innerHTML = text;
    tooltip.style.display = "block";
    tooltip.style.left = evt.pageX + 10 + 'px';
    tooltip.style.top = evt.pageY + 10 + 'px';
  };
  const hideTooltip = () => {
    window.tooltip.style.display = "none";
  };

  const populateTheSVG = (svg, Lerp, aIntent, bIntent) => {
    CHECK.NE(bIntent, undefined);

    // TODO: rename
    const a = round_to_nearest_representable(numFractionBits, minExponent, aIntent);
    const b = round_to_nearest_representable(numFractionBits, minExponent, bIntent);

    window.theTitlePart2.innerHTML = "  b="+toFractionString(b)+"<small><small> ="+toBinaryString(b)+"="+b+"</small></small>";
    window.theTitlePart3.innerHTML = "  a="+toFractionString(a)+"<small><small> ="+toBinaryString(a)+"="+a+"</small></small>"

    const svgBorderWidthPixels = 5;

    {
      // Clunky way of getting where svg is
      // with respect to parent (body) which is also the parent
      // of the 'a' and 'b' labels.
      // (I actually thought theSVG.offsetTop should be the way to do it,
      // but that doesn't exist for svg elements)
      const bodyrect = document.body.getBoundingClientRect();
      const svgrect = theSVG.getBoundingClientRect();
      //console.log("bodyrect = ",bodyrect);
      //console.log("svgrect = ",svgrect);
      const position_in_parent = svgrect.top - bodyrect.top;
      //console.log("position_in_parent = ",position_in_parent);
      // Note that b is shifted a little up
      // and a is shifted a little down, so that
      // when they coincide they will not be drawn in exactly
      // the same place.
      window.b.style.top = (relerp(b,-1,1,oy0,oy1)+position_in_parent+svgBorderWidthPixels+10-4)+"px";
      window.a.style.top = (relerp(a,-1,1,oy0,oy1)+position_in_parent+svgBorderWidthPixels+10+4)+"px";
    }

    const svgns = "http://www.w3.org/2000/svg";

    svg.setAttribute("width", ""+width+"px");
    svg.setAttribute("height", ""+height+"px");
    svg.style.position = 'absolute';
    svg.style.left = '0px';
    //svg.style.pointerEvents = 'none';  // to make it "click-through-able", and so tooltips of underlying are functional
    svg.style.border = svgBorderWidthPixels+"px solid black";
    svg.innerHTML = '';  // clear old contents if any
    svg.innerHTML = (
        '<defs>'
      + '</defs>'
    );

    // Convert segments to "d" attribute of a path element of an svg.
    // E.g. [[[0,1],[2,3]],[[4,5],[6,7]],[[6,7],[8,9]]] -> "M0,1 L2,3 M4,5 L6,7 L8,9 Z"
    const segs2d = segs => {
      let answer = "";
      for (let i = 0; i < segs.length; ++i) {
        const seg = segs[i];
        if (i == 0 || seg[0] != segs[i-1][0] || seg[1] != segs[i-1][1]) {
          answer += "M"+seg[0][0]+","+seg[0][1]+" ";
        }
        answer += "L"+seg[1][0]+","+seg[1][1]+" ";
      }
      answer += "Z";
      return answer;
    };  // segs2d
    const setAttrs = (element, attrs) => {
      for (const attr in attrs) {
        element.setAttributeNS(null, attr, attrs[attr]);
      }
    };  // setAttrs
    const makePath = (segs) => {
      const path = document.createElementNS(svgns, "path");
      setAttrs(path, {
        "stroke" : "#cccccc",
        //"shape-rendering" : "crispEdges",  // prevent antialiasing  XXX not sure if I want this
        "d" : segs2d(segs),
      });
      return path;
    };  // makePath

    // CBB: we're using this inefficiently
    const parity = (numFractionBits,minExponent,x) => {
      const xsucc = succ(numFractionBits, minExponent, x);
      return round_to_nearest_representable(numFractionBits, minExponent, (x+xsucc)/2.) === x ? 0 : 1;
    };


    const xs = getFloatsInRange(numFractionBits, minExponent, ix0, ix1);
    const ys = getFloatsInRange(numFractionBits, minExponent, iy0, iy1);
    //PRINT(xs);
    //PRINT(ys);
    {
      const segsEven = [];
      const segsOdd = [];
      for (const x of xs) {
        const ox = relerp(x, ix0,ix1, ox0,ox1);
        if (parity(numFractionBits,minExponent,x) == 0) {
          segsEven.push([[ox,oy0],[ox,oy1]]);
        } else {
          segsOdd.push([[ox,oy0],[ox,oy1]]);
        }
      }
      for (const y of ys) {
        const oy = relerp(y, iy0,iy1, oy0,oy1);
        if (parity(numFractionBits,minExponent,y) == 0) {
          segsEven.push([[ox0,oy],[ox1,oy]]);
        } else {
          segsOdd.push([[ox0,oy],[ox1,oy]]);
        }
      }
      //PRINT(segsEven);
      //PRINT(segsOdd);
      {
        const path = makePath(segsOdd);
        setAttrs(path, {
          "stroke-width" : ""+(gridLineWidth+0),
          "stroke" : "#dddddd",  // a bit lighter
        });
        svg.appendChild(path);
      }
      {
        const path = makePath(segsEven);
        setAttrs(path, {
          "stroke-width" : ""+(gridLineWidth+0),
          "stroke" : "#bbbbbb",  // a bit darker
        });
        svg.appendChild(path);
      }
    }



    // Horizontals at a and b, and lighter at aIntent and bIntent
    {
      let o0 = relerp(0., ix0,ix1,ox0,ox1);
      let o1 = relerp(1., ix0,ix1,ox0,ox1);
      let oa = relerp(a, iy0,iy1,oy0,oy1);
      let ob = relerp(b, iy0,iy1,oy0,oy1);
      let oaIntent = relerp(aIntent, iy0,iy1,oy0,oy1);
      let obIntent = relerp(bIntent, iy0,iy1,oy0,oy1);

      const pathIntent = makePath([[[o0,oaIntent],[o1,oaIntent]],
                                   [[o0,obIntent],[o1,obIntent]]]);
      setAttrs(pathIntent, {
        "stroke" : "#ff8080",
        "stroke-width" : "1",
      });

      svg.appendChild(pathIntent);
      const path = makePath([[[o0,oa],[o1,oa]],
                             [[o0,ob],[o1,ob]]]);
      setAttrs(path, {
        "stroke" : "red",
        "stroke-width" : "3",
      });
      svg.appendChild(path);

      let ozeroy = relerp(0., iy0,iy1,oy0,oy1);
      const pathZero = makePath([[[o0,ozeroy],[o1,ozeroy]]]);
      setAttrs(pathZero, {
        "stroke" : "#888888",  // darker than the other horizontals
      });
      svg.appendChild(pathZero);
    }


    // Funny relevant diagonal, under the real diagonal.
    // This is starting at 0,a
    // and going up at slope round(b-a).
    // That is, from 0,a to 1,a+round(b-a).
    // And then another one, of the same slope, from 0,0 to 1,round(b-a).
    {
      const B = a + Round(b-a);
      const o0x = relerp(0., ix0,ix1,ox0,ox1);
      const o1x = relerp(1., ix0,ix1,ox0,ox1);
      const oa = relerp(a, iy0,iy1,oy0,oy1);
      const oB = relerp(B, iy0,iy1,oy0,oy1);
      const funnyUpwardDiagonalPath = makePath([[[o0x,oa],[o1x,oB]]]);
      svg.appendChild(funnyUpwardDiagonalPath);
      const BB = Round(b-a);
      const oBB = relerp(BB, iy0,iy1,oy0,oy1);
      const o0y = relerp(0., iy0,iy1,oy0,oy1);
      const anotherFunnyUpwardDiagonalPath = makePath([[[o0x,o0y],[o1x,oBB]]]);
      svg.appendChild(anotherFunnyUpwardDiagonalPath);
    }

    // The diagonals
    {
      const o0 = relerp(0., ix0,ix1,ox0,ox1);
      const o1 = relerp(1., ix0,ix1,ox0,ox1);
      const oa = relerp(a, iy0,iy1,oy0,oy1);
      const ob = relerp(b, iy0,iy1,oy0,oy1);
      const upwardDiagonalPath = makePath([[[o0,oa],[o1,ob]]]);
      setAttrs(upwardDiagonalPath, {
        "stroke" : "black",
      });
      svg.appendChild(upwardDiagonalPath);
      const downwardDiagonalPath = makePath([[[o1,oa],[o0,ob]]]);
      setAttrs(downwardDiagonalPath, {
        "stroke" : "black",
      });
      svg.appendChild(downwardDiagonalPath);
    }


    const makeTheTooltipText = (t,exact,approx) => {
      if (false)
        return ("t="+t+" -> exact="+toFractionString(exact)
               +" ["+toFractionString(round_down_to_representable(numFractionBits,minExponent,exact))
               +" "+toFractionString((round_down_to_representable(numFractionBits,minExponent,exact) + round_up_to_representable(numFractionBits,minExponent,exact)) / 2.)
               +" "+toFractionString(round_up_to_representable(numFractionBits,minExponent,exact))+"]"
               +" -> ="+toFractionString(approx)
               +"");
      const relevantNumbers = [
        exact,
        round_down_to_representable(numFractionBits,minExponent,exact),
        (round_down_to_representable(numFractionBits,minExponent,exact) + round_up_to_representable(numFractionBits,minExponent,exact)) / 2.,
        round_up_to_representable(numFractionBits,minExponent,exact),
      ].sort();

      const relevantNumberFractionStrings = [];
      const relevantNumberBinaryStrings = [];
      for (let i = 0; i < relevantNumbers.length; ++i) {
        if (i == 0 || relevantNumbers[i] != relevantNumbers[i-1]) {
          relevantNumberFractionStrings.push(toFractionString(relevantNumbers[i]));
          relevantNumberBinaryStrings.push(toBinaryString(relevantNumbers[i]));
        }
      }

      let answer = "t="+toFractionString(t)+" ["+relevantNumberFractionStrings.join(" ")+"] -> "+toFractionString(approx);
      if (approx == round_to_nearest_representable(numFractionBits,minExponent,exact)) {
        answer += " (correct)";
      } else {
        answer += " (WRONG)";
      }
      answer += "<br>"
      answer += "t="+toBinaryString(t)+" ["+relevantNumberBinaryStrings.join(" ")+"] -> "+toBinaryString(approx);

      return answer;
    };
    // The dots along the diagonals.
    // Upward green, downward red.
    for (let t = 0.; t <= 1.; t = Succ(t)) {
      let thing_circled_in_green = undefined;
      {
        const y = Lerp(a,b,t);

        const ox = relerp(t, ix0,ix1, ox0,ox1);
        const oy = relerp(y, iy0,iy1, oy0,oy1);

        if (y != round_to_nearest_representable(numFractionBits, minExponent, (1-t)*a+t*b)) {
          // Draw a ring around it
          const circle = document.createElementNS(svgns, "circle");
          circle.setAttributeNS(null, "cx", ""+ox);
          circle.setAttributeNS(null, "cy", ""+oy);
          circle.setAttributeNS(null, "r", "4.5");
          circle.setAttributeNS(null, "fill", "#ffffff01");  // Just a tiny bit of opacity so that tooltip will work
          circle.setAttributeNS(null, "stroke", "green");
          circle.setAttributeNS(null, "stroke-width", "2");
          circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, exact_lerp_cross_your_fingers(a,b,t), y));
          circle.onmouseout = evt=>hideTooltip();
          svg.appendChild(circle);
          thing_circled_in_green = y;
        }

        const circle = document.createElementNS(svgns, "circle");
        circle.setAttributeNS(null, "cx", ""+ox);
        circle.setAttributeNS(null, "cy", ""+oy);
        circle.setAttributeNS(null, "r", "1.5");
        circle.setAttributeNS(null, "fill", "green");
        circle.classList.add("hoverable");
        // Note that this onmouseover is also used by an event listener on the svg that does friendlier hovering (distance based).
        circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, exact_lerp_cross_your_fingers(a,b,t), y));
        circle.onmouseout = evt=>hideTooltip();
        svg.appendChild(circle);

      }
      {
        const y = Lerp(b,a,t);

        const ox = relerp(t, ix0,ix1, ox0,ox1);
        const oy = relerp(y, iy0,iy1, oy0,oy1);

        if (y != round_to_nearest_representable(numFractionBits, minExponent, (1-t)*b+t*a)) {
          // Draw a ring around it
          const circle = document.createElementNS(svgns, "circle");
          circle.setAttributeNS(null, "cx", ""+ox);
          circle.setAttributeNS(null, "cy", ""+oy);
          circle.setAttributeNS(null, "r", "4.5");
          circle.setAttributeNS(null, "fill", "#ffffff01");  // Just a tiny bit of opacity so that tooltip will work
          circle.setAttributeNS(null, "stroke", thing_circled_in_green===y ? "orange" : "red");
          circle.setAttributeNS(null, "stroke-width", "2");
          circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, exact_lerp_cross_your_fingers(b,a,t), y));
          circle.onmouseout = evt=>hideTooltip();
          svg.appendChild(circle);
        }

        const circle = document.createElementNS(svgns, "circle");
        circle.setAttributeNS(null, "cx", ""+ox);
        circle.setAttributeNS(null, "cy", ""+oy);
        if (y == Lerp(a,b,t)) {
          // Dot is both red and green, so make it slightly bigger and orange.
          circle.setAttributeNS(null, "r", "3");
          circle.setAttributeNS(null, "fill", "orange");
        } else {
          circle.setAttributeNS(null, "r", "1.5");
          circle.setAttributeNS(null, "fill", "red");
        }
        circle.classList.add("hoverable");
        circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, exact_lerp_cross_your_fingers(b,a,t), y));
        circle.onmouseout = evt=>hideTooltip();
        svg.appendChild(circle);
      }
    }

    if (false) {
      // DEBUGGING ... can probably remove this at some point
      console.log("======");
      if (false) {
        PRINT(Lerp(3/32., 3/4., .5));
        PRINT(Lerp(3/4., 3/32., .5));
      }

      if (false) {
        // with nF=1 minE=-4
        PRINT(Lerp(1/4., 3/4., 3/16.));
        PRINT(1*1/4. + (-3/16.)*(1/4.) + (3/16.)*(3/4.));
        PRINT(DotButImSkeptical([1,-3/16.,3/16.],[1/4.,1/4.,3/4.]));
      }

      if (false) {
        // Oh! simpler examples if b=1 ...
        // with nF=1 minE=-10
        // a=1/4 b=1
        // http://localhost:8000/lerp.html?numFractionBits=1&minExponent=-10&a=3/32&b=1
        PRINT(Lerp(1/4., 1., 3/32.));   // DotButImSkeptical says .25=1/4, should be .375=3/8
        PRINT(Lerp(1., 1/4, 3/16.));    // DotButImSkeptical says 1, should be .75

        // Let's debug the first, since increasing a<b is easier to think about
        PRINT(DotButImSkeptical([1,-3/32.,3/32.],[1/4.,1/4.,1.]));
      }
      if (true) {
        // Even simpler...
        // http://localhost:8000/lerp.html?numFractionBits=1&minExponent=-6&a=3/4&b=1
        skeptical_double_check_hack_xxx = true;
        skeptical_verbose_level_override = 1;
        PRINT(Lerp(3/4, 1, 3/8));  // DotButImSkeptical says 1, should be 3/4.  Exact is 27/32.
        PRINT(DotButImSkeptical([1,-3/8,3/8],[3/4,3/4,1]));
        skeptical_double_check_hack_xxx = false;
        skeptical_verbose_level_override = undefined;
      }

      console.log("======");
    }

    return svg;
  };  // populateTheSVG

  const svg = window.theSVG;

  const theTitle = window.theTitle;

  const setLerpMethodToExactCrossYourFingers = () => {
    Lerp = (a,b,t) => round_to_nearest_representable(numFractionBits, minExponent, exact_lerp_cross_your_fingers(a, b, t));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "exact lerp";
  };
  const setLerpMethodToMagic = () => {
    Lerp = (a,b,t) => magic_correct_lerp(numFractionBits, minExponent, a,b,t);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "magic actual lerp (doesn't always work)";
  };
  const setLerpMethodToNaive = () => {
    //Lerp = (a,b,t) => Plus(Times(Minus(1.,t),a), Times(t,b));
    Lerp = (a,b,t) => {
      const verboseLevel = 0;
      if (verboseLevel >= 1) console.log("    in naive Lerp(a="+STRINGIFY(a)+" b="+STRINGIFY(b)+" t="+STRINGIFY(t)+")");
      if (verboseLevel >= 1) PRINT(Minus(1.,t));
      if (verboseLevel >= 1) PRINT(Times(Minus(1.,t),a));
      if (verboseLevel >= 1) PRINT(Times(t,b));
      if (verboseLevel >= 1) PRINT(Plus(Times(Minus(1.,t),a), Times(t,b)));
      if (verboseLevel >= 1) PRINT(Plus(.5,.3125));  // .875
      if (verboseLevel >= 1) PRINT(Plus(-.5,-.3125));  // -.75
      const answer = Plus(Times(Minus(1.,t),a), Times(t,b));
      if (verboseLevel >= 1) console.log("    out naive Lerp(a="+STRINGIFY(a)+" b="+STRINGIFY(b)+" t="+STRINGIFY(t)+"), returning "+STRINGIFY(answer));
      return answer;
    };
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "(1-t)*a + t*b";
  };
  const setLerpMethodToTypeMeaningful = () => {
    Lerp = (a,b,t) => Plus(a, Times(Minus(b,a),t));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "a + t*(b-a)";
  };
  const setLerpMethodToTypeMeaningfulBackwards = () => {
    Lerp = (a,b,t) => Minus(b, Times(Minus(1.,t),Minus(b,a)));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "b - (1-t)*(b-a)";
  };
  const setLerpMethodToBidirectional = () => {
    Lerp = (a,b,t) => t<.5 ? Plus(a, Times(Minus(b,a),t))
                           : Minus(b, Times(Minus(1.,t),Minus(b,a)));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "t<.5 ? a+(b-a)*t : b-(1-t)*(b-a)";
  };
  const setLerpMethodToBidirectionalAlt = () => {
    Lerp = (a,b,t) => t<=.5 ? Plus(a, Times(Minus(b,a),t))
                            : Minus(b, Times(Minus(1.,t),Minus(b,a)));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "t<=.5 ? a+(b-a)*t : b-(1-t)*(b-a)";
  };
  const setLerpMethodToBidirectionalAlt3 = () => {
    Lerp = (a,b,t) => t<.5 ? Plus(a, Times(Minus(b,a),t)) :
                      t>.5 ? Minus(b, Times(Minus(1.,t),Minus(b,a)))
                           : Times(Plus(a,b),0.5);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "t<.5 ? a+(b-a)*t : t>.5 ? b-(1-t)*(b-a) : (a+b)/2";
  };
  const setLerpMethodToMaybe = () => {
    Lerp = (a,b,t) => {
      const answer0 = Plus(Times(Minus(1.,t),a), Times(t,b));
      const answer = Plus(answer0,
                          Plus(Times(Minus(1.,t),Minus(a,answer0)),
                               Times(t,Minus(b,answer0))));
      return answer;
    };
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "answer0 = (1-t)*a + t*b; answer0 += ((1-t)*(a-answer0) + t*(b-answer0)";
  };
  const setLerpMethodToMaybe2 = () => {
    Lerp = (a,b,t) => {
      const answer0 = Plus(a, Times(Minus(b,a),t));
      const answer1 = Minus(b, Times(Minus(1.,t),Minus(b,a)));
      const answer = Plus(Times(Minus(1.,t),answer0), Times(t,answer1));
      return answer;
    };
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "answer0 = a+t(b-a); answer1 = b-(1-t)(b-a); answer = (1-t)*answer0 + t*answer1";
  };
  const setLerpMethodToMaybe3 = () => {
    Lerp = (a,b,t) => {
      const answer0 = Plus(Times(Minus(1.,t),a), Times(t,b));
      const answer = t == 0 ? answer0
                            : Minus(answer0,
                                    Times(Minus(Plus(DividedBy(Minus(answer0,a),
                                                               t),
                                                     a),
                                                b),
                                          t));
      return answer;
    };
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "answer0 = (1-t)*a+t*b; answer = answer0 - ((answer0-a)/t+a-b)*t";
  };
  const setLerpMethodToMaybe4 = () => {
    Lerp = (a,b,t) => {
      const answer0 = Plus(Times(Minus(1.,t),a), Times(t,b));
      const answer = (1.-t)==0 ? answer0
                               : Minus(answer0,
                                       Times(Minus(Plus(DividedBy(Minus(answer0,b),
                                                                  Minus(1.,t)),
                                                        b),
                                                   a),
                                             Minus(1.,t)));
      return answer;
    };
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "answer0 = (1-t)*a+t*b; answer = answer0 - ((answer0-b)/(1-t)+b-a)*(1-t)";
  };

  const setLerpMethodToTBlast = () => {
    Lerp = (a,b,t) => Plus(Minus(a, Times(t,a)), Times(t,b));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "a - t*a + b";
  };
  const setLerpMethodToTBlastAtTwicePrecision = () => {
    //Lerp = (a,b,t) => Plus(Minus(a, Times(t,a)), Times(t,b));
    Lerp = (a,b,t) => Round(plus(2*numFractionBits,2*minExponent,minus(2*numFractionBits,2*minExponent,a, times(2*numFractionBits,2*minExponent,t,a)), times(2*numFractionBits,2*minExponent,t,b)));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "a - t*a + b";
  };
  const setLerpMethodToAlast = () => {
    Lerp = (a,b,t) => Plus(Minus(Times(t,b), Times(t,a)), a);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "b - t*a + a";
  };
  const setLerpMethodToAlastAtTwicePrecision = () => {
    //Lerp = (a,b,t) => Plus(Minus(Times(t,b), Times(t,a)), a);
    Lerp = (a,b,t) => Round(plus(2*numFractionBits,2*minExponent,minus(2*numFractionBits,2*minExponent,times(2*numFractionBits,2*minExponent,t,b), times(2*numFractionBits,2*minExponent,t,a)), a));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "b - t*a + a";
  };
  const setLerpMethodToTAlast = () => {
    Lerp = (a,b,t) => Minus(Plus(a,Times(t,b)), Times(t,a));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "a + b - t*a";
  };
  const setLerpMethodToTAlastAtTwicePrecision = () => {
    //Lerp = (a,b,t) => Minus(Plus(a,Times(t,b)), Times(t,a));
    Lerp = (a,b,t) => Round(minus(2*numFractionBits,2*minExponent,plus(2*numFractionBits,2*minExponent,a,times(2*numFractionBits,2*minExponent,t,b)), times(2*numFractionBits,2*minExponent,t,a)));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "a + b - t*a";
  };

  const setLerpMethodToTBlastUsingDot = () => {
    Lerp = (a,b,t) => DotKahanish([1,-t,t], [a,a,b], false);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,-t,t] <big>&#8226;</big> [a,a,b] Kahan";
  };
  const setLerpMethodToAlastUsingDot = () => {
    Lerp = (a,b,t) => DotKahanish([t,-t,1], [b,a,a], false);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] <big>&#8226;</big> [b,a,a] Kahan";
  };
  const setLerpMethodToTAlastUsingDot = () => {
    Lerp = (a,b,t) => DotKahanish([1,t,-t], [a,b,a], false);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] <big>&#8226;</big> [a,b,a] Kahan";
  };
  const setLerpMethodToTBlastUsingDotTweaked = () => {
    Lerp = (a,b,t) => DotKahanish([1,-t,t], [a,a,b], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,-t,t] <big>&#8226;</big> [a,a,b] Kahan tweaked";
  };
  const setLerpMethodToAlastUsingDotTweaked = () => {
    Lerp = (a,b,t) => DotKahanish([t,-t,1], [b,a,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] <big>&#8226;</big> [b,a,a] Kahan tweaked";
  };
  const setLerpMethodToTAlastUsingDotTweaked = () => {
    Lerp = (a,b,t) => DotKahanish([1,t,-t], [a,b,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] <big>&#8226;</big> [a,b,a] Kahan tweaked";
  };
  const setLerpMethodToTBlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([1,-t,t], [a,a,b], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,-t,t] <big>&#8226;</big> [a,a,b] smarter";
  };
  const setLerpMethodToAlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([t,-t,1], [b,a,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] <big>&#8226;</big> [b,a,a] smarter";
  };
  const setLerpMethodToTAlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([1,t,-t], [a,b,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] <big>&#8226;</big> [a,b,a] smarter";
  };
  const setLerpMethodToTBlastUsingDotSmartest = () => {
    Lerp = (a,b,t) => DotCorrect([1,-t,t], [a,a,b], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,-t,t] <big>&#8226;</big> [a,a,b] smartest";
  };
  const setLerpMethodToAlastUsingDotSmartest = () => {
    Lerp = (a,b,t) => DotCorrect([t,-t,1], [b,a,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] <big>&#8226;</big> [b,a,a] smartest";
  };
  const setLerpMethodToTAlastUsingDotSmartest = () => {
    Lerp = (a,b,t) => DotCorrect([1,t,-t], [a,b,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] <big>&#8226;</big> [a,b,a] smartest";
  };

  window.lerpmethodExactCrossYourFingers.setAttribute("checked", "");
  setLerpMethodToExactCrossYourFingers();


  const lerpmethodChanged = (a) => {};

  window.lerpmethodExactCrossYourFingers.onclick = () => setLerpMethodToExactCrossYourFingers();
  window.lerpmethodMagic.onclick = () => setLerpMethodToMagic();
  window.lerpmethodNaive.onclick = () => setLerpMethodToNaive();
  window.lerpmethodTypeMeaningful.onclick = () => setLerpMethodToTypeMeaningful();
  window.lerpmethodTypeMeaningfulBackwards.onclick = () => setLerpMethodToTypeMeaningfulBackwards();
  window.lerpmethodBidirectional.onclick = () => setLerpMethodToBidirectional();
  window.lerpmethodBidirectionalAlt.onclick = () => setLerpMethodToBidirectionalAlt();
  window.lerpmethodBidirectionalAlt3.onclick = () => setLerpMethodToBidirectionalAlt3();
  window.lerpmethodMaybe.onclick = () => setLerpMethodToMaybe();
  window.lerpmethodMaybe2.onclick = () => setLerpMethodToMaybe2();
  window.lerpmethodMaybe3.onclick = () => setLerpMethodToMaybe3();
  window.lerpmethodMaybe4.onclick = () => setLerpMethodToMaybe4();
  window.lerpmethodTBlast.onclick = () => setLerpMethodToTBlast();
  window.lerpmethodTBlastAtTwicePrecision.onclick = () => setLerpMethodToTBlastAtTwicePrecision();
  window.lerpmethodAlast.onclick = () => setLerpMethodToAlast();
  window.lerpmethodAlastAtTwicePrecision.onclick = () => setLerpMethodToAlastAtTwicePrecision();
  window.lerpmethodTAlast.onclick = () => setLerpMethodToTAlast();
  window.lerpmethodTAlastAtTwicePrecision.onclick = () => setLerpMethodToTAlastAtTwicePrecision();
  window.lerpmethodTBlastUsingDot.onclick = () => setLerpMethodToTBlastUsingDot();
  window.lerpmethodAlastUsingDot.onclick = () => setLerpMethodToAlastUsingDot();
  window.lerpmethodTAlastUsingDot.onclick = () => setLerpMethodToTAlastUsingDot();
  window.lerpmethodTBlastUsingDotTweaked.onclick = () => setLerpMethodToTBlastUsingDotTweaked();
  window.lerpmethodAlastUsingDotTweaked.onclick = () => setLerpMethodToAlastUsingDotTweaked();
  window.lerpmethodTAlastUsingDotTweaked.onclick = () => setLerpMethodToTAlastUsingDotTweaked();
  window.lerpmethodTBlastUsingDotSmarter.onclick = () => setLerpMethodToTBlastUsingDotSmarter();
  window.lerpmethodAlastUsingDotSmarter.onclick = () => setLerpMethodToAlastUsingDotSmarter();
  window.lerpmethodTAlastUsingDotSmarter.onclick = () => setLerpMethodToTAlastUsingDotSmarter();
  window.lerpmethodTBlastUsingDotSmartest.onclick = () => setLerpMethodToTBlastUsingDotSmartest();
  window.lerpmethodAlastUsingDotSmartest.onclick = () => setLerpMethodToAlastUsingDotSmartest();
  window.lerpmethodTAlastUsingDotSmartest.onclick = () => setLerpMethodToTAlastUsingDotSmartest();

  if (enable_custom) {
    window.add_custom_expression.onclick = () => {
      console.log("in window.add_custom_expression.onclick");

      // TODO: is the value= even used?  If not, get rid

      // Create a new tr element above the current tr element.

      const current_table = window.add_custom_expression.closest("table");
      const new_tr = current_table.insertRow(current_table.rows.length-1);
      const x_td = new_tr.insertCell(0);
      console.log("  x_td = ",x_td);
      x_td.innerHTML = '<button type="button" style="padding:1px;">&#x2716;</button> <!-- heavy multiplication x -->';
      const x_button = x_td.children[0];
      x_button.onclick = () => new_tr.remove();

      const radiobutton_td = new_tr.insertCell(1);
      radiobutton_td.innerHTML = '<input type="radio" class="lerpmethodRadioButton" name="lerpmethod"><input size="50" value="(2*t-1)*(2*t-1)*0.25"></input>'
      const textinput = 

      console.log("out window.add_custom_expression.onclick");
    };
  } else {
    window.add_custom_expression.remove();
  }

  let xOfMouseDown = undefined;
  let yOfMouseDown = undefined;
  let aOfMouseDown = undefined;
  let bOfMouseDown = undefined;
  let xOfPreviousMouseEvent = undefined;
  let yOfPreviousMouseEvent = undefined;

  let draggingA = false;
  let draggingB = false;
  const eventVerboseLevel = 0;  // set to something else here to debug
  // https://www.mutuallyhuman.com/blog/keydown-is-the-only-keyboard-event-we-need/

  // whether b is closer than the midpoint between a and b
  const bIsCloser = eventOffsetY => {
    const iy = relerp(eventOffsetY, oy0,oy1, iy0,iy1);
    return Math.abs(iy-b) < Math.abs(iy-(a+b)/2.);
  };
  // whether a is closer than the midpoint between a and b
  const aIsCloser = eventOffsetY => {
    const iy = relerp(eventOffsetY, oy0,oy1, iy0,iy1);
    return Math.abs(iy-a) < Math.abs(iy-(a+b)/2.);
  };

  window.addEventListener("keydown", (event) => {
    if (eventVerboseLevel >= 1) console.log("keydown");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    if (!event.ctrlKey) {
      if (false) {
      } else if (event.key === '=' || event.key === '+') {
        numFractionBits += 1;
        setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
            [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)],['enable_custom', enable_custom_string!==null?''+enable_custom:null]],
            /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
            /*verboseLevel=*/0);
        populateTheSVG(svg, Lerp, a, b);
      } else if (event.key == '-') {
        if (numFractionBits > 0) {
          numFractionBits -= 1;
          setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
              [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)],['enable_custom', enable_custom_string!==null?''+enable_custom:null]],
              /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
              /*verboseLevel=*/0);
          populateTheSVG(svg, Lerp, a, b);
        }
      } else if (event.key == "ArrowUp") {
        event.preventDefault();  // prevent scrolling
        if (bIsCloser(yOfPreviousMouseEvent)) {
          b = Succ(b);
        } else if (aIsCloser(yOfPreviousMouseEvent)) {
          a = Succ(a);
        } else if (a == b) {
          b = Succ(b);
        } else {
          a = Succ(a);
          b = Succ(b);
        }
        setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
            [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)],['enable_custom', enable_custom_string!==null?''+enable_custom:null]],
            /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
            /*verboseLevel=*/0);
        populateTheSVG(svg, Lerp, a, b);
      } else if (event.key == "ArrowDown") {
        event.preventDefault();  // prevent scrolling
        if (bIsCloser(yOfPreviousMouseEvent)) {
          b = Pred(b);
        } else if (aIsCloser(yOfPreviousMouseEvent)) {
          a = Pred(a);
        } else if (a == b) {
          a = Pred(a);
        } else {
          a = Pred(a);
          b = Pred(b);
        }
        setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
            [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)],['enable_custom', enable_custom_string!==null?''+enable_custom:null]],
            /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
            /*verboseLevel=*/0);
        populateTheSVG(svg, Lerp, a, b);
      }
    }  // if !event.ctrlKey
    // event.stopPropagation(); // TODO: do I want this?  I haven't yet learned what it means
  });
  svg.addEventListener("mousedown", (event) => {
    if (eventVerboseLevel >= 1) console.log("mousedown");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    xOfMouseDown = event.offsetX;
    yOfMouseDown = event.offsetY;
    aOfMouseDown = a;
    bOfMouseDown = b;
    const ix = relerp(event.offsetX, ox0,ox1, ix0,ix1);
    const iy = relerp(event.offsetY, oy0,oy1, iy0,iy1);
    const aDist = Math.abs(iy - a);
    const bDist = Math.abs(iy - b);
    const midDist = Math.abs(iy - (a+b)/2.);
    if (a == b) {
      if (iy <= a) {
        draggingA = true;
      } else {
        draggingB = true;
      }
    } else if (midDist < aDist && midDist < bDist) {
      draggingA = true;
      draggingB = true;
    } else if (aDist <= bDist) {
      draggingA = true;
    } else {
      draggingB = true;
    }
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mouseup", (event) => {
    if (eventVerboseLevel >= 1) console.log("mouseup");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    draggingA = draggingB = false;
    // Snap intents to nearest on mouse up (a and b are intents here)
    a = round_to_nearest_representable(numFractionBits, minExponent, a);
    b = round_to_nearest_representable(numFractionBits, minExponent, b);
    populateTheSVG(svg, Lerp, a, b);
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mouseenter", (event) => {
    if (eventVerboseLevel >= 1) console.log("mouseenter");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mouseleave", (event) => {
    if (eventVerboseLevel >= 1) console.log("mouseleave");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mousemove", (event) => {
    if (draggingA || draggingB) {
      if (eventVerboseLevel >= 1) console.log("mousemove with mouse down");
      if (eventVerboseLevel >= 1) console.log("  event = ",event);
      const ixOfMouseDown = relerp(xOfMouseDown, ox0,ox1, ix0,ix1);
      const iyOfMouseDown = relerp(yOfMouseDown, oy0,oy1, iy0,iy1);
      const ix = relerp(event.offsetX, ox0,ox1, ix0,ix1);
      const iy = relerp(event.offsetY, oy0,oy1, iy0,iy1);

      const aSnappedOld = round_to_nearest_representable(numFractionBits, minExponent, a);
      const bSnappedOld = round_to_nearest_representable(numFractionBits, minExponent, b);

      if (draggingA) a = aOfMouseDown + (iy-iyOfMouseDown);
      if (draggingB) b = bOfMouseDown + (iy-iyOfMouseDown);

      const aSnappedNew = round_to_nearest_representable(numFractionBits, minExponent, a);
      const bSnappedNew = round_to_nearest_representable(numFractionBits, minExponent, b);

      if (aSnappedNew != aSnappedOld || bSnappedNew != bSnappedOld) {
        // Note that, while mouse is down, a and b in general aren't representable floats, so we round them when setting the URL param here
        setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
            [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(aSnappedNew)],['b',toFractionString(bSnappedNew)],['enable_custom', enable_custom_string!==null?''+enable_custom:null]],
            /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
            /*verboseLevel=*/0);
      }

      populateTheSVG(svg, Lerp, a, b);
    } else {
      // See if we are close to any circles.  This is wildly inefficient.
      const hoverables = svg.getElementsByClassName("hoverable");
      //PRINT(hoverables.length);
      //PRINT(hoverables);
      let closestIndex = -1;
      let closestDist2 = -1;
      for (let i = 0; i < hoverables.length; ++i) {
        const hoverable = hoverables[i];
        CHECK.EQ(hoverable.tagName, "circle");
        const cx = parseFloat(hoverable.getAttributeNS(null, "cx"));
        const cy = parseFloat(hoverable.getAttributeNS(null, "cy"));
        const thisDist2 = (cx-event.offsetX)**2 + (cy-event.offsetY)**2;
        if (closestIndex == -1 || thisDist2 < closestDist2) {
          closestIndex = i;
          closestDist2 = thisDist2;
        }
      }
      //PRINT(closestIndex);
      if (closestIndex !== -1) {
        const threshold = 10;
        if (closestDist2 <= threshold**2) {
          const closestDist = Math.sqrt(closestDist2);
          hoverables[closestIndex].onmouseover(event);
        } else {
          hideTooltip();
        }
      }
    }
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });

  console.log("    out lerp.js require callback");
});
console.log("out lerp.js")
