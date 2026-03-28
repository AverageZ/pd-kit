/**
 * pbt.c — Property-Based Testing implementation.
 *
 * Uses xorshift64 for RNG — fast, deterministic, no stdlib dependency.
 * On failure, replays the exact failing seed so the counterexample is
 * reproducible. No shrinking of composite inputs — the seed replay
 * gives you a deterministic repro, which is sufficient for ~200 LOC
 * game logic modules.
 *
 * KEY C CONCEPT — DETERMINISTIC TESTING:
 * In TS/fast-check, shrinking walks backward from the failing input to
 * find a minimal case. Here we take a simpler approach: each run uses
 * a unique seed derived from the run index. On failure, we print the
 * seed so you can replay it in a debugger. This is the C way — simple,
 * predictable, zero allocation.
 */

#include "pbt.h"

#include <stdio.h>

/* ── xorshift64 RNG ───────────────────────────────────────────────── */

static uint64_t xorshift64(uint64_t *state) {
    uint64_t x = *state;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    *state = x;
    return x;
}

PBTRng pbt_rng_seed(uint64_t seed) {
    PBTRng rng;
    /* Avoid zero state (xorshift64 fixpoint) */
    rng.state = seed ? seed : 1;
    return rng;
}

/* ── Generators ───────────────────────────────────────────────────── */

int pbt_int(PBTRng *rng, int min, int max) {
    if (min >= max)
        return min;
    uint64_t raw = xorshift64(&rng->state);
    uint64_t range = (uint64_t)(max - min) + 1;
    return min + (int)(raw % range);
}

float pbt_float(PBTRng *rng, float min, float max) {
    if (min >= max)
        return min;
    uint64_t raw = xorshift64(&rng->state);
    /* Map to [0, 1) then scale to [min, max] */
    double t = (double)(raw >> 11) / (double)(1ULL << 53);
    return min + (float)(t * (double)(max - min));
}

int pbt_enum(PBTRng *rng, int count) {
    if (count <= 1)
        return 0;
    return pbt_int(rng, 0, count - 1);
}

int pbt_bool(PBTRng *rng) {
    return pbt_int(rng, 0, 1);
}

int pbt_weighted(PBTRng *rng, int pct) {
    return pbt_int(rng, 1, 100) <= pct;
}

/* ── Property runner ──────────────────────────────────────────────── */

int pbt_check(const char *name, PBTProperty prop, void *ctx, int num_runs) {
    for (int i = 0; i < num_runs; i++) {
        /* Derive a unique seed per run. Adding 1 avoids the zero seed. */
        uint64_t seed = (uint64_t)i * 2654435761ULL + 1;
        PBTRng rng = pbt_rng_seed(seed);

        if (!prop(&rng, ctx)) {
            /* Replay with same seed for diagnostics */
            printf("  FAIL: %s (run %d, seed %llu)\n", name, i, (unsigned long long)seed);
            printf("        Replay: pbt_rng_seed(%lluULL)\n", (unsigned long long)seed);
            return 1;
        }
    }
    printf("  PASS: %s (%d runs)\n", name, num_runs);
    return 0;
}
