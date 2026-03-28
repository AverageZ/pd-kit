# Makefile — pd-kit standalone targets
#
# pd-kit doesn't build a standalone binary — games compile its sources
# directly. This Makefile provides test and utility targets.

# SDK detection (needed for include paths in tests that use SDK types)
SDK ?= ${PLAYDATE_SDK_PATH}
ifeq ($(SDK),)
	SDK = $(shell egrep '^\s*SDKRoot' ~/.Playdate/config | head -n 1 | cut -c9-)
endif

# ── Unit tests (no Playdate SDK needed) ─────────────────────────────
# Compiles pure-math modules + test files with your system compiler.
.PHONY: test
test:
	@mkdir -p build
	cc -std=c11 -Wall -Wextra -I src -I include test/test_crank.c src/pdk_crank.c -lm -o build/test_crank
	./build/test_crank
	cc -std=c11 -Wall -Wextra -I src -I include test/test_pbt.c src/pbt.c -o build/test_pbt
	./build/test_pbt

.PHONY: clean
clean:
	rm -rf build
