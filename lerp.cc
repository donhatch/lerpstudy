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
        if (Float::exactFromDouble(1.-1./tDenominator).toDouble() != 1.-1./tDenominator) {
          //std::cout << "          (skipping tDenominator="<<EXACT(tDenominator)<<")" << std::endl;
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




int main(int, char**) {
  std::cout << "    in main" << std::endl;

  counterexample_search<1>();
  counterexample_search<2>();
  counterexample_search<3>();
  counterexample_search<4>();
  counterexample_search<5>();

  if ((false)) {
    describe_actual_counterexample<float>();
    describe_actual_counterexample<double>();
    describe_actual_counterexample<long double>();

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

  std::cout << std::setw(24) << std::hexfloat << 1./3. << std::endl;
  std::cout << std::setw(24) << std::hexfloat << 1. << std::endl;

  std::cout << std::hexfloat << std::nexttoward(1., (long double)0.) << std::endl;
  std::cout << std::hexfloat << 1. << std::endl;
  std::cout << std::hexfloat << std::nexttoward(1., (long double)2.) << std::endl;

  std::cout << "    out main" << std::endl;
  return 0;
}  // main
