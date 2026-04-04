// LCD dimensions (Playdate hardware)
export const LCD_COLUMNS = 400;
export const LCD_ROWS = 240;

// pdk_layout defaults (pdk_layout.c:24)
export const DEFAULT_LINE_GAP = 22;
export const DEFAULT_MARGIN_X = 30;

// Cursor advances (pdk_layout.c)
export const ADVANCE_TEXT = 'lineGap' as const;
export const ADVANCE_MENU_ITEM_EXTRA = 6; // pdk_layout.c:73
export const ADVANCE_DIVIDER = 12; // pdk_layout.c:95

// Border geometry (pdk_draw.c:30-33)
export const BORDER_OUTER_1 = { h: 232, w: 392, x: 4, y: 4 } as const;
export const BORDER_OUTER_2 = { h: 230, w: 390, x: 5, y: 5 } as const;
export const BORDER_INNER = { h: 220, w: 380, x: 10, y: 10 } as const;

// Menu item highlight (pdk_layout.c:73)
export const MENU_ITEM_PAD_EXTRA = 6;

// Spacing scale maps
export const GAP_SCALE = { lg: 22, md: 13, sm: 6, xs: 3 } as const;
export const BORDER_SCALE = { standard: 16, tight: 8, wide: 24 } as const;
