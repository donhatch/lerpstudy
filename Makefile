TARGETS=SimplerFloatTest lerpvis lerp FloatTest

.PHONY: all
all: $(TARGETS)

clean:; /bin/rm -f $(TARGETS)


# Incompatible:
#   - address and thread
#   - address and memory
#   - thread and memory
SANITIZER=-fsanitize=address,undefined
#SANITIZER=-fsanitize=memory,undefined
#SANITIZER=-fsanitize=thread,undefined

# TODO: figure out what warnings I want. Strangely -Wconversion isn't included in -Wall but it is included in -Weverything:  https://stackoverflow.com/questions/16700569/why-doesnt-clang-or-gcc-flag-this-implicit-conversion-from-double-to-int
# Oh fooey, -Weverything contains a lot of true garbage, such as the idiotic "comparing floating point with == or != is unsafe [-Werror,-Wfloat-equal]"

# opt in...
WARNINGS=-Wextra -Wall -Werror -Wconversion
# opt out...  (work in progress)
#WARNINGS=-Wextra -Wall -Werror -Weverything -Wno-c++98-compat -Wno-float-equal -Wno-old-style-cast

CXXFLAGS=$(SANITIZER) -std=c++2a -fno-inline -O0 -g $(WARNINGS) -fno-omit-frame-pointer

lerp: lerp.cc macros.h Makefile
	clang++ $(CXXFLAGS) lerp.cc -o lerp

lerpvis: lerpvis.cc macros.h Makefile
	clang++ $(CXXFLAGS) lerpvis.cc -o lerpvis

FloatTest: FloatTest.cc Float.h macros.h Makefile
	clang++ $(CXXFLAGS) FloatTest.cc -o FloatTest

SimplerFloatTest: SimplerFloatTest.cc SimplerFloat.h macros.h Makefile
	clang++ $(CXXFLAGS) SimplerFloatTest.cc -o SimplerFloatTest

send_lerpstudy_to_donhatchsw:
	/bin/rm -rf /tmp/lerpstudy_scratch
	mkdir -p /tmp/lerpstudy_scratch/lerpstudy
	cp lerp.html /tmp/lerpstudy_scratch/lerpstudy/index.html
	cp lerp.js /tmp/lerpstudy_scratch/lerpstudy
	cp lerp-favicon.png /tmp/lerpstudy_scratch/lerpstudy
	cp require.js /tmp/lerpstudy_scratch/lerpstudy
	cp registerSourceCodeLinesAndRequire.js /tmp/lerpstudy_scratch/lerpstudy
	cp MyURLSearchOrHashParams.js /tmp/lerpstudy_scratch/lerpstudy
	cp PRINT.js /tmp/lerpstudy_scratch/lerpstudy
	cp CHECK.js /tmp/lerpstudy_scratch/lerpstudy
	cp STRINGIFY.js /tmp/lerpstudy_scratch/lerpstudy
	cp sourceCodeLines.js /tmp/lerpstudy_scratch/lerpstudy
	cp text.js /tmp/lerpstudy_scratch/lerpstudy
	cp getStackTrace.js /tmp/lerpstudy_scratch/lerpstudy
	rsync -vv -r /tmp/lerpstudy_scratch/lerpstudy donhatch@donhatchsw.com:public_html/.
