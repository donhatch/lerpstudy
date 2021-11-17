// Question: what's the best formulation of lerp?
// Contenders:
//      a + (a-b)*t
//        Pro: more type-meaningful
//        Con: lerp(a,b,1) may not equal b
//      (1-t)*a + t*b
//        Con: less type-meaningful
//        Pro: lerp(a,b,1) == b always
//        Con: I'm not convinced it's monotonic in t.
//             In fact, it's definitely *not* monotonic in t if t is allowed to go outside the range [0,1].
//             But even if it's required to stay in that range, might it still not be monotonic?
// 
// Q: Is it monotonic for t in [0,1]?  If not, what's the simplest example where it's not?

// FractionBits=0 means ...,1/2,1,2,...
// FractionBits=1 means ...,1/2,3/4,1,3/2,2,...
// FractionBits=2 means ...,1/2,5/8,3/4,7/8,1,5/4,3/2,7/4,2,...

#include "macros.h"
#include "SimplerFloat.h"

#include <ios>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>


// Search for t,a such that (1-t)*a + t*a != a, and 0<=t<=1.
// It finds something!!
/*
        in counterexample_search<FractionBits=1>
          t=0.375 a=0.25 passed
          t=0.375 a=0.375 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=0.5 passed
          t=0.375 a=0.75 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=1 passed
          t=0.375 a=1.5 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=2 passed
          t=0.375 a=3 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=4 passed
        in counterexample_search<FractionBits=2>
          t=0.625 a=0.25 passed
          t=0.625 a=0.3125 passed
          t=0.625 a=0.375 passed
          t=0.625 a=0.4375 FAILED!!!!!!!!!!!!!!!!!
          t=0.625 a=0.5 passed
          t=0.625 a=0.625 passed
          t=0.625 a=0.75 passed
          t=0.625 a=0.875 FAILED!!!!!!!!!!!!!!!!!
          t=0.625 a=1 passed
          t=0.625 a=1.25 passed
          t=0.625 a=1.5 passed
          t=0.625 a=1.75 FAILED!!!!!!!!!!!!!!!!!
          t=0.625 a=2 passed
          t=0.625 a=2.5 passed
          t=0.625 a=3 passed
          t=0.625 a=3.5 FAILED!!!!!!!!!!!!!!!!!
          t=0.625 a=4 passed
          t=0.4375 a=0.25 passed
          t=0.4375 a=0.3125 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=0.375 passed
          t=0.4375 a=0.4375 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=0.5 passed
          t=0.4375 a=0.625 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=0.75 passed
          t=0.4375 a=0.875 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=1 passed
          t=0.4375 a=1.25 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=1.5 passed
          t=0.4375 a=1.75 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=2 passed
          t=0.4375 a=2.5 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=3 passed
          t=0.4375 a=3.5 FAILED!!!!!!!!!!!!!!!!!
          t=0.4375 a=4 passed
          t=0.375 a=0.25 passed
          t=0.375 a=0.3125 passed
          t=0.375 a=0.375 passed
          t=0.375 a=0.4375 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=0.5 passed
          t=0.375 a=0.625 passed
          t=0.375 a=0.75 passed
          t=0.375 a=0.875 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=1 passed
          t=0.375 a=1.25 passed
          t=0.375 a=1.5 passed
          t=0.375 a=1.75 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=2 passed
          t=0.375 a=2.5 passed
          t=0.375 a=3 passed
          t=0.375 a=3.5 FAILED!!!!!!!!!!!!!!!!!
          t=0.375 a=4 passed
          t=0.3125 a=0.25 passed
          t=0.3125 a=0.3125 FAILED!!!!!!!!!!!!!!!!!
          t=0.3125 a=0.375 passed
          t=0.3125 a=0.4375 passed
          t=0.3125 a=0.5 passed
          t=0.3125 a=0.625 FAILED!!!!!!!!!!!!!!!!!
          t=0.3125 a=0.75 passed
          t=0.3125 a=0.875 passed
          t=0.3125 a=1 passed
          t=0.3125 a=1.25 FAILED!!!!!!!!!!!!!!!!!
          t=0.3125 a=1.5 passed
          t=0.3125 a=1.75 passed
          t=0.3125 a=2 passed
          t=0.3125 a=2.5 FAILED!!!!!!!!!!!!!!!!!
          t=0.3125 a=3 passed
          t=0.3125 a=3.5 passed
          t=0.3125 a=4 passed
*/
template<int FractionBits>
void counterexample_search() {
  std::cout << "        in counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
  using Float = SimplerFloatTemplated<FractionBits, -4>;

  if (false) {
    for (Float t = Float(1.).pred(); t >= Float(1./4); t = t.pred()) {
      for (Float a = Float(1./4); a <= Float(4.); a = a.succ()) {
        std::cout << "          t="<<EXACT(t.toDouble())<<" a="<<EXACT(a.toDouble())<<" ";
        const Float should_be_a = (Float(1.)-t)*a + t*a;
        if ((Float(1.)-t).toDouble() == 1.-t.toDouble()) {
          std::cout << "(t is well behaved) ";
        } else {
          std::cout << "(t is not well behaved) ";
        }
        if (should_be_a == a) {
          std::cout << "passed";
        } else {
          std::cout << "FAILED!!!!!!!!!!!!!!!!!";
        }
        std::cout << std::endl;
      }
    }
  }
  if (true) {
    const Float one = Float(1.);
    for (Float a = Float(1.); a <= Float(16); a = a.succ())  // TRYING ALL A
    //for (Float a = Float(2.); a.toDouble() <= 257.; a = (a-one)*Float(2.)+one)  // TRYING SEARCHING JUST ABOVE A POWER OF 2.  hmm, doesn't find anything!  I guess it's monotonic?
    //for (Float a = Float(3.); a.toDouble() <= 257.; a = (a-Float(2.))*Float(2.)+Float(2.))  // TRYING SEARCHING TWO ABOVE A POWER OF 2.
    //for (Float a = Float(4.); a.toDouble() <= 257.; a = (a-Float(3.))*Float(2.)+Float(3.))  // TRYING SEARCHING THREE ABOVE A POWER OF 2.
    {
      for (int tDenominator = 2; tDenominator <= 16; tDenominator *= 2) {
        // use this dDenominator only if 1-1/tDenominator is exactly representable
        if ((Float(1.)-Float(1.)/Float(tDenominator)).toDouble() != 1.-1./tDenominator) {
          std::cout << "          (skipping tDenominator="<<EXACT(tDenominator)<<" late)" << std::endl;
          continue;
        }

        std::cout << "          a="<<EXACT(a.toDouble())<<" tDenominator="<<::EXACT(tDenominator)<<": ";
        bool monotonic = true;  // until proven otherwise
        Float prev = Float(1.);  // arbitrary
        for (int tNumerator = 0; tNumerator <= tDenominator; ++tNumerator) {
          if (tNumerator == 0) {
            std::cout << " "<<tNumerator<<"/"<<tDenominator<<"->"<<EXACT(a.toDouble());
            prev = a;
          } else if (tNumerator==tDenominator) {
            const Float t = Float(tNumerator)/Float(tDenominator);
            std::cout << " "<<tNumerator<<"/"<<tDenominator<<"->"<<EXACT((t*a).toDouble());
          } else {
            const Float t = Float(tNumerator)/Float(tDenominator);
            std::cout << " "<<tNumerator<<"/"<<tDenominator<<"->"<<EXACT(((one-t)*a+t*a).toDouble());
            if ((one-t)*a+t*a < prev) {
              //std::cout << "  (HEY! "<<EXACT((one-t)*a+t*a)<<"<"<<EXACT(prev)<<")";
              monotonic = false;
            }
            prev = (one-t)*a+t*a;
          }
        }
        if (!monotonic) {
          std::cout << "  NOT MONOTONIC!";
        }

        std::cout << std::endl;
      }
      //if (((a-Float(3.))*Float(2.)+Float(3.)).toDouble() != (a.toDouble()-3.)*2.+3.) {
        //break;
      //}
    }
  }
  std::cout << "        out counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
}  // counterexample_search

template<typename T>
void describe_actual_counterexample()
{
  std::cout << "        in describe_actual_counterexample" << std::endl;
  std::cout << "          sizeof(t) == "<<sizeof(T) << std::endl;
  std::cout << "          typeid(T).name() == "<<typeid(T).name() << std::endl;
  const T eps = std::numeric_limits<T>::epsilon();
  const T a = std::nexttoward((T)1., (long double)0.);
  const T b = std::nexttoward((T)1., (long double)2.);
  std::cout << "          a = "<<::EXACT(a) << std::endl;
  std::cout << "          b = "<<::EXACT(b) << std::endl;
  std::cout << "          1.-a = "<<::EXACT((T)1.-a) << std::endl;
  std::cout << "          b-1. = "<<::EXACT(b-(T)1.) << std::endl;
  std::cout << "          (1.-a)/eps = "<<::EXACT((T)((T)1.-a)/eps) << std::endl;
  std::cout << "          (b-1.)/eps = "<<::EXACT((T)(b-(T)1.)/eps) << std::endl;
  CHECK(b-(T)1. == eps);
  CHECK((T)1.-a == eps/(T)2.);
  const T should_be_a = (T)((T)(3/8.)*a) + (T)((T)(5/8.)*a);
  std::cout << "          should_be_a = 3/8.*a + 5/8.*a = "<<::EXACT(should_be_a) << std::endl;
  std::cout << "          1.-should_be_a = "<<::EXACT((T)1.-should_be_a) << std::endl;
  std::cout << "          (1.-should_be_a)/eps = "<<EXACT(((T)1.-should_be_a)/eps) << std::endl;
  std::cout << "        out describe_actual_counterexample" << std::endl;
}  // describe_actual_counterexample

// Search for a counterexample to:  a<b,  a+1/2(b-a) <= b-1/2(b-a)
// DID NOT FIND!  Confirms.
// WAIT! actually *did* find.  Argh.  So, need to weaken it
// to the method described in the math.stackexchange answer below.
template<int FractionBits>
void another_counterexample_search() {
  std::cout << "        in another_counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
  using Float = SimplerFloatTemplated<FractionBits, -2>;

  Float min = Float(1./4);
  Float max = Float(4.);

  for (Float a = min; a <= max; a = a.succ()) {
    for (Float b = a.succ(); b <= max; b = b.succ()) {
      Float half = Float(.5);
      if (false) {
        // This finds something, but it's not quite convincing.
        if (a+half*(b-a) <= b-half*(b-a)) {
          //std::cout << "          a="<<EXACT(a)<<" b="<<EXACT(b);
          //std::cout << " good";
          //std::cout << std::endl;
        } else {
          std::cout << "          a="<<EXACT(a.toDouble())<<" b="<<EXACT(b.toDouble());
          std::cout << " BAD!";
          std::cout << std::endl;
        }
        //CHECK(a+half*(b-a) <= b-half*(b-a));
      } else {
        // https://math.stackexchange.com/questions/907327/accurate-floating-point-linear-interpolation#answer-1798323
        // Hmm, seems to work.  Magic.
        if (a+half.pred()*(b-a) <= b-half*(b-a)) {
        } else {
          std::cout << "          a="<<EXACT(a.toDouble())<<" b="<<EXACT(b.toDouble());
          std::cout << " BAD!";
          std::cout << std::endl;
        }
      }
    }
  }
  std::cout << "        out another_counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
}

// Search for a counterexample to Kahan's 2x2 determinant (or dot) algorithm that uses FMA
//    bc_hi = b*c
//    bc_lo = fma(b,c, -bc_hi)
//    answer_hi = fma(a,d, bc_hi)   // although answer_hi might be a misnomer
//    answer = answer_hi + bc_lo = fma(a,d, bc_hi) + fma(b,c, -bc_hi)
// oh this is absurd, there is a whole paper on this, it does *not* claim to be exact!  https://www.ams.org/journals/mcom/2013-82-284/S0025-5718-2013-02679-8/S0025-5718-2013-02679-8.pdf
template<int FractionBits>
void dot2x2_counterexample_search() {
  std::cout << "        in dot2x2_counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
  using Float = SimplerFloatTemplated<FractionBits, -2>;

  //const Float min = Float(1./4);
  //const Float max = Float(4.);

  //const Float min = Float(1./2);
  //const Float max = Float(2.);

  const Float min = Float(1.);
  const Float max = Float(2.);

  for (Float a = min; a <= max; a = a.succ()) {
    for (Float b = min; b <= max; b = b.succ()) {
      for (Float c = b; c <= max; c = c.succ()) {
        for (Float d = a; d <= max; d = d.succ()) {
          // Same sign ad+bc...
          if (true) {
            const Float bc_hi = b*c;
            const Float bc_lo = Float::fma(b,c, -bc_hi);
            const Float answer_hi = Float::fma(a,d, bc_hi);  // might be a misnomer
            const Float answer = answer_hi + bc_lo;
            std::cout << "======" << std::endl;
            PRINT(a);
            PRINT(b);
            PRINT(c);
            PRINT(d);
            PRINT(a.toDouble()*d.toDouble());
            PRINT(b.toDouble()*c.toDouble());
            PRINT(bc_hi);
            PRINT(bc_lo);
            PRINT(bc_hi.toDouble()+bc_lo.toDouble());
            CHECK_EQ(bc_hi.toDouble()+bc_lo.toDouble(), b.toDouble()*c.toDouble());
            PRINT(a*d);
            PRINT(b*c);
            PRINT(a.toDouble()*d.toDouble()+b.toDouble()*c.toDouble());

            CHECK_EQ(answer.toDouble(), Float::nearestFromDouble(a.toDouble()*d.toDouble()+b.toDouble()*c.toDouble()).toDouble());
            CHECK_EQ(answer, Float::nearestFromDouble(a.toDouble()*d.toDouble()+b.toDouble()*c.toDouble()));  // same thing, I think
          }
          // Opposite sign ad-bc...
          if (false) {
            const Float bc_hi = b*c;
            const Float bc_lo = Float::fma(b,c, -bc_hi);
            const Float answer_hi = Float::fma(a,d, -bc_hi);
            const Float answer = answer_hi - bc_lo;
            CHECK_EQ(answer.toDouble(), Float::nearestFromDouble(a.toDouble()*d.toDouble()-b.toDouble()*c.toDouble()).toDouble());
            CHECK_EQ(answer, Float::nearestFromDouble(a.toDouble()*d.toDouble()-b.toDouble()*c.toDouble()));  // same thing, I think
          }
        }
      }
    }
  }
  std::cout << "        out dot2x2_counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
}  // third_counterexample_search


// Conj:
//    for all x, pred(1)*x = pred(x)
//    for all y, succ(1)*x = succ(x)
//    for all x,y, pred(x)*y = pred(x*y) = x*pred(y)
//    for all x,y, succ(x)*y = succ(x*y) = x*succ(y)
// WOOPS WRONG.  Especially for the succ part:
//    1-- * 1+  == 1  (not 1- as predicted)
// the pred part might be true, though.
// 
template<int FractionBits>
void yet_another_counterexample_search() {
  std::cout << "        in yet_another_counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
  using Float = SimplerFloatTemplated<FractionBits, -10>;


  if (true) {
    Float one = Float(1);
    Float half = Float(.5);
    Float quarter = Float(.25);
    Float eighth = Float(.125);
    PRINT(one);
    PRINT(half);
    PRINT(quarter);
    PRINT(eighth);
    // comments are assuming fractionbits=3 minexponent=-2
    PRINT(one.succ());  // 1.125
    PRINT(one.pred());  // 0.9375
    PRINT(one.pred()*half);  // 0.46875
    PRINT(half.pred());  // 0.46875

    PRINT(one.pred()*quarter);  // 0.25
    PRINT(quarter.pred());  // 0.21875  = 7/32  huh, yeah, it's the exponent

    PRINT(one.pred()*eighth);  // 0.125
    PRINT(eighth.pred());  // 0.09375

    PRINT(one.pred() * one.succ());
    PRINT(one.pred().pred() * one.succ());
    PRINT(one.pred().pred().pred() * one.succ());
  }
  if (true) {
    std::cout << "          1d search" << std::endl;

    Float min = Float(1./4);
    Float max = Float(4.);
    for (Float x = max; x >= min; x = x.pred())
    //for (Float x = min; x <= max; x = x.succ())
    {
      std::cout << "              x = "<<EXACT(x) << std::endl;
      CHECK_EQ(Float(1).pred()*x, x.pred());
      //CHECK_EQ(Float(1).succ()*x, x.succ());
    }
  }

  if (false) {
    std::cout << "          2d search" << std::endl;
    Float min = Float(1./4);
    Float max = Float(4.);
    for (Float b = max; b >= min; b = b.pred()) {
      for (Float a = b; a >= min; a = a.pred()) {
        if (a.pred()*b == (a*b).pred()) {
          std::cout << "          a="<<EXACT(a.toDouble())<<" b="<<EXACT(b.toDouble());
          std::cout << " good";
          std::cout << std::endl;
        } else {
          std::cout << "          a="<<EXACT(a.toDouble())<<" b="<<EXACT(b.toDouble());
          std::cout << " BAD!";
          std::cout << std::endl;
        }
      }
    }
  }

  std::cout << "        out yet_another_counterexample_search<FractionBits="<<FractionBits<<">" << std::endl;
}


int main(int, char**) {
  std::cout << "    in main" << std::endl;
  std::cout << "      "<<DEBUG(std::numeric_limits<float>::epsilon()) << std::endl;
  std::cout << "      "<<DEBUG(std::numeric_limits<double>::epsilon()) << std::endl;
  std::cout << "      "<<DEBUG(std::log2(std::numeric_limits<float>::epsilon())) << std::endl;
  std::cout << "      "<<DEBUG(std::log2(std::numeric_limits<double>::epsilon())) << std::endl;

  if (false) {
    //dot2x2_counterexample_search<0>();
    //dot2x2_counterexample_search<1>();
    dot2x2_counterexample_search<2>();
    dot2x2_counterexample_search<3>();
    dot2x2_counterexample_search<4>();
    dot2x2_counterexample_search<5>();
    dot2x2_counterexample_search<6>();
    return 33;
  }

  if (false) {
    counterexample_search<1>();
    counterexample_search<2>();
    counterexample_search<3>();
    counterexample_search<4>();
    counterexample_search<5>();
  }

  if (false) {
    describe_actual_counterexample<float>();
    describe_actual_counterexample<double>();
    describe_actual_counterexample<long double>();
  }

  if (false) {  // ran these, didn't find anything
    another_counterexample_search<1>();
    another_counterexample_search<2>();
    another_counterexample_search<4>();
    another_counterexample_search<5>();
    another_counterexample_search<6>();
    another_counterexample_search<7>();
    another_counterexample_search<8>();
    another_counterexample_search<9>();
    another_counterexample_search<10>();
    another_counterexample_search<11>();
  }

  if (true) {
    yet_another_counterexample_search<2>();
  }

  std::cout << std::setw(24) << std::hexfloat << 1./3. << std::endl;
  std::cout << std::setw(24) << std::hexfloat << 1. << std::endl;

  std::cout << std::hexfloat << std::nexttoward(1., (long double)0.) << std::endl;
  std::cout << std::hexfloat << 1. << std::endl;
  std::cout << std::hexfloat << std::nexttoward(1., (long double)2.) << std::endl;

  std::cout << "    out main" << std::endl;
  return 0;
}  // main
