/**
 * pdk_crank.h — Crank-to-value mapping
 *
 * Maps the Playdate crank angle (0–360°) to a game-specific output range
 * using a configurable window. Pure math — no Playdate SDK dependency.
 */

#ifndef PDK_CRANK_H
#define PDK_CRANK_H

/**
 * Map a crank angle to a value within [outMin, outMax].
 *
 * The crank's 0–window range maps linearly to outMin–outMax.
 * Angles past 180° snap to 0 (raised/reset position).
 * Angles past `window` clamp to `window` (fully extended).
 *
 * @param crankAngle  Raw crank angle in degrees (0–360)
 * @param window      Active crank range in degrees (e.g. 50)
 * @param outMin      Output value at crank 0°
 * @param outMax      Output value at crank == window
 * @return            Mapped value in [outMin, outMax]
 */
float pdk_crank_map(float crankAngle, float window, float outMin, float outMax);

#endif /* PDK_CRANK_H */
