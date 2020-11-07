#ifndef _MACROS_H_
#define _MACROS_H_

#include <sstream>

#define CHECK(x) do { if (!(x)) { std::cerr << __FILE__<<"("<<__LINE__<<"): "<<__FUNCTION__<<": CHECK failed: " #x << std::endl << std::flush; abort(); } } while (false)
#define CHECK_RELOP(a,relop,b) do { if (!((a)relop(b))) { std::cerr << __FILE__<<"("<<__LINE__<<"): "<<__FUNCTION__<<": CHECK failed: "<<#a<<" "<<#relop<<" "<<#b<<" where "<<#a<<" is "<<::EXACT(a)<<" and "<<#b<<" is "<<::EXACT(b) << std::endl << std::flush; abort(); } } while (false)
#define CHECK_EQ(a,b) CHECK_RELOP(a,==,b)
#define CHECK_NE(a,b) CHECK_RELOP(a,!=,b)
#define CHECK_LT(a,b) CHECK_RELOP(a,<,b)
#define CHECK_GT(a,b) CHECK_RELOP(a,>,b)
#define CHECK_LE(a,b) CHECK_RELOP(a,<=,b)
#define CHECK_GE(a,b) CHECK_RELOP(a,>=,b)

#define PRINT(x) (std::cout << #x << " = " << EXACT(x) << std::endl)


inline std::string EXACT(int x) {
  std::stringstream ss;
  ss << x;
  return ss.str();
}
inline std::string EXACT(float x) {
  char buf[100];
  snprintf(buf, 100, "%.9g", x);
  return std::string(buf);
}
inline std::string EXACT(double x) {
  char buf[100];
  snprintf(buf, 100, "%.17g", x);
  return std::string(buf);
}
inline std::string EXACT(long double x) {
  char buf[100];
  snprintf(buf, 100, "%.25Lg", x);  // XXX what's the right precision?
  return std::string(buf);
}


#endif  // _MACROS_H_
