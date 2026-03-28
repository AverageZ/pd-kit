/**
 * test_crank.c — Unit tests for pdk_crank_map
 *
 * Compile & run: make test
 *
 * pdk_crank.c is pure math — no Playdate SDK needed. Tests verify that
 * the parameterized clamp+lerp produces identical results to the original
 * getLanceAngleDeg and getEyebrowAngleDeg for the same inputs.
 */

#include <math.h>
#include <stdlib.h>

#include "pdk_crank.h"
#include "pdk_test.h"

/* ── Constants from steady-on (lance) ─────────────────────────────── */
#define LANCE_CRANK_WINDOW 50.0f
#define LANCE_RAISED_ANGLE_DEG -81.0f
#define LANCE_LEVEL_ANGLE_DEG -9.0f

/* ── Constants from arch-rivals (eyebrow) ─────────────────────────── */
#define EYEBROW_CRANK_WINDOW 50.0f
#define EYEBROW_ANGLE_MIN 0.0f
#define EYEBROW_ANGLE_MAX 45.0f

static const float EPSILON = 0.001f;

static int feq(float a, float b) { return fabsf(a - b) < EPSILON; }

/* ── Basic mapping tests ──────────────────────────────────────────── */

static void test_at_zero_returns_outMin(void) {
  float result = pdk_crank_map(0.0f, 50.0f, -81.0f, -9.0f);
  PDK_ASSERT(feq(result, -81.0f), "crank 0° → outMin (-81)");
}

static void test_at_window_returns_outMax(void) {
  float result = pdk_crank_map(50.0f, 50.0f, -81.0f, -9.0f);
  PDK_ASSERT(feq(result, -9.0f), "crank at window → outMax (-9)");
}

static void test_midpoint(void) {
  float result = pdk_crank_map(25.0f, 50.0f, -81.0f, -9.0f);
  float expected = -81.0f + 0.5f * (-9.0f - (-81.0f)); /* -45 */
  PDK_ASSERT(feq(result, expected), "crank at half-window → midpoint");
}

/* ── Clamping tests ───────────────────────────────────────────────── */

static void test_past_180_snaps_to_zero(void) {
  float result = pdk_crank_map(200.0f, 50.0f, -81.0f, -9.0f);
  PDK_ASSERT(feq(result, -81.0f), "crank 200° → snaps to outMin (wrap)");
}

static void test_past_window_clamps(void) {
  float at90 = pdk_crank_map(90.0f, 50.0f, -81.0f, -9.0f);
  float at50 = pdk_crank_map(50.0f, 50.0f, -81.0f, -9.0f);
  PDK_ASSERT(feq(at90, at50), "crank 90° == crank 50° (clamped to window)");
}

static void test_exactly_180_snaps(void) {
  /* 180 is not > 180, so it should clamp to window, not snap to 0 */
  float result = pdk_crank_map(180.0f, 50.0f, 0.0f, 45.0f);
  PDK_ASSERT(feq(result, 45.0f), "crank exactly 180° → clamps to window");
}

/* ── Equivalence with original functions ──────────────────────────── */

static void test_matches_getLanceAngleDeg(void) {
  /* Reproduce getLanceAngleDeg for several crank angles */
  float testAngles[] = {0.0f, 10.0f, 25.0f, 50.0f, 90.0f, 180.0f, 200.0f,
                        359.0f};
  int n = (int)(sizeof(testAngles) / sizeof(testAngles[0]));
  for (int i = 0; i < n; i++) {
    float crank = testAngles[i];
    /* Original getLanceAngleDeg logic */
    float clamped = crank;
    if (clamped > 180.0f)
      clamped = 0.0f;
    if (clamped > LANCE_CRANK_WINDOW)
      clamped = LANCE_CRANK_WINDOW;
    float t = clamped / LANCE_CRANK_WINDOW;
    float expected = LANCE_RAISED_ANGLE_DEG +
                     t * (LANCE_LEVEL_ANGLE_DEG - LANCE_RAISED_ANGLE_DEG);

    float actual = pdk_crank_map(crank, LANCE_CRANK_WINDOW,
                                 LANCE_RAISED_ANGLE_DEG, LANCE_LEVEL_ANGLE_DEG);
    assert(feq(actual, expected));
  }
  PDK_ASSERT(1, "pdk_crank_map matches getLanceAngleDeg for all test angles");
}

static void test_matches_getEyebrowAngleDeg(void) {
  float testAngles[] = {0.0f, 10.0f, 25.0f, 50.0f, 90.0f, 180.0f, 200.0f,
                        359.0f};
  int n = (int)(sizeof(testAngles) / sizeof(testAngles[0]));
  for (int i = 0; i < n; i++) {
    float crank = testAngles[i];
    /* Original getEyebrowAngleDeg logic */
    float clamped = crank;
    if (clamped > 180.0f)
      clamped = 0.0f;
    if (clamped > EYEBROW_CRANK_WINDOW)
      clamped = EYEBROW_CRANK_WINDOW;
    float t = clamped / EYEBROW_CRANK_WINDOW;
    float expected = EYEBROW_ANGLE_MIN + t * (EYEBROW_ANGLE_MAX - EYEBROW_ANGLE_MIN);

    float actual = pdk_crank_map(crank, EYEBROW_CRANK_WINDOW,
                                 EYEBROW_ANGLE_MIN, EYEBROW_ANGLE_MAX);
    assert(feq(actual, expected));
  }
  PDK_ASSERT(1, "pdk_crank_map matches getEyebrowAngleDeg for all test angles");
}

/* ── Different window sizes ───────────────────────────────────────── */

static void test_narrow_window(void) {
  float result = pdk_crank_map(5.0f, 10.0f, 0.0f, 100.0f);
  PDK_ASSERT(feq(result, 50.0f), "narrow window (10°): crank 5° → 50%");
}

static void test_wide_window(void) {
  float result = pdk_crank_map(90.0f, 180.0f, 0.0f, 1.0f);
  PDK_ASSERT(feq(result, 0.5f), "wide window (180°): crank 90° → 0.5");
}

/* ── Main ─────────────────────────────────────────────────────────── */

int main(void) {
  PDK_TEST_SUITE("pd-kit Crank Mapping Tests");

  PDK_TEST_GROUP("basic mapping");
  test_at_zero_returns_outMin();
  test_at_window_returns_outMax();
  test_midpoint();

  PDK_TEST_GROUP("\nclamping");
  test_past_180_snaps_to_zero();
  test_past_window_clamps();
  test_exactly_180_snaps();

  PDK_TEST_GROUP("\nequivalence with original functions");
  test_matches_getLanceAngleDeg();
  test_matches_getEyebrowAngleDeg();

  PDK_TEST_GROUP("\ndifferent window sizes");
  test_narrow_window();
  test_wide_window();

  PDK_ALL_PASSED();
  return 0;
}
