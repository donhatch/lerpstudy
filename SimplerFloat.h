#ifndef SIMPLER_FLOAT_
#define SIMPLER_FLOAT_

#include <cmath>
#include <iostream>

class SimplerFloatUtils {
 public:
  // Returns [rounded_down, rounded_to_nearest_ties_to_even, rounded_up]

  static void round_to_representable(int numFractionBits, int minExponent, double x,
                                     double *return_rounded_down,
                                     double *return_rounded_to_nearest_ties_to_even,
                                     double *return_rounded_up) {
    // firstThreshold is the first place where quantum changes
    const double firstThreshold = std::exp2(minExponent+1.);
    // Doesn't matter whether <= or <, since if we're exactly on a power of 2 then either way works
    const double numZooms = (std::abs(x) <= firstThreshold ? 0 :
        std::ceil(std::log2(std::abs(x) / firstThreshold)));
    const double scale = std::exp2(numZooms + numFractionBits);
    const double X = x*scale;
    // CBB: if we want *only* lo or only hi, then this does an unnecessary floor or ceil call
    const double Lo = std::floor(X);
    const double Hi = std::ceil(X);
    if (return_rounded_down != nullptr) *return_rounded_down = Lo/scale;
    if (return_rounded_up != nullptr) *return_rounded_up = Hi/scale;
    if (return_rounded_to_nearest_ties_to_even != nullptr) {
      if (Lo == Hi) {
        *return_rounded_to_nearest_ties_to_even = Lo/scale;
      } else {
        CHECK_EQ(Lo+1., Hi);
        double Mid = (Lo + Hi) / 2.;
        *return_rounded_to_nearest_ties_to_even = X<Mid ? Lo/scale :
                                                  X>Mid ? Hi/scale :
                                                  (int)Lo%2==0 ? Lo/scale : Hi/scale;

      }
    }
  }  // round_to_representable
  static double round_down(int numFractionBits, int minExponent, double x) {
    double answer;
    round_to_representable(numFractionBits, minExponent, x, &answer, nullptr, nullptr);
    return answer;
  }
  static double round_to_nearest_ties_to_even(int numFractionBits, int minExponent, double x) {
    double answer;
    round_to_representable(numFractionBits, minExponent, x, nullptr, &answer, nullptr);
    return answer;
  }
  static double round_up(int numFractionBits, int minExponent, double x) {
    double answer;
    round_to_representable(numFractionBits, minExponent, x, nullptr, nullptr, &answer);
    return answer;
  }
  static bool is_representable(int numFractionBits, int minExponent, double x) {
    return round_down(numFractionBits, minExponent, x) == x;
  }

  static double pred_without_checking_against_succ(int numFractionBits, int minExponent, double x) {
    if (x < 0.) {
      return -succ_without_checking_against_pred(numFractionBits, minExponent, -x);
    }
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "                in pred_without_checking_against_succ("<<DBG(numFractionBits)<<", "<<DBG(minExponent)<<", "<<DBG(x)<<")" << std::endl;
    CHECK(is_representable(numFractionBits, minExponent, x));
    // firstThreshold is the first place where quantum changes
    const double firstThreshold = std::exp2(minExponent+1.);
    if (verbose_level >= 1) std::cout << "                  "<<DEBUG(firstThreshold) << std::endl;
    // if we are exactly on a power of 2, we should choose the smaller section
    const double numZooms = (x <= firstThreshold ? 0 :
        std::ceil(std::log2(x / firstThreshold)));
    if (verbose_level >= 1) std::cout << "                  "<<DEBUG(numZooms) << std::endl;
    const double scale = std::exp2(numZooms + numFractionBits);
    if (verbose_level >= 1) std::cout << "                  "<<DEBUG(scale) << std::endl;
    const double answer = (x*scale - 1) / scale;
    CHECK_LT(answer, x);
    CHECK(is_representable(numFractionBits, minExponent, answer));
    CHECK(!is_representable(numFractionBits, minExponent, (answer+x)/2.));
    if (verbose_level >= 1) std::cout << "                out pred_without_checking_against_succ("<<DBG(numFractionBits)<<", "<<DBG(minExponent)<<", "<<DBG(x)<<"), returning "<<EXACT(answer) << std::endl;
    return answer;
  }
  static double succ_without_checking_against_pred(int numFractionBits, int minExponent, double x) {
    if (x < 0.) {
      return -pred_without_checking_against_succ(numFractionBits, minExponent, -x);
    }
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "                in succ_without_checking_against_pred("<<DBG(numFractionBits)<<", "<<DBG(minExponent)<<", "<<DBG(x)<<")" << std::endl;
    CHECK(is_representable(numFractionBits, minExponent, x));
    // firstThreshold is the first place where quantum changes
    const double firstThreshold = std::exp2(minExponent+1.);
    if (verbose_level >= 1) std::cout << "                  "<<DEBUG(firstThreshold) << std::endl;
    // if we are exactly on a power of 2, we should choose the larger section
    const double numZooms = (x < firstThreshold ? 0 :
        std::floor(std::log2(x / firstThreshold)+1.));
    if (verbose_level >= 1) std::cout << "                  "<<DEBUG(numZooms) << std::endl;
    const double scale = std::exp2(numZooms + numFractionBits);
    if (verbose_level >= 1) std::cout << "                  "<<DEBUG(scale) << std::endl;
    const double answer = (x*scale + 1) / scale;
    CHECK_GT(answer, x);
    CHECK(is_representable(numFractionBits, minExponent, answer));
    CHECK(!is_representable(numFractionBits, minExponent, (x+answer)/2.));
    if (verbose_level >= 1) std::cout << "                out succ_without_checking_against_pred("<<DBG(numFractionBits)<<", "<<DBG(minExponent)<<", "<<DBG(x)<<"), returning "<<EXACT(answer) << std::endl;
    return answer;
  }
  static double pred(int numFractionBits, int minExponent, double x) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "            in pred("<<DBG(numFractionBits)<<", "<<DBG(minExponent)<<", "<<DBG(x)<<")" << std::endl;
    const double answer = pred_without_checking_against_succ(numFractionBits, minExponent, x);
    //CHECK_EQ(succ_without_checking_against_pred(numFractionBits, minExponent, answer), x);
    if (verbose_level >= 1) std::cout << "            out pred("<<DBG(numFractionBits)<<", "<<DBG(minExponent)<<", "<<DBG(x)<<"), returning "<<EXACT(answer) << std::endl;
    return answer;
  }
  static double succ(int numFractionBits, int minExponent, double x) {
    const double answer = succ_without_checking_against_pred(numFractionBits, minExponent, x);
    CHECK_EQ(pred_without_checking_against_succ(numFractionBits, minExponent, answer), x);
    return answer;
  }
};  // SimplerFloatUtils

// forward decl
std::string EXACT(const class SimplerFloat &x);

class SimplerFloat {
 public:
  static SimplerFloat exactFromDouble(int numFractionBits, int minExponent, double x) {
    // constructor will fail if not exactly representable
    return SimplerFloat(numFractionBits, minExponent, x);
  }
  static SimplerFloat nearestFromDouble(int numFractionBits, int minExponent, double x) {
    return SimplerFloat(numFractionBits, minExponent, SimplerFloatUtils::round_to_nearest_ties_to_even(numFractionBits, minExponent, x));
  }
  static SimplerFloat roundDownFromDouble(int numFractionBits, int minExponent, double x) {
    return SimplerFloat(numFractionBits, minExponent, SimplerFloatUtils::round_down(numFractionBits, minExponent, x));
  }
  static SimplerFloat roundUpFromDouble(int numFractionBits, int minExponent, double x) {
    return SimplerFloat(numFractionBits, minExponent, SimplerFloatUtils::round_up(numFractionBits, minExponent, x));
  }

  SimplerFloat(const SimplerFloat &that)
    : numFractionBits_(that.numFractionBits_), minExponent_(that.minExponent_), x_(that.x_) {}
  SimplerFloat &operator=(const SimplerFloat &that) {
    CheckCompatible(that);
    x_ = that.x_;
    return *this;
  }
  double toDouble() const { return x_; }
  bool operator==(const SimplerFloat &that) const { CheckCompatible(that); return x_ == that.x_; }
  bool operator!=(const SimplerFloat &that) const { CheckCompatible(that); return x_ != that.x_; }
  bool operator<(const SimplerFloat &that) const { CheckCompatible(that); return x_ < that.x_; }
  bool operator<=(const SimplerFloat &that) const { CheckCompatible(that); return x_ <= that.x_; }
  bool operator>(const SimplerFloat &that) const { CheckCompatible(that); return x_ > that.x_; }
  bool operator>=(const SimplerFloat &that) const { CheckCompatible(that); return x_ >= that.x_; }

  SimplerFloat pred() const {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "        in SimplerFloat::pred("<<DBG(x_)<<")" << std::endl;

    SimplerFloat answer = exactFromDouble(numFractionBits_, minExponent_, SimplerFloatUtils::pred(numFractionBits_, minExponent_, x_));
    if (verbose_level >= 1) std::cout << "          "<<DEBUG(answer) << std::endl;
    if (verbose_level >= 1) std::cout << "          "<<DEBUG(answer.x_) << std::endl;
    if (verbose_level >= 1) std::cout << "        out SimplerFloat::pred("<<DBG(x_)<<"), returning "<<EXACT(answer) << std::endl;
    return answer;
  }
  SimplerFloat succ() const {
    return exactFromDouble(numFractionBits_, minExponent_, SimplerFloatUtils::succ(numFractionBits_, minExponent_, x_));
  }

  SimplerFloat operator+(const SimplerFloat &that) const {
    CheckCompatible(that); return nearestFromDouble(numFractionBits_, minExponent_, x_ + that.x_); }
  SimplerFloat operator-(const SimplerFloat &that) const {
    CheckCompatible(that); return nearestFromDouble(numFractionBits_, minExponent_, x_ - that.x_); }
  SimplerFloat operator*(const SimplerFloat &that) const {
    CheckCompatible(that); return nearestFromDouble(numFractionBits_, minExponent_, x_ * that.x_); }
  SimplerFloat operator/(const SimplerFloat &that) const {
    CheckCompatible(that);
    // SimplerFloat has no Inf or NaN, so don't allow dividing by 0.
    CHECK_NE(that.x_, 0.);
    return nearestFromDouble(numFractionBits_, minExponent_, x_ / that.x_);
  }

  int numFractionBits() { return numFractionBits_; }
  int minExponent() { return minExponent_; }

 private:
  explicit SimplerFloat(int numFractionBits, int minExponent, double x) : numFractionBits_(numFractionBits), minExponent_(minExponent), x_(x) {
    CHECK(SimplerFloatUtils::is_representable(numFractionBits_, minExponent_, x_));
  }
  void CheckCompatible(const SimplerFloat &that) const {
    CHECK_EQ(numFractionBits_, that.numFractionBits_);
    CHECK_EQ(minExponent_, that.minExponent_);
  }
  int numFractionBits_;
  int minExponent_;
  double x_;
};  // SimplerFloat


std::string EXACT(const SimplerFloat &x) {
  return EXACT(x.toDouble());
}

static void simpler_float_unit_test(const int numFractionBits, const int minExponent) {
  std::cout << "        in simpler_float_unit_test(numFractionBits="<<numFractionBits<<", minExponent="<<minExponent<<")" << std::endl;

  using Float = SimplerFloat;
  auto MakeFloat = [&numFractionBits, &minExponent](double x) { return SimplerFloat::exactFromDouble(numFractionBits, minExponent, x); };
  auto RoundDown = [&numFractionBits, &minExponent](double x) { return SimplerFloat::roundDownFromDouble(numFractionBits, minExponent, x); };
  auto RoundToNearest = [&numFractionBits, &minExponent](double x) { return SimplerFloat::nearestFromDouble(numFractionBits, minExponent, x); };
  auto RoundUp = [&numFractionBits, &minExponent](double x) { return SimplerFloat::roundUpFromDouble(numFractionBits, minExponent, x); };

  if (numFractionBits >= 1) {  // these don't hold for numFractionBits==0, since round of 1.5 is 2, not 1
    Float zero = MakeFloat(0.);
    Float one = MakeFloat(1.);
    PRINT(zero);
    PRINT(zero.pred());
    PRINT(zero.succ());
    PRINT(one);
    PRINT(one.pred());
    PRINT(one.succ());
    CHECK_GT(one.succ(), one);
    CHECK_LT(one.pred(), one);
    CHECK_EQ((one+one.succ())/MakeFloat(2.), one);
    CHECK_EQ((one.succ()+one.succ().succ())/MakeFloat(2.), one.succ().succ());
    CHECK_EQ((one+one.pred())/MakeFloat(2.), one);
    CHECK_EQ((one.pred()+one.pred().pred())/MakeFloat(2.), one.pred().pred());
  }

  const Float min = MakeFloat(-4.);
  const Float max = MakeFloat(4.);

  for (Float x = min; x <= max; x = x.succ()) {
    //std::cout << "              =================" << std::endl;  // uncomment when verbose_level is turned on in various sub-functions
    std::cout << "              "<<::EXACT(x.toDouble()) << std::endl;
    const Float next = x.succ();
    if (next <= max) {
      const double mid = (x.toDouble()+next.toDouble())/2.;
      std::cout << "                  "
                <<::EXACT(mid)
                <<" rounded down,even,up: "
                <<::EXACT(RoundDown(mid).toDouble())
                <<" "
                <<::EXACT(RoundToNearest(mid).toDouble())
                <<" "
                <<::EXACT(RoundUp(mid).toDouble())
                << std::endl;
      CHECK_EQ(RoundDown(mid), x);
      CHECK_EQ(RoundUp(mid), next);
    }

    CHECK_NE(x.succ(), x);
    CHECK_NE(x.pred(), x);
    CHECK_EQ(x.succ().pred(), x);
    CHECK_EQ(x.pred().succ(), x);
  }
  std::cout << "        out simpler_float_unit_test(numFractionBits="<<numFractionBits<<", minExponent="<<minExponent<<")" << std::endl;
}


template<int NumFractionBits, int MinExponent>
class SimplerFloatTemplated : public SimplerFloat {
 private:
  using super = SimplerFloat;
 public:
  // TODO: kill this, make caller say exactFromDouble? not sure
  SimplerFloatTemplated(double x) : super(super::exactFromDouble(NumFractionBits, MinExponent, x)) {}
  SimplerFloatTemplated(const SimplerFloatTemplated &that) : super(that) {}
  static SimplerFloatTemplated nearestFromDouble(double x) {
    return super::nearestFromDouble(NumFractionBits, MinExponent, x);
  }
  static SimplerFloatTemplated exactFromDouble(double x) {
    return super::exactFromDouble(NumFractionBits, MinExponent, x);
  }
  // This is needed in order to say `Float x = y.pred();`
  // (although I could wrap all of them I guess?)
  SimplerFloatTemplated(const super &f) : super(f) {
    CHECK(super::numFractionBits() == NumFractionBits);
    CHECK(super::minExponent() == MinExponent);
  }
};  // class SimplerFloatTemplated<NumFractionBits, MinExponent>

#endif  // SIMPLER_FLOAT_
