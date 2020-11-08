/*
  plot 'SCRATCH1.gp' using 1:2 ps 5, 'SCRATCH1.gp' using 1:3, 'SCRATCH1.gp' using 1:4
*/
#include "SimplerFloat.h"

namespace {

using Float = SimplerFloat;  // TODO: just change the name

void dumpAll(const int numFractionBits, const int minExponent, const int maxExponent) {
  std::cerr << "        in dumpAll("<<DBG(numFractionBits)<<" "<<DBG(minExponent)<<" "<<DBG(maxExponent)<<")" << std::endl;


  const auto MakeFloat = [&numFractionBits, &minExponent](double x) { return Float::exactFromDouble(numFractionBits, minExponent, x); };

  const Float min = MakeFloat(-std::exp2(maxExponent));
  const Float max = MakeFloat(std::exp2(maxExponent));
  const Float zero = MakeFloat(0.);
  const Float one = MakeFloat(1.);

  for (Float y = min; y <= max; y = y.succ()) {
    for (Float x = zero; x <= one; x = x.succ()) {
      std::cout << EXACT(x)<<" "<<EXACT(y) << std::endl;
    }
    std::cout << std::endl;
  }
  std::cerr << "        out dumpAll("<<DBG(numFractionBits)<<" "<<DBG(minExponent)<<" "<<DBG(maxExponent)<<")" << std::endl;
}

void dumpLerp(const int numFractionBits, const int minExponent, const int /*maxExponent*/, const double a_, const double b_) {

  const auto MakeFloat = [&numFractionBits, &minExponent](double x) { return Float::exactFromDouble(numFractionBits, minExponent, x); };
  const Float one = MakeFloat(1.);
  const Float a = MakeFloat(a_);
  const Float b = MakeFloat(b_);

  for (Float t = MakeFloat(0.); t <= MakeFloat(1.); t = t.succ()) {
    if (t != one-(one-t)) continue;  // hmm, this does make it nicer I think

    if (false) {
      Float y = (one-t)*a + t*b;
      Float y0 = (one-t)*a;
      Float y1 = t*b;
      std::cout << EXACT(t)<<" "<<EXACT(y0)<<" "<<EXACT(y1)<<" "<<EXACT(y) << std::endl;
      // challenging case: 2 -12 0 .875 .875
    } else {
      Float y0 = a + (b-a)*t;
      //PRINT(a);
      //PRINT((b-a)*t);
      //PRINT(y0);

      Float y1 = b - (b-a)*(one-t);
      Float y = t.toDouble() < 0.5 ? y0 : y1;
      std::cout << EXACT(t)<<" "<<EXACT(y0)<<" "<<EXACT(y1)<<" "<<EXACT(y) << std::endl;
      // challenging case: when does it not hit b exactly?  that's when b is small and a is big.
      // 2 -2 0 1 .0625
    }
  }
}

}  // namespace

int main(const int argc, char**const argv) {
  std::cerr << "    in main" << std::endl;

  if (argc != 4 && argc != 6) {
    std::cerr << "Usage: lerpvis <numFractionBits> <minExponent> <maxExponent> [<a> <b>]" << std::endl;
    std::cerr << "Example: lerpvis 2 -2 2" << std::endl;
    std::cerr << "Example: lerpvis 2 -2 2 .875 .875" << std::endl;
    return 1;
  }
  const int numFractionBits = atoi(argv[1]);
  const int minExponent = atoi(argv[2]);
  const int maxExponent = atoi(argv[3]);

  if (argc == 4) {
    dumpAll(numFractionBits, minExponent, maxExponent);
  } else {
    CHECK_EQ(argc, 6);
    const double a = atof(argv[4]);
    const double b = atof(argv[5]);
    dumpLerp(numFractionBits, minExponent, maxExponent, a, b);
  }

  std::cerr << "    out main" << std::endl;
  return 0;
}  // main
