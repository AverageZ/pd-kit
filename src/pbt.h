/**
 * pbt.h — Property-Based Testing for Playdate/C games
 *
 * Minimal (~200 LOC) library for fuzz-testing pure game logic. No external
 * dependencies — just a header + source file you compile alongside your tests.
 *
 * TS PARALLEL: This is the C equivalent of fast-check. Instead of
 * `fc.assert(fc.property(arb, prop))`, you write:
 *   pbt_check("name", prop_fn, NULL, 10000);
 *
 * Usage:
 *   #include "pbt.h"
 *
 *   int prop_score_non_negative(PBTRng *rng, void *ctx) {
 *       int hit = pbt_enum(rng, 5);  // HIT_NONE..HIT_MISS
 *       PBT_ASSERT(getHitPoints(hit) >= 0);
 *       PBT_PASS;
 *   }
 *
 *   pbt_check("score >= 0", prop_score_non_negative, NULL, 10000);
 */

#ifndef PBT_H
#define PBT_H

#include <stdint.h>

/* ── Random generators (arbitraries) ──────────────────────────────── */

typedef struct {
    uint64_t state;
} PBTRng;

/** Seed a new RNG. Same seed → same sequence (deterministic). */
PBTRng pbt_rng_seed(uint64_t seed);

/** Random int in [min, max] inclusive. */
int pbt_int(PBTRng *rng, int min, int max);

/** Random float in [min, max]. */
float pbt_float(PBTRng *rng, float min, float max);

/** Random enum value in [0, count-1]. */
int pbt_enum(PBTRng *rng, int count);

/** Random boolean (0 or 1). */
int pbt_bool(PBTRng *rng);

/** Returns 1 with probability pct/100, 0 otherwise. */
int pbt_weighted(PBTRng *rng, int pct);

/* ── Property runner ──────────────────────────────────────────────── */

/**
 * A property function. Receives an RNG (to generate inputs) and an
 * optional context pointer. Returns 1 if the property holds, 0 if not.
 */
typedef int (*PBTProperty)(PBTRng *rng, void *ctx);

/**
 * Run a property num_runs times with different seeds. On failure,
 * replays with the failing seed and prints the counterexample.
 *
 * Returns 0 on success (all runs passed), 1 on failure.
 */
int pbt_check(const char *name, PBTProperty prop, void *ctx, int num_runs);

/* ── Assertion helpers ────────────────────────────────────────────── */

/** Return failure (property violated) if condition is false. */
#define PBT_ASSERT(cond)                                                       \
    do {                                                                        \
        if (!(cond))                                                            \
            return 0;                                                           \
    } while (0)

/** Return success (property holds). Use at the end of every property. */
#define PBT_PASS return 1

#endif /* PBT_H */
