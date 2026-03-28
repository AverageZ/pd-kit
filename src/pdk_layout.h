/**
 * pdk_layout.h — Cursor-based text layout for fixed-viewport Playdate screens
 *
 * A lightweight vertical layout system. Stack-allocate a PdkLayout, draw text
 * and dividers through it, and the cursor auto-advances. No heap allocation.
 *
 * Think of it like a CSS flex column for a 400×240 screen — each call appends
 * an element and the Y position flows downward automatically.
 *
 * Requires Playdate SDK. Call pdk_layout_init() once before using any function.
 */

#ifndef PDK_LAYOUT_H
#define PDK_LAYOUT_H

#include "pd_api.h"

/* ── Alignment ─────────────────────────────────────────────────────── */
typedef enum {
    PDK_ALIGN_LEFT,
    PDK_ALIGN_CENTER,
    PDK_ALIGN_RIGHT
} PdkAlign;

/* ── Layout cursor ─────────────────────────────────────────────────── */
/* Stack-allocated. Fields are public — tweak marginX inline for one-off
 * adjustments, read y for custom draw calls. */
typedef struct {
    int y;       /* current vertical position (pixels) */
    int lineGap; /* gap after each text line (default: 22) */
    int marginX; /* horizontal margin for left/right/menu (default: 30) */
} PdkLayout;

/* ── Module init ───────────────────────────────────────────────────── */

/**
 * Initialize the layout module. Must be called once during kEventInit.
 *
 * @param pd       Playdate API pointer
 * @param regular  Primary font
 * @param italic   Italic font (may be NULL — falls back to regular)
 */
void pdk_layout_init(PlaydateAPI *pd, LCDFont *regular, LCDFont *italic);

/* ── Construction ──────────────────────────────────────────────────── */

/** Start a layout at the given Y with default gap (22) and margin (30). */
PdkLayout pdk_layout_start(int y);

/** Start a layout with custom gap and margin. */
PdkLayout pdk_layout_start_ex(int y, int lineGap, int marginX);

/* ── Drawing (advances cursor) ─────────────────────────────────────── */

/** Draw text at cursor position and advance by lineGap. */
void pdk_layout_text(PdkLayout *L, const char *text, PdkAlign align);

/** Draw italic text at cursor position and advance by lineGap. */
void pdk_layout_text_italic(PdkLayout *L, const char *text, PdkAlign align);

/**
 * Draw a menu item — highlighted (inverted) if selected.
 * Encapsulates the fillRect + setDrawMode + drawText + restore pattern.
 * Always centered. Advances cursor by lineGap + 6 for menu spacing.
 */
void pdk_layout_menu_item(PdkLayout *L, const char *text, int selected);

/** Draw a horizontal divider at cursor and advance by 12px. */
void pdk_layout_divider(PdkLayout *L);

/* ── Spacing ───────────────────────────────────────────────────────── */

/** Add vertical space without drawing anything. */
void pdk_layout_gap(PdkLayout *L, int pixels);

/* ── Querying ──────────────────────────────────────────────────────── */

/** Read current Y position. Use for custom draw calls, then gap() to advance. */
static inline int pdk_layout_y(const PdkLayout *L) { return L->y; }

#endif /* PDK_LAYOUT_H */
