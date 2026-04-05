/**
 * pdk_layout.c — Cursor-based text layout for fixed-viewport Playdate screens
 *
 * Delegates actual rendering to pdk_draw (for centered text, dividers) and
 * the raw Playdate graphics API (for left/right alignment, menu highlights).
 */

#include "pdk_layout.h"
#include "pdk_draw.h"

#include <string.h>

static PlaydateAPI *pd = NULL;
static LCDFont *fontRegular = NULL;
static LCDFont *fontItalic = NULL;

void pdk_layout_init(PlaydateAPI *playdate, LCDFont *regular, LCDFont *italic) {
    pd = playdate;
    fontRegular = regular;
    fontItalic = italic;
}

PdkLayout pdk_layout_start(int y) {
    return (PdkLayout){.y = y, .lineGap = 22, .marginX = 30};
}

PdkLayout pdk_layout_start_ex(int y, int lineGap, int marginX) {
    return (PdkLayout){.y = y, .lineGap = lineGap, .marginX = marginX};
}

/* ── Internal: draw text with a specific font and alignment ────────── */
static void drawAligned(const char *text, int y, int marginX, PdkAlign align, LCDFont *f) {
    /* Temporarily swap font if different from current */
    pd->graphics->setFont(f);

    switch (align) {
    case PDK_ALIGN_CENTER: {
        int w = pd->graphics->getTextWidth(f, text, strlen(text), kUTF8Encoding, 0);
        pd->graphics->drawText(text, strlen(text), kUTF8Encoding, (LCD_COLUMNS - w) / 2, y);
        break;
    }
    case PDK_ALIGN_LEFT:
        pd->graphics->drawText(text, strlen(text), kUTF8Encoding, marginX, y);
        break;
    case PDK_ALIGN_RIGHT: {
        int w = pd->graphics->getTextWidth(f, text, strlen(text), kUTF8Encoding, 0);
        pd->graphics->drawText(text, strlen(text), kUTF8Encoding, LCD_COLUMNS - marginX - w, y);
        break;
    }
    }

    /* Restore regular font */
    pd->graphics->setFont(fontRegular);
}

void pdk_layout_text(PdkLayout *L, const char *text, PdkAlign align) {
    drawAligned(text, L->y, L->marginX, align, fontRegular);
    L->y += L->lineGap;
}

void pdk_layout_text_italic(PdkLayout *L, const char *text, PdkAlign align) {
    LCDFont *f = (fontItalic != NULL) ? fontItalic : fontRegular;
    drawAligned(text, L->y, L->marginX, align, f);
    L->y += L->lineGap;
}

void pdk_layout_menu_item(PdkLayout *L, const char *text, int selected) {
    const int extraGap = 6; /* extra spacing between menu items (beyond lineGap) */
    const int boxH = L->lineGap + extraGap;
    int fontH = pd->graphics->getFontHeight(fontRegular);
    int padY = (boxH - fontH) / 2; /* center text vertically in highlight */

    if (selected) {
        pd->graphics->fillRect(L->marginX, L->y - padY, LCD_COLUMNS - 2 * L->marginX, boxH,
                               kColorBlack);
        pd->graphics->setDrawMode(kDrawModeInverted);
    }

    drawAligned(text, L->y, L->marginX, PDK_ALIGN_CENTER, fontRegular);

    if (selected)
        pd->graphics->setDrawMode(kDrawModeCopy);

    L->y += boxH;
}

void pdk_layout_divider(PdkLayout *L) {
    pdk_draw_divider(L->y, L->marginX);
    L->y += 12; /* Dividers use a tighter advance than text lines */
}

void pdk_layout_gap(PdkLayout *L, int pixels) {
    L->y += pixels;
}
