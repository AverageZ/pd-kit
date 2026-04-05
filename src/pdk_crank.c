/**
 * pdk_crank.c — Crank-to-value mapping implementation
 *
 * Extracted from steady-on/src/hit.c (getLanceAngleDeg) and
 * arch-rivals/src/expression.c (getEyebrowAngleDeg). Both functions
 * are identical in shape: clamp, normalize, lerp.
 */

#include "pdk_crank.h"

float pdk_crank_map(float crankAngle, float window, float outMin, float outMax) {
    float clamped = crankAngle;
    if (clamped > 180.0f)
        clamped = 0.0f;
    if (clamped > window)
        clamped = window;

    float t = clamped / window;
    return outMin + t * (outMax - outMin);
}
