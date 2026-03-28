/**
 * pdk_draw.h — Shared Playdate drawing primitives
 *
 * Provides centered text, decorative border frame, and horizontal divider.
 * Requires Playdate SDK. Call pdk_draw_init() once before using any function.
 */

#ifndef PDK_DRAW_H
#define PDK_DRAW_H

#include "pd_api.h"

/**
 * Initialize the draw module. Must be called once during kEventInit.
 *
 * @param pd    Playdate API pointer
 * @param font  Primary font for centered text rendering
 */
void pdk_draw_init(PlaydateAPI *pd, LCDFont *font);

/**
 * Draw text centered horizontally on the screen.
 * Uses kUTF8Encoding (superset of ASCII — works with plain ASCII too).
 *
 * @param text  Null-terminated string to draw
 * @param y     Vertical position in pixels
 */
void pdk_draw_centered(const char *text, int y);

/**
 * Draw a decorative double-frame border with filled corner accents.
 *
 * @param cornerSize  Size of the corner triangle accents (steady-on: 26, arch-rivals: 30)
 */
void pdk_draw_border(int cornerSize);

/**
 * Draw a horizontal divider line.
 *
 * @param y        Vertical position of the line
 * @param marginX  Horizontal margin from each screen edge
 */
void pdk_draw_divider(int y, int marginX);

#endif /* PDK_DRAW_H */
