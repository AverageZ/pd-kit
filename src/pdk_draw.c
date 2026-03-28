/**
 * pdk_draw.c — Shared Playdate drawing primitives
 *
 * Extracted from steady-on/src/draw.c and arch-rivals/src/draw.c.
 * Both projects share the same init pattern, centered text, border frame,
 * and divider — differing only in corner accent size.
 */

#include "pdk_draw.h"

#include <string.h>

static PlaydateAPI *pd = NULL;
static LCDFont *font = NULL;

void pdk_draw_init(PlaydateAPI *playdate, LCDFont *f) {
  pd = playdate;
  font = f;
}

void pdk_draw_centered(const char *text, int y) {
  int w =
      pd->graphics->getTextWidth(font, text, strlen(text), kUTF8Encoding, 0);
  pd->graphics->drawText(text, strlen(text), kUTF8Encoding,
                         (LCD_COLUMNS - w) / 2, y);
}

void pdk_draw_border(int cornerSize) {
  /* Outer border — 2px thick via two nested rects */
  pd->graphics->drawRect(4, 4, LCD_COLUMNS - 8, LCD_ROWS - 8, kColorBlack);
  pd->graphics->drawRect(5, 5, LCD_COLUMNS - 10, LCD_ROWS - 10, kColorBlack);
  /* Inner border — 1px, inset further for a double-frame look */
  pd->graphics->drawRect(10, 10, LCD_COLUMNS - 20, LCD_ROWS - 20, kColorBlack);

  /* Corner accents — filled triangles at each corner */
  int cs = cornerSize;
  /* Top-left */
  pd->graphics->fillTriangle(10, 10, 10 + cs, 10, 10, 10 + cs, kColorBlack);
  /* Top-right */
  pd->graphics->fillTriangle(LCD_COLUMNS - 11, 10, LCD_COLUMNS - 11 - cs, 10,
                             LCD_COLUMNS - 11, 10 + cs, kColorBlack);
  /* Bottom-left */
  pd->graphics->fillTriangle(10, LCD_ROWS - 11, 10 + cs, LCD_ROWS - 11, 10,
                             LCD_ROWS - 11 - cs, kColorBlack);
  /* Bottom-right */
  pd->graphics->fillTriangle(LCD_COLUMNS - 11, LCD_ROWS - 11,
                             LCD_COLUMNS - 11 - cs, LCD_ROWS - 11,
                             LCD_COLUMNS - 11, LCD_ROWS - 11 - cs, kColorBlack);
}

void pdk_draw_divider(int y, int marginX) {
  pd->graphics->drawLine(marginX, y, LCD_COLUMNS - marginX, y, 1, kColorBlack);
}
