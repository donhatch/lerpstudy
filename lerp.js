// TODO: browser zoom isn't faithful?? what's going on?  When I zoom in a bit, it draws more lines!
// TODO: "smartest" seems perfect, but only if minExponent is sufficiently low.  can we make it perfect even with not-so-low minE?
// TODO: make the selection of lerp algorithm persist in url bar
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

  let a = parseFractionString(aString);
  let b = parseFractionString(bString);

  //a = round_to_nearest_representable(a);
  //b = round_to_nearest_representable(b);



  const xformUrlPart = urlPart=>urlPart;
  setURLParamModule.setURLAndParamsInURLBar(xformUrlPart,
                                            [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)]],
                                            /*whetherToEncodeValue=*/false);  // don't encode the '/' as  %2F


  //======================================
  // Begin float utilities
  const get_rounding_quantum = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
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
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    return Math.floor(x/quantum)*quantum;
  };
  const round_up_to_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    return Math.ceil(x/quantum)*quantum;
  };

  const round_to_nearest_representable_without_checking_against_opposite = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("            in round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+toDebugString(x)+")");
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
    const answer = round_to_nearest_representable_without_checking_against_opposite(numFractionBits, minExponent, x);
    CHECK.EQ(round_to_nearest_representable_without_checking_against_opposite(numFractionBits, minExponent, -x), -answer);
    return answer;
  };

  const is_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    return round_down_to_representable(numFractionBits, minExponent, x) == x;
  };
  const pred_without_checking_against_succ = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
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
    const answer = pred_without_checking_against_succ(numFractionBits, minExponent, x);
    CHECK.EQ(succ_without_checking_against_pred(numFractionBits, minExponent, answer), x);
    return answer;
  };
  const succ = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const answer = succ_without_checking_against_pred(numFractionBits, minExponent, x);
    CHECK.EQ(pred_without_checking_against_succ(numFractionBits, minExponent, answer), x);
    return answer;
  };
  const getFloatsInRange = (numFractionBits, minExponent, a, b) => {
    CHECK.NE(b, undefined);
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
    // "fast" means we *know* |a|>=|b|, rather than sorting them.
    CHECK.GE(Math.abs(a), Math.abs(b));
    const x = plus(numFractionBits, minExponent, a, b);
    const b_virtual  = minus(numFractionBits, minExponent, x, a);
    const y = minus(numFractionBits, minExponent,  b, b_virtual);
    return [x,y];
  };
  const two_sum = (numFractionBits, minExponent, a, b) => {
    if (Math.abs(a) >= Math.abs(b)) return fast_two_sum(numFractionBits, minExponent, a, b);
    else return fast_two_sum(numFractionBits, minExponent, b, a);
  };
  const linear_expansion_sum = (numFractionBits, minExponent, e, f) => {
    CHECK.NE(f, undefined);
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("in linear_expansion_sum(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+" f="+toDebugString(f)+")");
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
    const answer = [...e];
    if (verboseLevel >= 1) console.log("out my_normalize_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+toDebugString(e)+"), returning "+toDebugString(answer));
    return answer;
  };

  const expansions_are_same = (e, f) => {
    if (e.length != f.length) return false;
    for (let i = 0; i < e.length; ++i) if (e[i] != f[i]) return false;
    return true;
  };  // expansions_are_same
  const canonicalize_linear_expansion = (numFractionBits, minExponent, e) => {
    const verboseLevel = 1;
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
    if (verboseLevel >= 1) console.log("out canonicalize_linear_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+STRINGIFY(e)+"), returning "+toDebugString(f));
    return f;
  };  // canonicalize_linear_expansion

  const split = (numFractionBits, minExponent, a) => {
    CHECK.GE(numFractionBits, 3);  // that's what the paper says, not sure why.  TODO: check whether it fails for 2 and/or 1
    const multiplier = 2**Math.ceil(numFractionBits/2) + 1;
    const c = times(numFractionBits, minExponent, multiplier, a);
    const a_big = minus(numFractionBits, minExponent, c, a);
    const a_hi = minus(numFractionBits, minExponent, c, a_big);
    const a_lo = minus(numFractionBits, minExponent, a, a_hi);
    CHECK.EQ(a_hi+a_lo, a);
    CHECK.EQ(plus(numFractionBits, minExponent, a_hi, a_lo), a);
    return [a_hi,a_lo];
  };  // split

  const two_product = (numFractionBits, minExponent, a, b) => {
    // From shewchuk's paper.
    // TODO: can this be done using fma?  The paper assumed we don't have fma.
    CHECK.NE(b, undefined);
    const x = times(numFractionBits, minExponent, a, b);
    let a_hi, a_lo, b_hi, b_lo;
    [a_hi, a_lo] = split(numFractionBits, minExponent, a);
    [b_hi, b_lo] = split(numFractionBits, minExponent, b);
    const err1 = minus(numFractionBits, minExponent, x, times(numFractionBits, minExponent, a_hi, b_hi));
    const err2 = minus(numFractionBits, minExponent, err1, times(numFractionBits, minExponent, a_lo, b_hi));
    const err3 = minus(numFractionBits, minExponent, err2, times(numFractionBits, minExponent, a_hi, b_lo));
    const y = minus(numFractionBits, minExponent, times(numFractionBits, minExponent, a_lo, b_lo), err3);
    return [x,y];
  };  // two_product
  const two_product_using_fma = (numFractionBits, minExponent, a, b) => {
    // Ah, cool!  So the value of fma here is that it it saves all that work of two_product above.
    let hi = times(numFractionBits, minExponent, a, b);
    let lo = fma(numFractionBits, minExponent, a, b, -hi);
    return [hi, lo];
  };  // two_product_using_fma
  const scale_expansion = (numFractionBits, minExponent, e, b) => {
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("in scale_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+STRINGIFY(e)+" b="+toDebugString(b)+")");
    for (let i = 0; i < e.length-1; ++i) CHECK.GE(Math.abs(e[i]), Math.abs(e[i+1]));  // nonincreasing magnitudes
    if (e.length == 0) return [];
    const answer = []
    {
      let Q, h;
      [Q,h] = two_product(numFractionBits, minExponent, e[e.length-1], b);
      if (h != 0) answer.push(h);
      if (verboseLevel >= 1) console.log("  initial Q,h = "+Q+","+h);
      for (let i = e.length-1-1; i >= 0; --i) {
        let T,t;
        [T,t] = two_product(numFractionBits, minExponent, e[i], b);
        [Q,h] = two_sum(numFractionBits, minExponent, Q,t);
        if (h != 0) answer.push(h);
        [Q,h] = fast_two_sum(numFractionBits, minExponent, T,Q);
        if (h != 0) answer.push(h);
      }
      if (Q != 0) answer.push(Q)
    }
    answer.reverse();
    if (verboseLevel >= 1) console.log("out scale_expansion(numFractionBits="+numFractionBits+" minExponent="+minExponent+" e="+STRINGIFY(e)+" b="+STRINGIFY(b)+"), returning "+STRINGIFY(answer));
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

    if (true) {
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
    // That's still not conclusive, and in fact it may not be exactly representable at all.
    // Okay, let's do it for real.
    {
      let numFractionBits = 3;  // TODO: see if I trust 2; there's currently a CHECK failure due to something in the paper, but I don't understand why
      const minExponent = -100;
      while (!is_representable(numFractionBits, minExponent, a)
          || !is_representable(numFractionBits, minExponent, b)
          || !is_representable(numFractionBits, minExponent, t)) {
        // CBB: we assume it's due to numFractionBits, although it could be due to minExponent instead
        numFractionBits++;
      }
      const bminusa = linear_expansion_sum(numFractionBits, minExponent, [b], [-a]);
      const bminusa_times_t = scale_expansion(numFractionBits, minExponent, bminusa, t);
      const answer_expansion = canonicalize_linear_expansion(numFractionBits, minExponent,
                                                             linear_expansion_sum(numFractionBits, minExponent, [a], bminusa_times_t));
      // Ok here's the part where we have to be careful.
      // If we naively sum the parts of answer_expansion, in its precision, we may get the wrong answer,
      // e.g. something just on the odd side of a tie, in the given precision, may get rounded to the tie, and then wrongly rounded to even.
      // However, the point here is just to confirm something we think is exact (done in native precision, which is probably much more than nF)
      // so we'll proceed anyway.
      let answer = 0;
      for (let i = answer_expansion.length-1; i >= 0; --i) {
        answer += answer_expansion[i];
      }
      CHECK.EQ(answer, exact0);

      if (false) {
        // Q: Does canonicalization always chooses the right answer for the first component anyway?
        // A: Oh, it is *not* true.  Actually the logic for canonicalization does exactly the wrong thing!  That is, it chooses the right choice locally,
        // which is the wrong choice globally due to two it thinking there are two tiebreaks when it isn't really a tie.
        // The following tests that hypothesis; it fails.
        PRINT(toDebugString(answer_expansion));
        PRINT(toDebugString(round_to_nearest_representable(numFractionBits, minExponent, answer)));
        CHECK.EQ(round_to_nearest_representable(numFractionBits, minExponent, answer), answer_expansion.length>0?answer_expansion[0]:0);
      }
    }

    return exact0;
  };

  PRINT(scale_expansion(3, -7, [1/16], 1/64));  // XXX it's zero??  wtf?  OH that's because of minExponent, I bet
  PRINT(exact_lerp_cross_your_fingers(0, 1/16, 1/64));
  PRINT(exact_lerp_cross_your_fingers(0, 13/16, 1/64));
  PRINT(exact_lerp_cross_your_fingers(0, 15/16, 1/64));
  PRINT(exact_lerp_cross_your_fingers(0, 7/8, 1/128));
  PRINT(exact_lerp_cross_your_fingers(0, 3/4, 1/256));
  PRINT(exact_lerp_cross_your_fingers(1/8, 1, 1/128));
  PRINT(exact_lerp_cross_your_fingers(15/64, 1, 1/512));

  const magic_correct_lerp = (numFractionBits, minExponent, a, b, t) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    CHECK(is_representable(numFractionBits, minExponent, t));
    const exact_I_hope = exact_lerp_cross_your_fingers(a, b, t);
    const answer = round_to_nearest_representable(numFractionBits, minExponent, exact_I_hope);
    return answer;
  };
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

  if (true) {
    // DEBUGGING "smartest"... this really should not happen, it's supposed to be exact!
    // http://localhost:8000/lerp.html?numFractionBits=3&minExponent=-10&a=0&b=13/16  with any of the "smartest" algorithms checked, t=11/32, descending
    // Exact answer is 273/512
    // Hmm, I think this might be the pathological case, I'm probably not protecting against it properly.
    //     exact answer is: 0.100010001
    //     which is a little bit higher than the halfway point 0.10001 between representable 0.1000 and 0.1001.
    //     so, should round to: 0.1001
    //           but rounds to:   0.1000
    const a = 13/16;
    const b = 0;
    const t = 11/32;
    PRINT(DotCorrect([1,-t,t],[a,a,b]));
    PRINT(magic_correct_lerp(numFractionBits, minExponent, a,b,t));
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
    let tooltip = document.getElementById("tooltip");
    tooltip.innerHTML = text;
    tooltip.style.display = "block";
    tooltip.style.left = evt.pageX + 10 + 'px';
    tooltip.style.top = evt.pageY + 10 + 'px';
  };
  const hideTooltip = () => {
    const tooltip = document.getElementById("tooltip");
    tooltip.style.display = "none";
  };

  const populateTheSVG = (svg, Lerp, aIntent, bIntent) => {
    CHECK.NE(bIntent, undefined);

    // TODO: rename
    const a = round_to_nearest_representable(numFractionBits, minExponent, aIntent);
    const b = round_to_nearest_representable(numFractionBits, minExponent, bIntent);

    const theTitlePart2 = document.getElementById("theTitlePart2");
    //theTitlePart2.innerHTML = "  a="+a+" b="+b;
    //theTitlePart2.innerHTML = "  a="+a+"="+toFractionString(a)+"  b="+b+"="+toFractionString(b);
    theTitlePart2.innerHTML = "  a="+toFractionString(a)+"<small><small> ="+toBinaryString(a)+"="+a+"</small></small>  b="+toFractionString(b)+"<small><small> ="+toBinaryString(b)+"="+b+"</small></small>";

    const svgns = "http://www.w3.org/2000/svg";

    svg.setAttribute("width", ""+width+"px");
    svg.setAttribute("height", ""+height+"px");
    svg.style.position = 'absolute';
    svg.style.top = '30px';
    svg.style.left = '0px';
    //svg.style.pointerEvents = 'none';  // to make it "click-through-able", and so tooltips of underlying are functional
    svg.style.border = "5px solid black";
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
    // This is starting at a,0,
    // and going up at slope round(b-a).
    // That is, from a,0 to a+round(b-a).
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

  const svg = document.getElementById("theSVG");

  const theTitle = document.getElementById("theTitle");

  const setLerpMethodToMagic = () => {
    Lerp = (a,b,t) => magic_correct_lerp(numFractionBits, minExponent, a,b,t);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "magic actual lerp";
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
    theTitle.innerHTML = "a + (b-a)*t";
  };
  const setLerpMethodToBidirectional = () => {
    Lerp = (a,b,t) => t<.5 ? Plus(a, Times(Minus(b,a),t))
                           : Minus(b, Times(Minus(b,a),Minus(1.,t)));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "t<.5 ? a+(b-a)*t : b-(b-a)*(1-t)";
  };
  const setLerpMethodToBidirectionalAlt = () => {
    Lerp = (a,b,t) => t<=.5 ? Plus(a, Times(Minus(b,a),t))
                            : Minus(b, Times(Minus(b,a),Minus(1.,t)));
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "t<=.5 ? a+(b-a)*t : b-(b-a)*(1-t)";
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
    theTitle.innerHTML = "[1,-t,t] &#8226; [a,a,b] Kahan";
  };
  const setLerpMethodToAlastUsingDot = () => {
    Lerp = (a,b,t) => DotKahanish([t,-t,1], [b,a,a], false);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] &#8226; [b,a,a] Kahan";
  };
  const setLerpMethodToTAlastUsingDot = () => {
    Lerp = (a,b,t) => DotKahanish([1,t,-t], [a,b,a], false);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] &#8226; [a,b,a] Kahan";
  };
  const setLerpMethodToTBlastUsingDotTweaked = () => {
    Lerp = (a,b,t) => DotKahanish([1,-t,t], [a,a,b], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,-t,t] &#8226; [a,a,b] Kahan tweaked";
  };
  const setLerpMethodToAlastUsingDotTweaked = () => {
    Lerp = (a,b,t) => DotKahanish([t,-t,1], [b,a,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] &#8226; [b,a,a] Kahan tweaked";
  };
  const setLerpMethodToTAlastUsingDotTweaked = () => {
    Lerp = (a,b,t) => DotKahanish([1,t,-t], [a,b,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] &#8226; [a,b,a] Kahan tweaked";
  };
  const setLerpMethodToTBlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([1,-t,t], [a,a,b], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,-t,t] &#8226; [a,a,b] smarter";
  };
  const setLerpMethodToAlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([t,-t,1], [b,a,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] &#8226; [b,a,a] smarter";
  };
  const setLerpMethodToTAlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([1,t,-t], [a,b,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] &#8226; [a,b,a] smarter";
  };
  const setLerpMethodToTBlastUsingDotSmartest = () => {
    Lerp = (a,b,t) => DotCorrect([1,-t,t], [a,a,b], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,-t,t] &#8226; [a,a,b] smartest";
  };
  const setLerpMethodToAlastUsingDotSmartest = () => {
    Lerp = (a,b,t) => DotCorrect([t,-t,1], [b,a,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] &#8226; [b,a,a] smartest";
  };
  const setLerpMethodToTAlastUsingDotSmartest = () => {
    Lerp = (a,b,t) => DotCorrect([1,t,-t], [a,b,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] &#8226; [a,b,a] smartest";
  };

  document.getElementById("lerpmethodMagic").setAttribute("checked", "");
  setLerpMethodToMagic();


  const lerpmethodChanged = (a) => {};

  document.getElementById("lerpmethodMagic").onclick = () => setLerpMethodToMagic();
  document.getElementById("lerpmethodNaive").onclick = () => setLerpMethodToNaive();
  document.getElementById("lerpmethodTypeMeaningful").onclick = () => setLerpMethodToTypeMeaningful();
  document.getElementById("lerpmethodBidirectional").onclick = () => setLerpMethodToBidirectional();
  document.getElementById("lerpmethodBidirectionalAlt").onclick = () => setLerpMethodToBidirectionalAlt();
  document.getElementById("lerpmethodMaybe").onclick = () => setLerpMethodToMaybe();
  document.getElementById("lerpmethodTBlast").onclick = () => setLerpMethodToTBlast();
  document.getElementById("lerpmethodTBlastAtTwicePrecision").onclick = () => setLerpMethodToTBlastAtTwicePrecision();
  document.getElementById("lerpmethodAlast").onclick = () => setLerpMethodToAlast();
  document.getElementById("lerpmethodAlastAtTwicePrecision").onclick = () => setLerpMethodToAlastAtTwicePrecision();
  document.getElementById("lerpmethodTAlast").onclick = () => setLerpMethodToTAlast();
  document.getElementById("lerpmethodTAlastAtTwicePrecision").onclick = () => setLerpMethodToTAlastAtTwicePrecision();
  document.getElementById("lerpmethodTBlastUsingDot").onclick = () => setLerpMethodToTBlastUsingDot();
  document.getElementById("lerpmethodAlastUsingDot").onclick = () => setLerpMethodToAlastUsingDot();
  document.getElementById("lerpmethodTAlastUsingDot").onclick = () => setLerpMethodToTAlastUsingDot();
  document.getElementById("lerpmethodTBlastUsingDotTweaked").onclick = () => setLerpMethodToTBlastUsingDotTweaked();
  document.getElementById("lerpmethodAlastUsingDotTweaked").onclick = () => setLerpMethodToAlastUsingDotTweaked();
  document.getElementById("lerpmethodTAlastUsingDotTweaked").onclick = () => setLerpMethodToTAlastUsingDotTweaked();
  document.getElementById("lerpmethodTBlastUsingDotSmarter").onclick = () => setLerpMethodToTBlastUsingDotSmarter();
  document.getElementById("lerpmethodAlastUsingDotSmarter").onclick = () => setLerpMethodToAlastUsingDotSmarter();
  document.getElementById("lerpmethodTAlastUsingDotSmarter").onclick = () => setLerpMethodToTAlastUsingDotSmarter();
  document.getElementById("lerpmethodTBlastUsingDotSmartest").onclick = () => setLerpMethodToTBlastUsingDotSmartest();
  document.getElementById("lerpmethodAlastUsingDotSmartest").onclick = () => setLerpMethodToAlastUsingDotSmartest();
  document.getElementById("lerpmethodTAlastUsingDotSmartest").onclick = () => setLerpMethodToTAlastUsingDotSmartest();

  let xOfMouseDown = undefined;
  let yOfMouseDown = undefined;
  let aOfMouseDown = undefined;
  let bOfMouseDown = undefined;
  let xOfPreviousMouseEvent = undefined;
  let yOfPreviousMouseEvent = undefined;

  let draggingA = false;
  let draggingB = false;
  const eventVerboseLevel = 0;
  // https://www.mutuallyhuman.com/blog/keydown-is-the-only-keyboard-event-we-need/

  const bIsCloser = eventOffsetY => {
    const iy = relerp(eventOffsetY, oy0,oy1, iy0,iy1);
    return Math.abs(iy-b) < Math.abs(iy-a);
  };

  window.addEventListener("keydown", (event) => {
    if (eventVerboseLevel >= 1) console.log("keydown");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    if (false) {
    } else if (event.key === "=" || event.key === "+") {
      numFractionBits += 1;
      setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
          [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)]],
          /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
          /*verboseLevel=*/0);
      populateTheSVG(svg, Lerp, a, b);
    } else if (event.key == "-") {
      numFractionBits -= 1;
      setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
          [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)]],
          /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
          /*verboseLevel=*/0);
      populateTheSVG(svg, Lerp, a, b);
    } else if (event.key == "ArrowUp") {
      event.preventDefault();  // prevent scrolling
      if (bIsCloser(yOfPreviousMouseEvent)) {
        b = Succ(b);
      } else {
        a = Succ(a);
      }
      setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
          [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)]],
          /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
          /*verboseLevel=*/0);
      populateTheSVG(svg, Lerp, a, b);
    } else if (event.key == "ArrowDown") {
      event.preventDefault();  // prevent scrolling
      if (bIsCloser(yOfPreviousMouseEvent)) {
        b = Pred(b);
      } else {
        a = Pred(a);
      }
      setURLParamModule.setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart,
          [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(a)],['b',toFractionString(b)]],
          /*whetherToEncodeValue=*/false,  // don't encode the '/' as  %2F
          /*verboseLevel=*/0);
      populateTheSVG(svg, Lerp, a, b);
    }
    // event.stopPropagation(); // TODO: do I want this?
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
    if (midDist < aDist && midDist < bDist) {
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
            [['numFractionBits',numFractionBits],['minExponent',minExponent],['a',toFractionString(aSnappedNew)],['b',toFractionString(bSnappedNew)]],
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
