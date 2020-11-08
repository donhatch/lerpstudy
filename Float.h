#ifndef FLOAT_H_
#define FLOAT_H_

#include "macros.h"

#include <cmath>
#include <cstdint>
#include <iostream>

template<typename BitsType>  // a signed integer type, typically int64
class Float {
 public:
 using bits_type = BitsType;

  static Float<BitsType> fromBits(int nf, int ne, BitsType bits) {
    return Float<BitsType>(nf, ne, bits);
  }
  static Float<BitsType> fromValue(int nf, int ne, double value) {
    return fromBits(nf, ne, double2bits(nf, ne, value));
  }
  double toDouble() const {
    return bits2double(nf_, ne_, bits_);
  }
  std::string debugString() const {
    std::stringstream ss;
    ss << "(";
    ss << "signbit="<<signbit();
    ss << " ";
    ss << "ebits="<<ebits();
    ss << " ";
    ss << "fbits="<<fbits();
    if (ebits() == 0) {
      if (fbits() == 0) {
        ss << (signbit()==1 ? " -zero" : " zero");
      } else {
        ss << " subnormal";
      }
    } else if (ebits() == ((BitsType)1<<ne_)-1) {
    }
    ss << ")";
    return ss.str();
  }

  int nf() const { return nf_; }  // num fraction bits
  int ne() const { return ne_; }  // num exponent bits
  BitsType bits() const { return bits_; }
  BitsType signbit() const { return (bits()>>(ne()+nf())) & (BitsType)1; }
  BitsType ebits() const { return (bits()>>nf()) & ((BitsType)((BitsType)1<<ne())-(BitsType)1); }
  BitsType fbits() const { return bits() & ((BitsType)((BitsType)1<<nf())-(BitsType)1); }
 private:
  Float(int num_fraction_bits, int num_exponent_bits, BitsType bits) : nf_(num_fraction_bits), ne_(num_exponent_bits), bits_(bits) {}
  const int nf_;  // num fraction bits
  const int ne_;  // num exponent bits
  BitsType bits_;

  // Utilities
  static double bits2double(int nf, int ne, BitsType bits) {
    const int verbose_level = 0;
    if (verbose_level >= 1) std::cout << "    in bits2double(ne="<<ne<<", nf="<<nf<<", bits="<<bits<<")" << std::endl;
    CHECK((int)sizeof(BitsType)*8 >= 1+ne+nf);
    const BitsType signbit = (bits >> (ne+nf)) & (BitsType)1;
    const BitsType ebits = (bits>>nf) & ((BitsType)((BitsType)1<<ne)-(BitsType)1);
    const BitsType fbits = bits & ((BitsType)((BitsType)1<<nf)-(BitsType)1);
    if (ebits == 0) {
      if (fbits == 0) {
        return signbit==1 ? -0. : 0.;
      } else {
        // subnormal
        const BitsType Emin = -((BitsType)((BitsType)1<<(ne-1))-(BitsType)2);  // 5 -> -14,  4 -> -6, 3 -> -2, 2 -> 0
        return (double)fbits / (double)(1 << nf) / (double)(1 << -Emin);  // TODO: int overflow?
      }
    } else if (ebits == ~(BitsType)0) {
      if (fbits == 0) {
        return signbit==1 ? 1./-0. : 1./0.;  // -infinity or +infinity
      } else {
        return std::nan("");  // TODO: wtf is this arg? https://en.cppreference.com/w/cpp/numeric/math/nan
      }
    }

    CHECK(ne >= 2);
    const BitsType Emax = (BitsType)((BitsType)1<<(ne-1))-(BitsType)1;     // 5 -> 15, 4 -> 7,  3 -> 3,  2 -> 1
    BitsType exponent = ebits - Emax;
    const double fraction = fbits / (double)((BitsType)1<<nf);
    CHECK(0. <= fraction);
    CHECK(fraction < 1.);
    const double mantissa = 1. + fraction;
    double answer = mantissa;
    if (exponent > 0) answer *= (1<<exponent);  // TODO: int overflow?
    else if (exponent < 0) answer /= (1<<-exponent);  // TODO: int overflow?
    if (signbit != 0) answer = -answer;
    if (verbose_level >= 1) std::cout << "    out bits2double(ne="<<ne<<", nf="<<nf<<", bits="<<bits<<"), returning "<<EXACT(answer) << std::endl;
    return answer;
  }  // bits2double
  static BitsType double2bits(int nf, int ne, const double value) {
    CHECK((int)sizeof(BitsType)*8 >= 1+ne+nf);
    // TODO: so far, assumes not denormalized
    if (value != value) {
      return (((BitsType)1<<ne)-1)<<nf;  // exponent all 1's: NaN
    }
    if (value == 0.) {
      if (1./value < 0.) {
        return (BitsType)1 << (ne+nf);  // -infinity
      } else {
        return (BitsType)0;  // +infinity
      }
    }
    if (value < 0.) {
      BitsType absanswer = double2bits(nf, ne, value);
      return absanswer | ((BitsType)1 << (ne+nf));
    }

    int exponent = 0;  // TODO: should be BitsType?  think about overflow?
    double mantissa = value;
    while (mantissa < 1.) {
      exponent--;
      mantissa *= 2;
    }
    while (mantissa >= 2.) {
      exponent++;
      mantissa *= .5;
    }

    // What are the min and max expressible exponents?
    // https://en.wikipedia.org/wiki/Half-precision_floating-point_format
    CHECK(ne >= 2);
    const BitsType Emin = -(((BitsType)1<<(ne-1))-2);  // 5 -> -14,  4 -> -6, 3 -> -2, 2 -> 0
    const BitsType Emax = ((BitsType)1<<(ne-1))-1;     // 5 -> 15,   4 -> 7,  3 -> 3,  2 -> 1
    if (exponent < Emin) {
      return (BitsType)0;
    }
    if (exponent > Emax) {
      // +infinity
      return (BitsType)(~((BitsType)1<<(ne+nf)));
    }
    const BitsType ebits = exponent + Emax;
    // TODO: need to deal with ties correctly!!
    const BitsType fbits = (int) ((mantissa-1.) * (((BitsType)1)<<nf));
    return (ebits<<nf) | fbits;
  }  // double2bits
};  // class Float<BitsType>

template<int NF, int NE, typename BitsType>
class FloatTemplated : public Float<BitsType> {
 private:
  using super = Float<BitsType>;
 public:
  FloatTemplated(double value) : super(super::fromValue(NF, NE, value)) {}
  static FloatTemplated fromBits(BitsType bits) {
    return super::fromBits(NF, NE, bits);
  }
 private:
  FloatTemplated(const super &f) : super(f) {
    CHECK(super::nf() == NF);
    CHECK(super::ne() == NE);
  }
};  // class FloatTemplated<NF,NE,BitsType>

using s2e3 = FloatTemplated<2,3,int16_t>;
using s2e2 = FloatTemplated<2,2,int16_t>;

#endif  // FLOAT_H_
