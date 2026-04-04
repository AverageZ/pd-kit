import { describe, expect, it } from 'vitest';

import type {
  ExprIR,
  LayoutIR,
  OpIR,
  PropIR,
  ScreenIR,
  StaticArrayIR,
  TextContent,
} from '../src/types';

import {
  ADVANCE_DIVIDER,
  ADVANCE_MENU_ITEM_EXTRA,
  ADVANCE_TEXT,
  BORDER_INNER,
  BORDER_OUTER_1,
  BORDER_OUTER_2,
  BORDER_SCALE,
  DEFAULT_LINE_GAP,
  DEFAULT_MARGIN_X,
  GAP_SCALE,
  LCD_COLUMNS,
  LCD_ROWS,
  MENU_ITEM_PAD_EXTRA,
} from '../src/constants';

// ── ExprIR discriminated union ──────────────────────────────────────

describe('ExprIR', () => {
  it('narrows literal', () => {
    const expr: ExprIR = { kind: 'literal', value: 42 };
    if (expr.kind === 'literal') {
      expect(expr.value).toBe(42);
    }
  });

  it('narrows prop', () => {
    const expr: ExprIR = { kind: 'prop', name: 'score' };
    if (expr.kind === 'prop') {
      expect(expr.name).toBe('score');
    }
  });

  it('narrows index', () => {
    const expr: ExprIR = {
      array: 'items',
      index: { kind: 'prop', name: 'i' },
      kind: 'index',
    };
    if (expr.kind === 'index') {
      expect(expr.array).toBe('items');
    }
  });

  it('narrows comparison', () => {
    const expr: ExprIR = {
      kind: 'comparison',
      left: { kind: 'prop', name: 'x' },
      op: '==',
      right: { kind: 'literal', value: 0 },
    };
    if (expr.kind === 'comparison') {
      expect(expr.op).toBe('==');
    }
  });

  it('narrows arithmetic', () => {
    const expr: ExprIR = {
      kind: 'arithmetic',
      left: { kind: 'prop', name: 'a' },
      op: '+',
      right: { kind: 'literal', value: 1 },
    };
    if (expr.kind === 'arithmetic') {
      expect(expr.op).toBe('+');
    }
  });

  it('narrows not', () => {
    const expr: ExprIR = {
      kind: 'not',
      operand: { kind: 'prop', name: 'flag' },
    };
    if (expr.kind === 'not') {
      expect(expr.operand.kind).toBe('prop');
    }
  });

  it('narrows template', () => {
    const expr: ExprIR = {
      bufferSize: 64,
      kind: 'template',
      parts: ['Score: ', { kind: 'prop', name: 'score' }],
    };
    if (expr.kind === 'template') {
      expect(expr.bufferSize).toBe(64);
      expect(expr.parts).toHaveLength(2);
    }
  });
});

// ── TextContent discriminated union ─────────────────────────────────

describe('TextContent', () => {
  it('narrows static', () => {
    const tc: TextContent = { kind: 'static', value: 'Hello' };
    if (tc.kind === 'static') {
      expect(tc.value).toBe('Hello');
    }
  });

  it('narrows prop', () => {
    const tc: TextContent = { kind: 'prop', name: 'title' };
    if (tc.kind === 'prop') {
      expect(tc.name).toBe('title');
    }
  });

  it('narrows template', () => {
    const tc: TextContent = {
      expr: {
        bufferSize: 32,
        kind: 'template',
        parts: ['Hi ', { kind: 'prop', name: 'name' }],
      },
      kind: 'template',
    };
    if (tc.kind === 'template') {
      expect(tc.expr.kind).toBe('template');
    }
  });
});

// ── OpIR discriminated union ────────────────────────────────────────

describe('OpIR', () => {
  it('narrows text', () => {
    const op: OpIR = {
      align: 'center',
      content: { kind: 'static', value: 'Hello' },
      italic: false,
      kind: 'text',
    };
    if (op.kind === 'text') {
      expect(op.align).toBe('center');
      expect(op.italic).toBe(false);
    }
  });

  it('narrows menuItem', () => {
    const op: OpIR = {
      content: { kind: 'static', value: 'Start' },
      kind: 'menuItem',
      selected: { kind: 'literal', value: true },
    };
    if (op.kind === 'menuItem') {
      expect(op.selected.kind).toBe('literal');
    }
  });

  it('narrows divider', () => {
    const op: OpIR = { kind: 'divider' };
    expect(op.kind).toBe('divider');
  });

  it('narrows gap with number', () => {
    const op: OpIR = { kind: 'gap', pixels: 10 };
    if (op.kind === 'gap') {
      expect(op.pixels).toBe(10);
    }
  });

  it('narrows gap with ExprIR', () => {
    const op: OpIR = { kind: 'gap', pixels: { kind: 'prop', name: 'space' } };
    if (op.kind === 'gap') {
      expect(typeof op.pixels).toBe('object');
    }
  });

  it('narrows cursorSet', () => {
    const op: OpIR = { kind: 'cursorSet', y: 100 };
    if (op.kind === 'cursorSet') {
      expect(op.y).toBe(100);
    }
  });

  it('narrows cursorShift', () => {
    const op: OpIR = { kind: 'cursorShift', y: -20 };
    if (op.kind === 'cursorShift') {
      expect(op.y).toBe(-20);
    }
  });

  it('narrows marginSet', () => {
    const op: OpIR = { kind: 'marginSet', x: 90 };
    if (op.kind === 'marginSet') {
      expect(op.x).toBe(90);
    }
  });

  it('narrows paragraph', () => {
    const op: OpIR = {
      align: 'left',
      kind: 'paragraph',
      lines: ['Line 1', 'Line 2'],
    };
    if (op.kind === 'paragraph') {
      expect(op.lines).toHaveLength(2);
    }
  });

  it('narrows conditional', () => {
    const op: OpIR = {
      condition: { kind: 'prop', name: 'show' },
      kind: 'conditional',
      then: [{ kind: 'divider' }],
    };
    if (op.kind === 'conditional') {
      expect(op.then).toHaveLength(1);
      expect(op.else).toBeUndefined();
    }
  });

  it('narrows conditional with else', () => {
    const op: OpIR = {
      condition: { kind: 'prop', name: 'show' },
      else: [{ kind: 'divider' }],
      kind: 'conditional',
      then: [{ kind: 'divider' }],
    };
    if (op.kind === 'conditional') {
      expect(op.else).toHaveLength(1);
    }
  });

  it('narrows loop', () => {
    const op: OpIR = {
      array: 'items',
      body: [{ kind: 'divider' }],
      indexName: 'i',
      itemName: 'item',
      kind: 'loop',
    };
    if (op.kind === 'loop') {
      expect(op.array).toBe('items');
      expect(op.itemName).toBe('item');
      expect(op.indexName).toBe('i');
    }
  });

  it('narrows rawC', () => {
    const op: OpIR = { code: 'pd->system->drawFPS(0, 0);', kind: 'rawC' };
    if (op.kind === 'rawC') {
      expect(op.code).toContain('drawFPS');
    }
  });
});

// ── LayoutIR ────────────────────────────────────────────────────────

describe('LayoutIR', () => {
  it('constructs with defaults', () => {
    const layout: LayoutIR = { ops: [], y: 50 };
    expect(layout.y).toBe(50);
    expect(layout.lineGap).toBeUndefined();
    expect(layout.marginX).toBeUndefined();
  });

  it('constructs with overrides', () => {
    const layout: LayoutIR = { lineGap: 18, marginX: 40, ops: [], y: 50 };
    expect(layout.lineGap).toBe(18);
    expect(layout.marginX).toBe(40);
  });
});

// ── StaticArrayIR ───────────────────────────────────────────────────

describe('StaticArrayIR', () => {
  it('constructs', () => {
    const arr: StaticArrayIR = {
      name: 'menuOptions',
      values: ['New Game', 'Continue', 'Settings'],
    };
    expect(arr.name).toBe('menuOptions');
    expect(arr.values).toHaveLength(3);
  });
});

// ── PropIR ──────────────────────────────────────────────────────────

describe('PropIR', () => {
  it('constructs all tsType variants', () => {
    const types: PropIR['tsType'][] = [
      'number',
      'boolean',
      'string',
      'string[]',
      'number[]',
    ];
    types.forEach((tsType) => {
      const prop: PropIR = { name: 'test', tsType };
      expect(prop.tsType).toBe(tsType);
    });
  });
});

// ── ScreenIR ────────────────────────────────────────────────────────

describe('ScreenIR', () => {
  it('constructs a complete screen', () => {
    const screen: ScreenIR = {
      border: 16,
      hasRawC: false,
      layouts: [
        {
          ops: [
            {
              align: 'center',
              content: { kind: 'static', value: 'Title' },
              italic: false,
              kind: 'text',
            },
          ],
          y: 50,
        },
      ],
      name: 'TitleScreen',
      props: [{ name: 'score', tsType: 'number' }],
      sourceFile: 'Title.tsx',
      staticArrays: [],
    };
    expect(screen.name).toBe('TitleScreen');
    expect(screen.border).toBe(16);
    expect(screen.layouts).toHaveLength(1);
    expect(screen.props).toHaveLength(1);
    expect(screen.hasRawC).toBe(false);
  });
});

// ── Constants ───────────────────────────────────────────────────────

describe('constants', () => {
  it('LCD dimensions', () => {
    expect(LCD_COLUMNS).toBe(400);
    expect(LCD_ROWS).toBe(240);
  });

  it('pdk_layout defaults (pdk_layout.c:24)', () => {
    expect(DEFAULT_LINE_GAP).toBe(22);
    expect(DEFAULT_MARGIN_X).toBe(30);
  });

  it('cursor advances', () => {
    expect(ADVANCE_TEXT).toBe('lineGap');
    expect(ADVANCE_MENU_ITEM_EXTRA).toBe(6);
    expect(ADVANCE_DIVIDER).toBe(12);
  });

  it('border geometry (pdk_draw.c:30-33)', () => {
    expect(BORDER_OUTER_1).toEqual({ h: 232, w: 392, x: 4, y: 4 });
    expect(BORDER_OUTER_2).toEqual({ h: 230, w: 390, x: 5, y: 5 });
    expect(BORDER_INNER).toEqual({ h: 220, w: 380, x: 10, y: 10 });
  });

  it('menu item pad extra (pdk_layout.c:73)', () => {
    expect(MENU_ITEM_PAD_EXTRA).toBe(6);
  });
});

// ── Spacing scale maps ─────────────────────────────────────────────

describe('spacing scales', () => {
  it('GAP_SCALE resolves tokens to pixels', () => {
    expect(GAP_SCALE.xs).toBe(3);
    expect(GAP_SCALE.sm).toBe(6);
    expect(GAP_SCALE.md).toBe(13);
    expect(GAP_SCALE.lg).toBe(22);
  });

  it('BORDER_SCALE resolves tokens to corner sizes', () => {
    expect(BORDER_SCALE.tight).toBe(8);
    expect(BORDER_SCALE.standard).toBe(16);
    expect(BORDER_SCALE.wide).toBe(24);
  });
});
