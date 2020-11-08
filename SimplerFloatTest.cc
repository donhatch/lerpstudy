#include "SimplerFloat.h"

int main(int, char**) {
  std::cout << "    in main" << std::endl;

  // FractionBits=2,MinExponent=-1 is the picture in https://en.wikipedia.org/wiki/Denormal_number
  simpler_float_unit_test(0, -1);
  simpler_float_unit_test(1, -1);
  simpler_float_unit_test(2, -1);

  std::cout << "    out main" << std::endl;
  return 0;
}
