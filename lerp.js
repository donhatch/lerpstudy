// TODO: would it be clearer in binary?
// TODO: even/odd lines slightly darker/lighter
// TODO: hover-over a point should show details of calculation
// TODO: oscillating between two methods mode?  would be helpful.
// TODO: option to circle or otherwise emphasize the wrong ones? would be helpful.  DONE!
// TODO: browser zoom isn't faithful?? what's going on?  When I zoom in a bit, it draws more lines!
// TODO: make lerp-favicon.png a real picture of something
// TODO: make the selection of lerp algorithm stick in url bar
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

  const toBinaryString = x => {
    let answer = "";
    let scratch = x;
    if (scratch < 0) {
      scratch *= -1;
      answer = "-";
    }
    let intpart = Math.floor(scratch);
    scratch -= intpart;
    answer += intpart;  // XXX WRONG if intpart >= 2

    if (scratch != 0.) {
      answer += ".";
      while (scratch != 0.) {
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

  const toFractionString = x => {
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
    if (verboseLevel >= 1) console.log("            in round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+")");
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    if (verboseLevel >= 1) console.log("              quantum = "+STRINGIFY(quantum));
    const Lo = Math.floor(x/quantum);
    const Hi = Math.ceil(x/quantum);
    if (verboseLevel >= 1) console.log("              Lo = "+STRINGIFY(Lo));
    if (verboseLevel >= 1) console.log("              Hi = "+STRINGIFY(Hi));
    let answer;
    if (Lo == Hi) {
      answer = Lo*quantum;
      if (verboseLevel >= 1) console.log("            out round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+"), returning Lo*quantum="+STRINGIFY(Lo*quantum)+" because Lo==Hi");
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
    if (verboseLevel >= 1) console.log("            in succ_without_checking_against_pred(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+")");
    CHECK(is_representable(numFractionBits, minExponent, x));
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    // quantum is not exactly what we want.  but it's not more than a couple of orders of magnitude off.
    const answer = round_up_to_representable(numFractionBits, minExponent, x + quantum/4.);
    if (verboseLevel >= 1) console.log("            out succ_without_checking_against_pred(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+"), returning "+STRINGIFY(answer));
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
    if (verboseLevel >= 1) console.log("        in getFloatsInRange(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", a="+STRINGIFY(a)+", b="+STRINGIFY(b)+")");
    const first = round_up_to_representable(numFractionBits, minExponent, a);
    const last = round_down_to_representable(numFractionBits, minExponent, b);
    const answer = [];
    for (let x = first; x <= last; x = succ(numFractionBits, minExponent, x)) {
      answer.push(x);
    }
    if (verboseLevel >= 1) console.log("        out getFloatsInRange(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", a="+STRINGIFY(a)+", b="+STRINGIFY(b)+"), returning "+STRINGIFY(answer));
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
  const DotButImSkeptical = (xs,ys) => {
    const verboseLevel = 1;
    if (verboseLevel >= 1) console.log("        in DotButImSkeptical(xs="+STRINGIFY(xs)+" ys="+STRINGIFY(ys)+")");
    let Hi = 0.;
    let Lo = 0.;
    CHECK.EQ(xs.length, ys.length);
    for (let i = 0; i < xs.length; ++i) {
      const [hi,lo] = TwoProduct(xs[i],ys[i]);
      let lo1;
      [Hi,lo1] = TwoSum(Hi,hi);
      Lo = Plus(Lo, Plus(lo, lo1));
    }
    const answer = Plus(Hi, Lo);
    if (verboseLevel >= 1) console.log("        out DotButImSkeptical(xs="+STRINGIFY(xs)+" ys="+STRINGIFY(ys)+"), returning "+STRINGIFY(answer));
    return answer;
  };  // DotButImSkeptical

  if (false)
  {
    // DEBUGGING... this should not happen!!!
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
    //    bc_lo = -e = fma(b,c, w) = fma(b,c, bc_hi)
    //    answer_hi = f = fma(a,d, -w) = fma(a,d, -bc_hi)
    //    answer = f + e = answer_hi - bc_lo
    // And let's translate it into easier-to-understand ad+bc terms instead (dot product).
    //    bc_hi = b*c
    //    bc_lo = fma(b,c, -bc_hi)
    //    answer_hi = fma(a,d, bc_hi)
    //    answer = answer_hi + bc_lo = fma(a,d, bc_hi) + fma(b,c, -bc_hi)
    // And morph it more towards an algorithm for dot products...
    //    hi = b*c
    //    lo = fma(b,c, -hi)
    //    next_hi = fma(a,d, hi)
    //    next_lo = lo (?)  that's not right
    // Q: I know how to get the lo part of x*y: that's fma(x,y,-x*y).
    //    But how do I get the lo part of fma(x,y,z)?  I think maybe that's needed for general dot product?
    // A: well, that Dot2 algorithm does the loop as follows (but it seems non-ideal in terms of feedback):
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


  // NOTE: the grid lines don't really look good when big, due to corners.  Hmm.
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



  const populateTheSVG = (svg, Lerp, aIntent, bIntent) => {
    CHECK.NE(bIntent, undefined);

    // TODO: rename
    const a = round_to_nearest_representable(numFractionBits, minExponent, aIntent);
    const b = round_to_nearest_representable(numFractionBits, minExponent, bIntent);

    const theTitlePart2 = document.getElementById("theTitlePart2");
    //theTitlePart2.innerHTML = "  a="+a+" b="+b;
    //theTitlePart2.innerHTML = "  a="+a+"="+toFractionString(a)+"  b="+b+"="+toFractionString(b);
    theTitlePart2.innerHTML = "  a="+toFractionString(a)+"<small><small> ="+a+"</small></small>  b="+toFractionString(b)+"<small><small> ="+b+"</small></small>";

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
    // Upward red, downard green.
    for (let t = 0.; t <= 1.; t = Succ(t)) {
      let thing_circled_in_green = undefined;
      {
        const y = Lerp(a,b,t);

        const ox = relerp(t, ix0,ix1, ox0,ox1);
        const oy = relerp(y, iy0,iy1, oy0,oy1);

        if (y != round_to_nearest_representable(numFractionBits, minExponent, (1-t)*a+t*b)) {
          const circle = document.createElementNS(svgns, "circle");
          circle.setAttributeNS(null, "cx", ""+ox);
          circle.setAttributeNS(null, "cy", ""+oy);
          circle.setAttributeNS(null, "r", "4.5");
          circle.setAttributeNS(null, "fill", "#ffffff01");  // Just a tiny bit of opacity so that tooltip will work
          circle.setAttributeNS(null, "stroke", "green");
          circle.setAttributeNS(null, "stroke-width", "2");
          circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, (1-t)*a+t*b, y));
          circle.onmouseout = evt=>hideTooltip();
          svg.appendChild(circle);
          thing_circled_in_green = y;
        }

        const circle = document.createElementNS(svgns, "circle");
        circle.setAttributeNS(null, "cx", ""+ox);
        circle.setAttributeNS(null, "cy", ""+oy);
        circle.setAttributeNS(null, "r", "1.5");
        circle.setAttributeNS(null, "fill", "green");
        circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, (1-t)*a+t*b, y));
        circle.onmouseout = evt=>hideTooltip();
        svg.appendChild(circle);

      }
      {
        const y = Lerp(b,a,t);

        const ox = relerp(t, ix0,ix1, ox0,ox1);
        const oy = relerp(y, iy0,iy1, oy0,oy1);

        if (y != round_to_nearest_representable(numFractionBits, minExponent, (1-t)*b+t*a)) {
          const circle = document.createElementNS(svgns, "circle");
          circle.setAttributeNS(null, "cx", ""+ox);
          circle.setAttributeNS(null, "cy", ""+oy);
          circle.setAttributeNS(null, "r", "4.5");
          circle.setAttributeNS(null, "fill", "#ffffff01");  // Just a tiny bit of opacity so that tooltip will work
          circle.setAttributeNS(null, "stroke", thing_circled_in_green===y ? "orange" : "red");
          circle.setAttributeNS(null, "stroke-width", "2");
          circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, (1-t)*a+t*b, y));
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
        circle.onmouseover = evt=>showTooltip(evt, makeTheTooltipText(t, (1-t)*b+t*a, y));
        circle.onmouseout = evt=>hideTooltip();
        svg.appendChild(circle);
      }
    }

    if (true) {
      console.log("======");
      //PRINT(Lerp(3/32., 3/4., .5));
      //PRINT(Lerp(3/4., 3/32., .5));

      // with nF=1 minE=-4
      //PRINT(Lerp(1/4., 3/4., 3/16.));
      //PRINT(1*1/4. + (-3/16.)*(1/4.) + (3/16.)*(3/4.));
      //PRINT(DotButImSkeptical([1,-3/16.,3/16.],[1/4.,1/4.,3/4.]));

      // Oh! simpler examples if b=1 ...
      // with nF=1 minE=-10
      // a=1/4 b=1
      // http://localhost:8000/lerp.html?numFractionBits=1&minExponent=-10&a=3/32&b=1
      PRINT(Lerp(1/4., 1., 3/32.));   // DotButImSkeptical says .25=1/4, should be .375=3/8
      PRINT(Lerp(1., 1/4, 3/16.));    // DotButImSkeptical says 1, should be .75

      // Let's debug the first, since increasing a<b is easier to think about
      PRINT(DotButImSkeptical([1,-3/32.,3/32.],[1/4.,1/4.,1.]));

      console.log("======");
    }

    return svg;
  };  // populateTheSVG

  const svg = document.getElementById("theSVG");

  const theTitle = document.getElementById("theTitle");

  const setLerpMethodToMagic = () => {
    Lerp = (a,b,t) => round_to_nearest_representable(numFractionBits, minExponent, (1.-t)*a + t*b);
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
  const setLerpMethodToAlast = () => {
    Lerp = (a,b,t) => Plus(Minus(Times(t,b), Times(t,a)), a);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "b - t*a + a";
  };
  const setLerpMethodToTAlast = () => {
    Lerp = (a,b,t) => Minus(Plus(a,Times(t,b)), Times(t,a));
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
    theTitle.innerHTML = "[1,-t,t] &#8226; [a,a,b] Kahan tweaked";
  };
  const setLerpMethodToAlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([t,-t,1], [b,a,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[t,-t,1] &#8226; [b,a,a] Kahan tweaked";
  };
  const setLerpMethodToTAlastUsingDotSmarter = () => {
    Lerp = (a,b,t) => DotButImSkeptical([1,t,-t], [a,b,a], true);
    populateTheSVG(svg, Lerp, a, b);
    theTitle.innerHTML = "[1,t,-t] &#8226; [a,b,a] Kahan tweaked";
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
  document.getElementById("lerpmethodAlast").onclick = () => setLerpMethodToAlast();
  document.getElementById("lerpmethodTAlast").onclick = () => setLerpMethodToTAlast();
  document.getElementById("lerpmethodTBlastUsingDot").onclick = () => setLerpMethodToTBlastUsingDot();
  document.getElementById("lerpmethodAlastUsingDot").onclick = () => setLerpMethodToAlastUsingDot();
  document.getElementById("lerpmethodTAlastUsingDot").onclick = () => setLerpMethodToTAlastUsingDot();
  document.getElementById("lerpmethodTBlastUsingDotTweaked").onclick = () => setLerpMethodToTBlastUsingDotTweaked();
  document.getElementById("lerpmethodAlastUsingDotTweaked").onclick = () => setLerpMethodToAlastUsingDotTweaked();
  document.getElementById("lerpmethodTAlastUsingDotTweaked").onclick = () => setLerpMethodToTAlastUsingDotTweaked();
  document.getElementById("lerpmethodTBlastUsingDotSmarter").onclick = () => setLerpMethodToTBlastUsingDotSmarter();
  document.getElementById("lerpmethodAlastUsingDotSmarter").onclick = () => setLerpMethodToAlastUsingDotSmarter();
  document.getElementById("lerpmethodTAlastUsingDotSmarter").onclick = () => setLerpMethodToTAlastUsingDotSmarter();

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
    // CBB: clunky order of tests.  We set {x,y}OfPreviousMouseEvent first
    // in case of early return, but then we aren't prepared in case
    // we want to see the actual previous in this function.
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
    if (!draggingA && !draggingB) return;
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
  });

  console.log("    out lerp.js require callback");
});
console.log("out lerp.js")
