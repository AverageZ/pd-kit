/**
 * pdk_test.h — Header-only test macros for Playdate C games
 *
 * Minimal test infrastructure using assert(). No framework, no dependencies.
 * Designed for pure-math modules that compile without the Playdate SDK.
 *
 * Usage:
 *   #include "pdk_test.h"
 *
 *   static void test_something(void) {
 *     PDK_ASSERT(1 + 1 == 2, "basic math");
 *   }
 *
 *   int main(void) {
 *     PDK_TEST_SUITE("My Module Tests");
 *     PDK_TEST_GROUP("arithmetic");
 *     test_something();
 *     PDK_ALL_PASSED();
 *     return 0;
 *   }
 */

#ifndef PDK_TEST_H
#define PDK_TEST_H

#include <assert.h>
#include <stdio.h>

/** Assert with a descriptive message printed on success. */
#define PDK_ASSERT(expr, msg)                                                                      \
    do {                                                                                           \
        assert(expr);                                                                              \
        printf("  PASS: %s\n", (msg));                                                             \
    } while (0)

/** Print a suite header. */
#define PDK_TEST_SUITE(name) printf("=== %s ===\n\n", (name))

/** Print a group/section header. */
#define PDK_TEST_GROUP(name) printf("%s:\n", (name))

/** Print the final success message. */
#define PDK_ALL_PASSED() printf("\n=== All tests passed! ===\n")

#endif /* PDK_TEST_H */
