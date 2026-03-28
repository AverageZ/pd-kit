/**
 * test_pbt.c — Self-tests for the property-based testing library.
 *
 * Verifies that generators produce values in range and that pbt_check
 * catches a known-bad property.
 */

#include <assert.h>
#include <stdio.h>

#include "pbt.h"

/* ── Generator range tests ────────────────────────────────────────── */

static void test_pbt_int_range(void) {
    PBTRng rng = pbt_rng_seed(42);
    for (int i = 0; i < 10000; i++) {
        int val = pbt_int(&rng, -5, 10);
        assert(val >= -5 && val <= 10);
    }
    printf("  PASS: pbt_int stays in range\n");
}

static void test_pbt_float_range(void) {
    PBTRng rng = pbt_rng_seed(123);
    for (int i = 0; i < 10000; i++) {
        float val = pbt_float(&rng, -1.0f, 1.0f);
        assert(val >= -1.0f && val <= 1.0f);
    }
    printf("  PASS: pbt_float stays in range\n");
}

static void test_pbt_enum_range(void) {
    PBTRng rng = pbt_rng_seed(999);
    for (int i = 0; i < 10000; i++) {
        int val = pbt_enum(&rng, 5);
        assert(val >= 0 && val < 5);
    }
    printf("  PASS: pbt_enum stays in range\n");
}

static void test_pbt_bool_values(void) {
    PBTRng rng = pbt_rng_seed(7);
    int saw_zero = 0, saw_one = 0;
    for (int i = 0; i < 1000; i++) {
        int val = pbt_bool(&rng);
        assert(val == 0 || val == 1);
        if (val == 0)
            saw_zero = 1;
        if (val == 1)
            saw_one = 1;
    }
    assert(saw_zero && saw_one);
    printf("  PASS: pbt_bool produces both 0 and 1\n");
}

/* ── Determinism test ─────────────────────────────────────────────── */

static void test_deterministic(void) {
    PBTRng rng1 = pbt_rng_seed(12345);
    PBTRng rng2 = pbt_rng_seed(12345);
    for (int i = 0; i < 100; i++) {
        assert(pbt_int(&rng1, 0, 1000) == pbt_int(&rng2, 0, 1000));
    }
    printf("  PASS: same seed → same sequence\n");
}

/* ── pbt_check: passing property ──────────────────────────────────── */

static int prop_always_true(PBTRng *rng, void *ctx) {
    (void)rng;
    (void)ctx;
    PBT_PASS;
}

static void test_check_passing(void) {
    int result = pbt_check("always true", prop_always_true, NULL, 100);
    assert(result == 0);
    printf("  PASS: pbt_check returns 0 for passing property\n");
}

/* ── pbt_check: failing property ──────────────────────────────────── */

static int prop_never_true(PBTRng *rng, void *ctx) {
    (void)rng;
    (void)ctx;
    return 0;
}

static void test_check_failing(void) {
    /* Suppress the FAIL output by just checking the return value */
    printf("  (expected FAIL output below)\n");
    int result = pbt_check("never true", prop_never_true, NULL, 10);
    assert(result == 1);
    printf("  PASS: pbt_check returns 1 for failing property\n");
}

/* ── Main ─────────────────────────────────────────────────────────── */

int main(void) {
    printf("=== PBT Library Tests ===\n\n");

    printf("generators:\n");
    test_pbt_int_range();
    test_pbt_float_range();
    test_pbt_enum_range();
    test_pbt_bool_values();

    printf("\ndeterminism:\n");
    test_deterministic();

    printf("\npbt_check:\n");
    test_check_passing();
    test_check_failing();

    printf("\n=== All PBT library tests passed! ===\n");
    return 0;
}
