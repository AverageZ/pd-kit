# Makefile — pd-kit standalone targets
#
# pd-kit doesn't build a standalone binary — games compile its sources
# directly. This Makefile provides test and utility targets.

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
