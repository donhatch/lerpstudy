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

#include <cmath>
#include <ios>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>

//namespace {

template<int FractionBits>
class PositiveFloat {
 public:
  explicit PositiveFloat(double x) : x_(x) {
    CHECK(is_representable(x));
  }
  PositiveFloat(const PositiveFloat<FractionBits> &that) : x_(that.x_) {}
  PositiveFloat &operator=(const PositiveFloat<FractionBits> &that) { x_ = that.x_; return *this; }
  double toDouble() const { return x_; }
  bool operator==(const PositiveFloat<FractionBits> &that) const { return x_ == that.x_; }
  bool operator!=(const PositiveFloat<FractionBits> &that) const { return x_ != that.x_; }
  bool operator<(const PositiveFloat<FractionBits> &that) const { return x_ < that.x_; }
  bool operator<=(const PositiveFloat<FractionBits> &that) const { return x_ <= that.x_; }
  bool operator>(const PositiveFloat<FractionBits> &that) const { return x_ > that.x_; }
  bool operator>=(const PositiveFloat<FractionBits> &that) const { return x_ >= that.x_; }

  PositiveFloat<FractionBits> pred() const {
    return PositiveFloat<FractionBits>(pred(x_));
  }
  PositiveFloat<FractionBits> succ() const {
    return PositiveFloat<FractionBits>(succ(x_));
  }

  static PositiveFloat<FractionBits> round_up(double x) {
    return PositiveFloat<FractionBits>(round_up_to_representable(x));
  }
  static PositiveFloat<FractionBits> round_down(double x) {
    return PositiveFloat<FractionBits>(round_down_to_representable(x));
  }
  static PositiveFloat<FractionBits> round_to_even(double x) {
    return PositiveFloat<FractionBits>(round_to_even_representable(x));
  }

  PositiveFloat<FractionBits> operator+(const PositiveFloat<FractionBits> &that) const { return round_to_even(this->x_ + that.x_); }
  PositiveFloat<FractionBits> operator-(const PositiveFloat<FractionBits> &that) const {
    if (*this <= that) {
      std::cerr << "OH NO!  Tried to subtract "<<EXACT((*this).toDouble())<<"-"<<EXACT(that.toDouble())<<" !" << std::endl;
      abort();
    }
    return round_to_even(this->x_ - that.x_);
  }
  PositiveFloat<FractionBits> operator*(const PositiveFloat<FractionBits> &that) const { return round_to_even(this->x_ * that.x_); }
  PositiveFloat<FractionBits> operator/(const PositiveFloat<FractionBits> &that) const { return round_to_even(this->x_ / that.x_); }

  double x_;


  // BEGIN STATIC UTILITIES
  static double round_up_to_power_of_2(double x) {
    CHECK(x > 0.);
    double answer = 1.;
    if (x >= 1.) {
      while (answer < x) answer *= 2.;
    } else {
      while (answer >= 2*x) answer /= 2.;
    }
    CHECK(.5*answer < x);
    CHECK(x <= answer);
    CHECK(answer < 2*x);
    return answer;
  }
  static double round_down_to_power_of_2(double x) {
    CHECK(x > 0.);
    double answer = 1.;
    if (x >= 1.) {
      while (2*answer <= x) answer *= 2.;
    } else {
      while (answer > x) answer /= 2.;
    }
    CHECK(.5*x < answer);
    CHECK(answer <= x);
    CHECK(x < 2*answer);
    return answer;
  }

  static bool is_representable(double x) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "            in is_representable("<<EXACT(x)<<")" << std::endl;
    if (!(x > 0.)) return false;
    if (x+1. == x) return false;  // infinite or too big
    const double lo = round_down_to_power_of_2(x);
    if (verbose_level >= 1) std::cout << "              lo = "<<EXACT(lo) << std::endl;
    const double hi = round_up_to_power_of_2(x);
    if (verbose_level >= 1) std::cout << "              hi = "<<EXACT(hi) << std::endl;
    const double quantum = (hi-lo) / (1<<FractionBits);
    if (verbose_level >= 1) std::cout << "              quantum = "<<EXACT(quantum) << std::endl;
    for (int i = 0; i < (1<<FractionBits); ++i) {
      if (lo + i*quantum == x) {
        if (verbose_level >= 1) std::cout << "            out is_representable("<<EXACT(x)<<"), returning true because found it" << std::endl;
        return true;
      }
    }
    if (verbose_level >= 1) std::cout << "            out is_representable("<<EXACT(x)<<"), returning false at bottom" << std::endl;
    return false;
  }

  static double round_down_to_representable(double x) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "            in round_down_to_representable("<<EXACT(x)<<")" << std::endl;
    const double scale = (double)(1<<FractionBits) / round_down_to_power_of_2(x);
    const double answer = std::floor(x*scale)/scale;
    if (verbose_level >= 1) std::cout << "            out round_down_to_representable("<<EXACT(x)<<"), returning "<<EXACT(answer) << std::endl;
    CHECK_LE(answer, x);
    CHECK(is_representable(answer));
    return answer;
  }
  static double round_up_to_representable(double x) {
    const double scale = (double)(1<<FractionBits) / round_down_to_power_of_2(x);
    const double answer = std::ceil(x*scale)/scale;
    CHECK_GE(answer, x);
    CHECK(is_representable(answer));
    return answer;
  }
  static double round_to_even_representable(double x) {
    // Note: in the case of FractionBits=0, we always round up.  I'm not sure this makes sense.
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "            in round_to_even_representable("<<EXACT(x)<<")" << std::endl;
    const double scale = (double)(1<<FractionBits) / round_down_to_power_of_2(x);
    const int lo = (int)std::floor(x*scale);
    const int hi = (int)std::ceil(x*scale);
    if (verbose_level >= 1) std::cout << "              lo = "<<EXACT(lo) << std::endl;
    if (verbose_level >= 1) std::cout << "              hi = "<<EXACT(hi) << std::endl;
    if (verbose_level >= 1) std::cout << "              lo/scale = "<<EXACT(lo/scale) << std::endl;
    if (verbose_level >= 1) std::cout << "              hi/scale = "<<EXACT(hi/scale) << std::endl;
    double answer;
    if (lo == hi) {
      answer = lo/scale;
    } else {
      CHECK_EQ(lo+1, hi);
      const double mid = (lo+hi)/2.;
      if (x*scale < mid) {
        if (verbose_level >= 1) std::cout << "              closer to lo" << std::endl;
        answer = lo/scale;
      } else if (x*scale > mid) {
        if (verbose_level >= 1) std::cout << "              closer to hi" << std::endl;
        answer = hi/scale;
      } else if (lo % 2 == 0) {
        if (verbose_level >= 1) std::cout << "              lo is even so choosing lo" << std::endl;
        answer = lo/scale;
      } else {
        if (verbose_level >= 1) std::cout << "              lo is odd so choosing hi" << std::endl;
        answer = hi/scale;
      }
    }
    if (verbose_level >= 1) std::cout << "            out round_to_even_representable("<<EXACT(x)<<"), returning "<<EXACT(answer) << std::endl;
    CHECK(is_representable(answer));
    return answer;
  }  // round_to_even_representable

  static double pred(double x) {
    CHECK(is_representable(x));
    const double hi = round_up_to_power_of_2(x);
    const double lo = hi / 2.;
    const double quantum = (hi-lo) / (1<<FractionBits);
    const double answer = x - quantum;
    CHECK(is_representable(answer));
    CHECK(!is_representable((x+answer)/2.));
    return answer;
  }
  static double succ(double x) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "            in succ("<<EXACT(x)<<")" << std::endl;
    CHECK(is_representable(x));
    const double lo = round_down_to_power_of_2(x);
    const double hi = lo * 2.;
    const double quantum = (hi-lo) / (1<<FractionBits);
    const double answer = x + quantum;
    if (verbose_level >= 1) std::cout << "              answer = "<<EXACT(answer) << std::endl;
    CHECK(is_representable(answer));
    CHECK(!is_representable((x+answer)/2.));
    if (verbose_level >= 1) std::cout << "            out succ("<<EXACT(x)<<"), returning "<<EXACT(answer) << std::endl;
    return answer;
  }
  // END STATIC UTILITIES
};  // class PositiveFloat<FractionBits>

template<int FractionBits, int MinExponent>
class SimpleFloat {
 public:
  explicit SimpleFloat(double x) : x_(x) {
    CHECK(is_representable(x));
  }

  SimpleFloat(const SimpleFloat<FractionBits,MinExponent> &that) : x_(that.x_) {}
  SimpleFloat &operator=(const SimpleFloat<FractionBits,MinExponent> &that) { x_ = that.x_; return *this; }
  double toDouble() const { return x_; }
  bool operator==(const SimpleFloat<FractionBits,MinExponent> &that) const { return x_ == that.x_; }
  bool operator!=(const SimpleFloat<FractionBits,MinExponent> &that) const { return x_ != that.x_; }
  bool operator<(const SimpleFloat<FractionBits,MinExponent> &that) const { return x_ < that.x_; }
  bool operator<=(const SimpleFloat<FractionBits,MinExponent> &that) const { return x_ <= that.x_; }
  bool operator>(const SimpleFloat<FractionBits,MinExponent> &that) const { return x_ > that.x_; }
  bool operator>=(const SimpleFloat<FractionBits,MinExponent> &that) const { return x_ >= that.x_; }

  SimpleFloat<FractionBits,MinExponent> pred() const {
    return SimpleFloat<FractionBits,MinExponent>(pred(x_));
  }
  SimpleFloat<FractionBits,MinExponent> succ() const {
    return SimpleFloat<FractionBits,MinExponent>(succ(x_));
  }

  static SimpleFloat<FractionBits,MinExponent> round_up(double x) {
    return SimpleFloat<FractionBits,MinExponent>(round_up_to_representable(x));
  }
  static SimpleFloat<FractionBits,MinExponent> round_down(double x) {
    return SimpleFloat<FractionBits,MinExponent>(round_down_to_representable(x));
  }
  static SimpleFloat<FractionBits,MinExponent> round_to_even(double x) {
    return SimpleFloat<FractionBits,MinExponent>(round_to_even_representable(x));
  }

  SimpleFloat<FractionBits,MinExponent> operator+(const SimpleFloat<FractionBits,MinExponent> &that) const { return round_to_even(this->x_ + that.x_); }
  SimpleFloat<FractionBits,MinExponent> operator-(const SimpleFloat<FractionBits,MinExponent> &that) const { return round_to_even(this->x_ - that.x_); }
  SimpleFloat<FractionBits,MinExponent> operator*(const SimpleFloat<FractionBits,MinExponent> &that) const { return round_to_even(this->x_ * that.x_); }
  SimpleFloat<FractionBits,MinExponent> operator/(const SimpleFloat<FractionBits,MinExponent> &that) const { return round_to_even(this->x_ / that.x_); }

  double x_;

  // BEGIN STATIC UTILITIES
  static bool is_representable(double x) {
    if (!(x == x)) return false;  // NaN
    if (x+1. == x) return false;  // infinite or too big
    if (x == 0.) return true;
    if (!PositiveFloat<FractionBits>::is_representable(std::abs(x))) return false;
    return true;
  }
  static double round_down_to_representable(double x) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "                    in round_down_to_representable("<<EXACT(x)<<")" << std::endl;
    CHECK_EQ(x, x);  // not NaN
    CHECK_NE(x+1., x); // not infinite or too big
    if (x == 0.) return x;
    if (x < 0.) return -round_up_to_representable(-x);
    const double answer_maybe = PositiveFloat<FractionBits>::round_down_to_representable(x);
    double subnormalMax =  std::exp2(MinExponent);
    if (verbose_level >= 1) std::cout << "                      subnormalMax = "<<EXACT(subnormalMax) << std::endl;
    if (answer_maybe >= subnormalMax) {
      if (verbose_level >= 1) std::cout << "                    out round_down_to_representable("<<EXACT(x)<<"), normal, returning "<<EXACT(answer_maybe) << std::endl;
      CHECK_LE(answer_maybe, x);
      return answer_maybe;
    } else {
      // The range [0..subnormalMax] is divided into 2^FractionBits parts.
      const double answer = std::floor((x / subnormalMax) * std::exp2(FractionBits)) * std::exp2(-FractionBits) * subnormalMax;
      if (verbose_level >= 1) std::cout << "                    out round_down_to_representable("<<EXACT(x)<<"), subnormal, returning "<<EXACT(answer) << std::endl;
      CHECK_LE(answer, x);
      return answer;
    }
  }
  static double round_up_to_representable(double x) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "                    in round_up_to_representable("<<EXACT(x)<<")" << std::endl;
    CHECK_EQ(x, x);  // not NaN
    CHECK_NE(x+1., x); // not infinite or too big
    if (x == 0.) return x;
    if (x < 0.) return -round_down_to_representable(-x);
    const double answer_maybe = PositiveFloat<FractionBits>::round_up_to_representable(x);
    const double subnormalMax =  std::exp2(MinExponent);
    if (verbose_level >= 1) std::cout << "                      subnormalMax = "<<EXACT(subnormalMax) << std::endl;
    if (answer_maybe >= subnormalMax) {
      if (verbose_level >= 1) std::cout << "                    out round_up_to_representable("<<EXACT(x)<<"), normal, returning "<<EXACT(answer_maybe) << std::endl;
      CHECK_GE(answer_maybe, x);
      CHECK(is_representable(answer_maybe));
      return answer_maybe;
    } else {
      // The range [0..subnormalMax] is divided into 2^FractionBits parts.
      const double answer = std::ceil((x / subnormalMax) * std::exp2(FractionBits)) * std::exp2(-FractionBits) * subnormalMax;
      if (verbose_level >= 1) std::cout << "                    out round_up_to_representable("<<EXACT(x)<<"), subnormal, returning "<<EXACT(answer) << std::endl;
      CHECK_GE(answer, x);
      CHECK(is_representable(answer));
      return answer;
    }
  }
  static double round_to_even_representable(double x) {
    CHECK_EQ(x, x);  // not NaN
    CHECK_NE(x+1., x); // not infinite or too big
    if (x == 0.) return x;
    if (x < 0.) return -round_to_even_representable(-x);
    const double lo = round_down_to_representable(x);
    const double hi = round_up_to_representable(x);
    if (lo == hi) return lo;
    // One of lo,hi is "more even".  Which?
    double loscratch = lo;
    double hiscratch = hi;
    while (loscratch == (int)loscratch && hiscratch == (int)hiscratch) {
      loscratch /= 2.;
      hiscratch /= 2;
    }
    while (loscratch != (int)loscratch && hiscratch != (int)hiscratch) {
      loscratch *= 2.;
      hiscratch *= 2.;
    }
    CHECK((loscratch == (int)loscratch) != (hiscratch == (int)hiscratch));
    if (loscratch == (int)loscratch) {
      return lo;
    } else {
      return hi;
    }
  }

  static double pred(double x) {
    CHECK(is_representable(x));
    const double answer = -succ(-x);
    CHECK_LT(answer, x);
    CHECK(is_representable(answer));
    CHECK_EQ(round_down_to_representable((x+answer)/2.), answer);
    CHECK_EQ(round_up_to_representable((x+answer)/2.), x);
    return answer;
  }
  static double succ(double x) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "            in succ("<<EXACT(x)<<")" << std::endl;
    CHECK(is_representable(x));

    // Find a number tiny enough so that round_down_to_representable(x+tiny) == x
    double tiny = 1.;
    while (round_down_to_representable(x+tiny) != x) {
      if (verbose_level >= 1) std::cout << "              tiny "<<EXACT(tiny)<<"->"<<EXACT(tiny/2.) << std::endl;
      tiny /= 2.;
    }
    CHECK_GT(x+tiny, x);
    const double answer = round_up_to_representable(x+tiny);
    if (verbose_level >= 1) std::cout << "            out succ("<<EXACT(x)<<"), returning "<<EXACT(answer) << std::endl;
    CHECK_GT(answer, x);
    CHECK_EQ(round_down_to_representable((x+answer)/2.), x);
    CHECK_EQ(round_up_to_representable((x+answer)/2.), answer);
    return answer;
  }
  // END STATIC UTILITIES
};  // class SimpleFloat<FractionBits,MinExponent>


template<int FractionBits>
std::string EXACT(const PositiveFloat<FractionBits> &x) {
  return ::EXACT(x.toDouble());
}

template<int FractionBits, int MinExponent>
std::string EXACT(const SimpleFloat<FractionBits,MinExponent> &x) {
  return ::EXACT(x.toDouble());
}


template<int FractionBits>
void positive_float_unit_test() {
  std::cout << "        in positive_float_unit_test<FractionBits="<<FractionBits<<">" << std::endl;
  using Float = PositiveFloat<FractionBits>;

  if (FractionBits >= 1) {  // these don't hold for FractionBits==0, since round of 1.5 is 2, not 1
    Float one = Float(1.);
    CHECK_EQ((one+one.succ())/Float(2.), one);
    CHECK_EQ((one.succ()+one.succ().succ())/Float(2.), one.succ().succ());
    CHECK_EQ((one+one.pred())/Float(2.), one);
    CHECK_EQ((one.pred()+one.pred().pred())/Float(2.), one.pred().pred());
  }

  const Float min = Float(1./4.);
  const Float max = Float(4.);
  for (Float x = min; x <= max; x = x.succ()) {
    std::cout << "              "<<::EXACT(x.toDouble()) << std::endl;
    const Float next = x.succ();
    if (next < max) {
      std::cout << "                  "
                <<::EXACT((x.toDouble()+next.toDouble())/2.)
                <<": "
                <<::EXACT(Float::round_down((x.toDouble()+next.toDouble())/2.).toDouble())
                <<" "
                <<::EXACT(Float::round_to_even((x.toDouble()+next.toDouble())/2.).toDouble())
                <<" "
                <<::EXACT(Float::round_up((x.toDouble()+next.toDouble())/2.).toDouble())
                << std::endl;
    }

    CHECK_NE(x.succ(), x);
    CHECK_NE(x.pred(), x);
    CHECK_EQ(x.succ().pred(), x);
    CHECK_EQ(x.pred().succ(), x);
  }

  std::cout << "        out positive_float_unit_test<FractionBits="<<FractionBits<<">" << std::endl;
}

template<int FractionBits, int MinExponent>
void simple_float_unit_test() {
  std::cout << "        in simple_float_unit_test<FractionBits="<<FractionBits<<", MinExponent="<<MinExponent<<">" << std::endl;
  using Float = SimpleFloat<FractionBits, MinExponent>;

  if (FractionBits >= 1) {  // these don't hold for FractionBits==0, since round of 1.5 is 2, not 1
    Float one = Float(1.);
    // First repeat the PositiveFloat ones...
    CHECK_EQ((one+one.succ())/Float(2.), one);
    CHECK_EQ((one.succ()+one.succ().succ())/Float(2.), one.succ().succ());
    CHECK_EQ((one+one.pred())/Float(2.), one);
    CHECK_EQ((one.pred()+one.pred().pred())/Float(2.), one.pred().pred());
  }


  const Float min = Float(-4.);
  const Float max = Float(4.);

  for (Float x = min; x <= max; x = x.succ()) {
    //std::cout << "              =================" << std::endl;  // uncomment when verbose_level is turned on in various sub-functions
    std::cout << "              "<<::EXACT(x.toDouble()) << std::endl;
    const Float next = x.succ();
    if (next < max) {
    }
  }
  std::cout << "        out simple_float_unit_test<FractionBits="<<FractionBits<<", MinExponent="<<MinExponent<<">" << std::endl;
}

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
  using Float = PositiveFloat<FractionBits>;

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
        if (Float::round_to_even(1.-1./tDenominator).toDouble() != 1.-1./tDenominator) {
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
  const T a = std::nexttoward((T)1., (T)0.);
  const T b = std::nexttoward((T)1., (T)2.);
  std::cout << "          a = "<<::EXACT(a) << std::endl;
  std::cout << "          b = "<<::EXACT(b) << std::endl;
  std::cout << "          1.-a = "<<::EXACT((T)1.-a) << std::endl;
  std::cout << "          b-1. = "<<::EXACT(b-(T)1.) << std::endl;
  std::cout << "          (1.-a)/eps = "<<::EXACT((T)((T)1.-a)/eps) << std::endl;
  std::cout << "          (b-1.)/eps = "<<::EXACT((T)(b-(T)1.)/eps) << std::endl;
  CHECK(b-1. == eps);
  CHECK(1.-a == eps/2.);
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
  using Float = PositiveFloat<FractionBits>;

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



//}  // namespace

int main(int, char**) {
  std::cout << "    in main" << std::endl;

  positive_float_unit_test<0>();
  positive_float_unit_test<1>();
  positive_float_unit_test<2>();

  // FractionBits=2,MinExponent=-1 is the picture in https://en.wikipedia.org/wiki/Denormal_number
  simple_float_unit_test<0,-1>();
  simple_float_unit_test<1,-1>();
  simple_float_unit_test<2,-1>();

  exit(5);

  counterexample_search<1>();
  counterexample_search<2>();
  counterexample_search<3>();
  counterexample_search<4>();
  counterexample_search<5>();

  if (false) {
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

  std::cout << std::hexfloat << std::nexttoward(1., 0.) << std::endl;
  std::cout << std::hexfloat << 1. << std::endl;
  std::cout << std::hexfloat << std::nexttoward(1., 2.) << std::endl;

  std::cout << "    out main" << std::endl;
  return 0;
}  // main
