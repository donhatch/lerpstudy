#include "Float.h"

#include <iostream>
#include <sstream>
#include <string_view>

int main(int, char **) {
  std::cout << "    in main" << std::endl;

  //using F = s0e3;
  //std::string_view Fname = "s0e3";

  //using F = s1e3;
  //std::string_view Fname = "s1e3";

  using F = s2e3;
  std::string_view Fname = "s2e3";

  for (int i = 0; i <= 100; ++i) {
    std::cout << "          i = "<<i << std::endl;
    const F f = F::fromBits(i);
    CHECK_EQ(f.bits(), i);
    std::cout << "              "<<f.debugString() << std::endl;
    std::cout << "              "<<Fname<<"::fromBits("<<i<<").toDouble() = "<<EXACT(F::fromBits(i).toDouble()) << std::endl;
  }

  std::cout << "    out main" << std::endl;
}
