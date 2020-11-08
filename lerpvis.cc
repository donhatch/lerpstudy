#include "SimplerFloat.h"

namespace {

void dumpAll(int numFractionBits, int minExponent, int maxExponent) {
  std::cerr << "        in dumpAll("<<DBG(numFractionBits)<<" "<<DBG(minExponent)<<" "<<DBG(maxExponent)<<")" << std::endl;

  const auto MakeFloat = [&numFractionBits, &minExponent](double x) { return SimplerFloat::exactFromDouble(numFractionBits, minExponent, x); };

  const SimplerFloat min = MakeFloat(-std::exp2(maxExponent));
  const SimplerFloat max = MakeFloat(std::exp2(maxExponent));
  PRINT(min);
  PRINT(min.succ());

  for (SimplerFloat y = min; y <= max; y = y.succ()) {
    for (SimplerFloat x = min; x <= max; x = x.succ()) {
      std::cout << EXACT(x)<<" "<<EXACT(y) << std::endl;
    }
    std::cout << std::endl;
  }
  std::cerr << "        out dumpAll("<<DBG(numFractionBits)<<" "<<DBG(minExponent)<<" "<<DBG(maxExponent)<<")" << std::endl;
}

}  // namespace

int main(const int argc, char**const argv) {
  std::cerr << "    in main" << std::endl;

  if (argc != 4) {
    std::cerr << "Usage: lerpvis <numFractionBits> <minExponent> <maxExponent>" << std::endl;
    std::cerr << "Example: lerpvis 2 -2 2" << std::endl;
    return 1;
  }
  const int numFractionBits = atoi(argv[1]);
  const int minExponent = atoi(argv[2]);
  const int maxExponent = atoi(argv[3]);

  dumpAll(numFractionBits, minExponent, maxExponent);

  std::cerr << "    out main" << std::endl;
  return 0;
}  // main
