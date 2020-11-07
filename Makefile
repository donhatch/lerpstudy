lerp: lerp.cc Makefile
	clang++ -std=c++2a -fno-inline -O0 -g -W -Wall -Werror lerp.cc -o lerp

FloatTest: FloatTest.cc Float.h macros.h Makefile
	clang++ -std=c++2a -fno-inline -O0 -g -W -Wall -Werror FloatTest.cc -o FloatTest
