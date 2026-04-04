# pdk-tsx: JSX → C Transpiler for Playdate Screen UI

## Context

Playdate games build UI screens with imperative C using `pdk_layout`/`pdk_draw`. Testing requires the Playdate Simulator (process lifecycle, network dialogs, Linux CI broken, 2-3s restart per test). This project creates a JSX→C transpiler: screens authored in `.tsx` files, transpiled to C for production, rendered to Canvas for fast snapshot testing without the simulator.

## Architecture

```
game/screens/TitleScreen.tsx  (source of truth)
        │
   ┌────┴────────────┐
   ▼                  ▼
 C emitter         Canvas renderer
   │                  │
   ▼                  ▼
gen/screens.c      PNG snapshots
gen/screens.h      (vitest tests)
   │
   ▼
Playdate build
```

The transpiler parses TSX → validates against a constrained subset → builds an IR → emits either C code or Canvas render calls. Both outputs produce identical visual results.

## Conventions

- **Package manager:** pnpm (all commands use `pnpm`, never npm/npx/yarn)
- **Type definitions:** `type Props = { ... }` (never `interface`)
- **TypeScript style:** strict mode, no `any`, prefer discriminated unions
- **Test runner:** vitest
- **Prop-based testing:** fast-check (TS equivalent of pd-kit's `pbt.c`)

## Testing Strategy — TDD Red/Green

Every module is built test-first. The workflow for each phase:

1. **Red** — Write failing tests that define the expected behavior
2. **Green** — Write the minimal implementation to pass
3. **Refactor** — Clean up without changing behavior

**Unit tests per module:**

| Module           | Test focus                                                                                        | PBT candidates                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `parse.ts`       | TSX string → AST nodes; rejects unsupported constructs                                            | Random valid/invalid TSX fragments (fast-check `string` + `oneof`)                                       |
| `validate.ts`    | Allowlist enforcement; error messages include file:line:col                                       | Random AST nodes with forbidden constructs                                                               |
| `ir.ts`          | AST → IR mapping; fragment flattening; expression conversion                                      | Round-trip: generate random IR, emit TSX, re-parse, compare IR                                           |
| `emit-c.ts`      | IR → C string; buffer sizing; static array emission; include guards                               | Random IR trees → verify output compiles with `cc -fsyntax-only`                                         |
| `emit-canvas.ts` | IR → Canvas calls; cursor advance matches C constants                                             | Same IR → compare Canvas pixel output vs C reference harness pixel output (see §Dual-Output Parity)      |
| `font-parser.ts` | `.fnt` parsing; `getTextWidth`; `fontHeight`                                                      | Random strings → width is sum of char widths + tracking\*(len-1)                                         |
| `wrap.ts`        | Word wrap: fits-in-one-line, exact-fit, break-on-word, long-single-word, whitespace normalization | Random strings × random widths → every line ≤ maxWidth; joined lines = original text (modulo whitespace) |

**Fixture tests:** Each example in "Concrete Examples" becomes a fixture test: `.tsx` input → expected `.c` + `.h` output (exact string match).

**Snapshot tests:** Canvas renderer output compared as PNGs against blessed references.

## Constrained TSX Subset

**Supported:**

| Construct                           | Example                               | C Equivalent                                                                  |
| ----------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| Function component with typed props | `function TitleScreen(p: Props)`      | `void drawTitleScreen(int bestScore, ...)`                                    |
| `number` prop                       | `bestScore: number`                   | `int` parameter                                                               |
| `boolean` prop                      | `confirmed: boolean`                  | `int` parameter (0/1)                                                         |
| `string` prop                       | `name: string`                        | `const char *` parameter                                                      |
| `string[]` prop                     | `names: string[]`                     | `const char *const *` + auto `int namesCount`                                 |
| `number[]` prop                     | `scores: number[]`                    | `const int *` + auto `int scoresCount`                                        |
| Ternary expressions                 | `{x ? <A/> : <B/>}`                   | `if (x) { ... } else { ... }`                                                 |
| Logical AND                         | `{x && <A/>}`                         | `if (x) { ... }`                                                              |
| `.map()` on arrays                  | `{items.map((item, i) => ...)}`       | `for (int i = 0; i < count; i++)` — see note below                            |
| Template literals                   | ``{`Score: ${pts} pts`}``             | `snprintf(buf, sizeof(buf), "Score: %d pts", pts)`                            |
| Static string arrays                | `const labels = ["A", "B"]`           | `static const char *screenName_labels[2] = {"A", "B"}` (file-scope, prefixed) |
| Comparison/arithmetic in props      | `selected={i === choice}`             | `i == choice`                                                                 |
| Fragments                           | `<>...</>`                            | (flattened)                                                                   |
| `<Paragraph>` auto-wrap             | `<Paragraph>Long text...</Paragraph>` | Multiple `pdk_layout_text()` calls (word-wrapped at transpile time)           |

**`.map()` disambiguation:**

- On a `const` local array (known length): loop bound is the literal length → `for (int i = 0; i < 3; i++)`
- On an array prop: loop bound uses the auto-generated count param → `for (int i = 0; i < namesCount; i++)`

**Static array namespacing:** Local `const` arrays are emitted as `static` file-scope arrays in `screens.c`, using the original variable name. If two screens define arrays with the same name, the emitter prefixes with the screen name (camelCase, `Screen` suffix stripped) to disambiguate — e.g., `const labels` in both `TitleScreen` and `SettingsScreen` → `title_labels` and `settings_labels`. When names are already unique (the common case), no prefix is added.

**Multiple `<Layout>` blocks:** Sequential `<Layout>` blocks within a `<Screen>` are supported. Each emits a scoped block in C to avoid `PdkLayout L` redeclaration:

```c
{ PdkLayout L = pdk_layout_start(40); ... }
{ PdkLayout L = pdk_layout_start_ex(160, 18, 50); ... }
```

When layouts are in mutually exclusive branches (ternary), scoping is already provided by the `if/else` block (see Example 3).

**NOT supported (hard transpile errors):**

- Closures, hooks, classes, async, spread, switch, nested components
- `typeof`, `keyof`, type assertions, `as const`, optional chaining (`?.`), nullish coalescing (`??`)
- `let`/`var` declarations (only top-level `const` arrays allowed)
- Destructuring beyond the props parameter
- Optional props (`choice?: number`) — all props are required
- `boolean[]` arrays (only `string[]` and `number[]` supported)
- Complex screens with heavy procedural drawing stay hand-written in C

**Validation approach — three layers:**

1. **TS types (static, in-editor):** A `jsx.d.ts` ships JSX intrinsic element definitions (`Screen`, `Layout`, `Text`, `MenuItem`, `Paragraph`, etc.) with exact prop signatures. This catches element API misuse — wrong props, missing required props, unsupported elements — as red squiggles in VS Code before the transpiler runs. A `PdkPropType` utility type restricts prop values to `number | boolean | string | string[] | number[]`, rejecting `boolean[]`, objects, functions, etc. `MenuItem` omits `align` (hardcoded center in C). `Paragraph` accepts `align` and static string children (same as `Text` but word-wraps at transpile time). `Screen` requires `border` (as `number | "tight" | "standard" | "wide"`). `Layout` accepts either `align` + optional `padding` or `y` (not both). `Gap` accepts either `size` or `pixels` (not both).
2. **Custom ESLint rules (in-editor + CI lint):** Catches structural patterns that TS types cannot express — constraints involving children composition, nesting depth, or cross-element relationships. These run as standard ESLint rules using `@typescript-eslint/utils`, each a single-file AST visitor (~30-50 lines).
3. **AST allowlist validator (runtime, at transpile):** Only the constructs listed in the "Supported" table are accepted. Everything else produces a hard transpile error with file, line, and column. This catches syntactic restrictions that TS types and ESLint cannot enforce: `let`/`var`, closures, hooks, classes, optional chaining, spread, switch, etc. This is safer than a denylist since TypeScript has hundreds of syntax nodes.

The three layers are complementary — TS types catch "wrong props on the right element" instantly in the editor; ESLint rules catch "wrong children structure" at save/lint time; the AST validator catches "language feature we can't transpile" at build time.

**Custom ESLint rules:**

| Rule                                     | What it catches                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `pdk-tsx/no-nested-map`                  | `.map()` inside another `.map()` callback                                |
| `pdk-tsx/no-dynamic-paragraph`           | `<Paragraph>` with template literal, prop reference, or mixed children   |
| `pdk-tsx/no-conditional-centered-layout` | `<Layout align="center">` containing ternary, `&&`, or `.map()` children |
| `pdk-tsx/no-boolean-template`            | `${booleanProp}` inside Text template literals                           |
| `pdk-tsx/no-mixed-text-children`         | `<Text>` with both static string and expression children                 |

**Edge case rulings:**

| Case                                              | Ruling                                                                                                                                                                                                                                      | Layer     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Nested ternaries (`a ? (b ? X : Y) : Z`)          | **Allowed** — emits nested `if/else`, valid C                                                                                                                                                                                               | —         |
| Nested `.map()`                                   | **Hard error** — C loop nesting adds complexity; flatten in TSX or hand-write in C                                                                                                                                                          | ESLint    |
| Empty `<Screen>` (no layouts)                     | **Hard error** — intentional, no empty draw functions                                                                                                                                                                                       | TS types  |
| Empty `<Layout>` (no children)                    | **Hard error** — wasteful, likely a mistake                                                                                                                                                                                                 | TS types  |
| Adjacent `.map()` in same layout                  | **Allowed** — each loop body is wrapped in `{ }` braces; index var `i` is scoped per block                                                                                                                                                  | —         |
| `.map()` callback naming                          | Emitter always uses `i` for index, ignoring user's chosen name. The item name is used as-is for the loop variable in C (e.g., `(label, i)` → loop body references `victoryChoiceLabels[i]` for const arrays, or `names[i]` for prop arrays) | —         |
| `.map((item)` with no index)                      | **Allowed** — index `i` still generated for the loop bound; item name used for references                                                                                                                                                   | —         |
| `.map((_, i)` unused item)                        | **Allowed** — `_` is ignored; only index used                                                                                                                                                                                               | —         |
| Duplicate screen names across files               | **Hard error** — detected at emit time, reports both files                                                                                                                                                                                  | Emit-time |
| `<Layout>` with both `align` and `y`              | **Hard error** — mutually exclusive positioning modes                                                                                                                                                                                       | TS types  |
| `<Layout align="center">` with conditionals/loops | **Hard error** — content height must be statically determinable; use `y={N}`                                                                                                                                                                | ESLint    |
| `<Layout align="center" padding={10}>`            | **Hard error** — `padding` only valid with `align="top"` or `align="bottom"`                                                                                                                                                                | TS types  |
| `<Layout padding={10}>` (no `align`)              | **Hard error** — `padding` requires `align`                                                                                                                                                                                                 | TS types  |
| `<Gap>` with both `size` and `pixels`             | **Hard error** — exactly one sizing mode required                                                                                                                                                                                           | TS types  |
| `<Gap>` with neither `size` nor `pixels`          | **Hard error** — exactly one sizing mode required                                                                                                                                                                                           | TS types  |
| `<Paragraph>` with template literal               | **Hard error** — word-wrap requires static text known at transpile time; use multiple `<Text>` for dynamic content                                                                                                                          | ESLint    |
| `<Paragraph>` with prop reference                 | **Hard error** — same reason as template literals                                                                                                                                                                                           | ESLint    |
| `<Paragraph>` text fits on one line               | **Allowed** — degenerates to single `pdk_layout_text()` call (same as `<Text>`)                                                                                                                                                             | —         |
| `<Paragraph>` with single long word               | **Allowed** — word emitted on its own line as-is (no mid-word breaking)                                                                                                                                                                     | —         |

## Spacing Scale

Named tokens replace raw pixel values for common cases. Raw ints are always accepted as escape hatches.

| Token        | `<Gap>` pixels | `<Screen>` border |
| ------------ | -------------- | ----------------- |
| `"xs"`       | 3              | —                 |
| `"sm"`       | 6              | —                 |
| `"md"`       | 13             | —                 |
| `"lg"`       | 22             | —                 |
| `"tight"`    | —              | 8                 |
| `"standard"` | —              | 16                |
| `"wide"`     | —              | 24                |

Tokens are resolved to ints during AST→IR — the IR and emitters never see strings.

## Component API → C Mapping

```tsx
<Screen border="standard">          → pdk_draw_border(16);   // "tight"=8, "standard"=16, "wide"=24
<Screen border={20}>                → pdk_draw_border(20);   // raw int escape hatch

<Layout align="center">             → PdkLayout L = pdk_layout_start(Y); // Y computed at transpile time
<Layout align="top" padding={20}>   → PdkLayout L = pdk_layout_start(20);
<Layout align="bottom" padding={10}>→ PdkLayout L = pdk_layout_start(Y); // Y = 240 - contentHeight - 10
<Layout y={80}>                     → PdkLayout L = pdk_layout_start(80); // raw int escape hatch
<Layout y={30} lineGap={20}         → PdkLayout L = pdk_layout_start_ex(30, 20, 40);
        marginX={40}>

<Text align="center">Hello</Text>   → pdk_layout_text(&L, "Hello", PDK_ALIGN_CENTER);
<ItalicText>sub</ItalicText>        → pdk_layout_text_italic(&L, "sub", PDK_ALIGN_CENTER);
<MenuItem selected={i===0}>Go       → pdk_layout_menu_item(&L, "Go", i == 0);
  </MenuItem>
<Divider />                         → pdk_layout_divider(&L);
<Gap size="sm" />                   → pdk_layout_gap(&L, 6);  // "xs"=3, "sm"=6, "md"=13, "lg"=22
<Gap pixels={13} />                 → pdk_layout_gap(&L, 13); // raw int escape hatch
<CursorSet y={195} />               → L.y = 195;
<CursorShift y={-20} />             → L.y += -20;
<MarginSet x={90} />                → L.marginX = 90;

<Paragraph>Champion of the Tilt   → pdk_layout_text(&L, "Champion of the Tilt", PDK_ALIGN_CENTER);
  at Eshkar's Ford!</Paragraph>      pdk_layout_text(&L, "at Eshkar's Ford!", PDK_ALIGN_CENTER);
                                   // word-wrapped at transpile time using font metrics + available width
```

Default `align` is `"center"` for text (the most common case in Playdate games).

**`<Layout>` emit rules:**

- **`align` mode** (mutually exclusive with `y`):
  - `<Layout align="center">` → transpiler computes `y = (240 - contentHeight) / 2` at transpile time
  - `<Layout align="top" padding={P}>` → `y = P` (default padding: 0)
  - `<Layout align="bottom" padding={P}>` → `y = 240 - contentHeight - P` (default padding: 0)
  - `padding` is only valid with `align="top"` or `align="bottom"` — using it with `align="center"` is a hard transpile error
  - **Static content required:** `align` is a hard transpile error if the Layout contains conditionals or loops (content height varies at runtime). Use `y={N}` instead.
- **`y` mode** (raw int escape hatch):
  - `<Layout y={N}>` (no `lineGap`/`marginX`) → `pdk_layout_start(N)` — uses defaults: lineGap=22, marginX=30
  - `<Layout y={N} lineGap={G} marginX={M}>` → `pdk_layout_start_ex(N, G, M)` — both `lineGap` and `marginX` must be provided together (they map to a single `_ex` call)
- `lineGap` and `marginX` work the same in both modes

**`<MenuItem>` does not accept `align`** — the C function `pdk_layout_menu_item` hardcodes center alignment. Passing `align` to `<MenuItem>` is a hard transpile error.

**`<Text>` and `<ItalicText>` children rules:**

- Static string: `<Text>Hello</Text>` → `pdk_layout_text(&L, "Hello", ...)`
- Template literal: ``<Text>{`Score: ${pts}`}</Text>`` → `snprintf` + `pdk_layout_text`
- Prop reference: `<Text>{name}</Text>` → `pdk_layout_text(&L, name, ...)` (passes pointer directly, no copy)
- Mixed static + dynamic: `<Text>Hello {name}</Text>` → **hard transpile error** — use a template literal instead
- Zero-interpolation template literal: ``<Text>{`Hello`}</Text>`` → optimized to plain string `"Hello"` (no `snprintf`)
- Boolean in template literal: ``<Text>{`Val: ${confirmed}`}</Text>`` → **hard transpile error** — `0`/`1` in UI text is almost never intended

**`<ItalicText>` accepts `align`** just like `<Text>`. Same children rules apply.

**`<Paragraph>` children rules:**

- Static string only: `<Paragraph>Champion of the Tilt at Eshkar's Ford!</Paragraph>` → word-wrapped at transpile time into multiple `pdk_layout_text()` calls
- Template literals → **hard transpile error**: _"Paragraph requires static text for transpile-time word wrapping. Use multiple `<Text>` elements for dynamic content."_
- Prop references → **hard transpile error** (same reason)
- Mixed static + dynamic → **hard transpile error** (same reason)
- Whitespace normalization: all whitespace (newlines, tabs, multiple spaces) collapsed to single spaces before wrapping
- Accepts `align` prop (same as `<Text>`, default `"center"`)
- If text fits on one line, emits a single `pdk_layout_text()` (degenerates to `<Text>`)

**`<Paragraph>` word-wrap algorithm (transpile-time):**

The transpiler computes line breaks at transpile time using `font-parser.ts` metrics:

1. Compute available width: `400 - 2 * marginX` (from parent `<Layout>`, default marginX=30 → 340px)
2. Collapse and trim whitespace in the text content
3. Split on spaces into words
4. Greedy line-fill: accumulate words (measuring with `getTextWidth()`), emit a line break when the next word would exceed available width
5. Each resulting line emits one `pdk_layout_text(&L, "line", align)` call

Implementation: ~30-line `wrapText(text: string, maxWidth: number, font: PdkFont): string[]` utility in `wrap.ts`. A single word longer than `maxWidth` is emitted as-is on its own line (no mid-word breaking).

**`<Screen>` props:** `border` is required — every screen must declare its corner size (as a named token or raw int). Omitting `border` is a hard transpile error (forces intentional design).

**`<Gap>` props:** Exactly one of `size` (named token) or `pixels` (raw int) is required. Providing both or neither is a hard transpile error.

**Layout-only children:** `<Text>`, `<ItalicText>`, `<Paragraph>`, `<MenuItem>`, `<Divider>`, `<Gap>`, `<CursorSet>`, `<CursorShift>`, and `<MarginSet>` are only valid inside a `<Layout>`. Using them directly under `<Screen>` is a hard transpile error.

## Transpile-Time Content Height Calculation

When a `<Layout>` uses `align` instead of `y`, the transpiler computes total content height at transpile time by summing child advances:

| Operation           | Advance                                                     |
| ------------------- | ----------------------------------------------------------- |
| `text`/`italicText` | lineGap (default 22)                                        |
| `menuItem`          | lineGap + 6                                                 |
| `divider`           | 12 (fixed)                                                  |
| `gap` (named)       | spacing scale lookup                                        |
| `gap` (raw)         | pixels value                                                |
| `paragraph`         | lineGap × lineCount (line count computed at transpile time) |

Resolution:

- `align="center"` → `y = (240 - contentHeight) / 2`
- `align="top"` → `y = padding` (default 0)
- `align="bottom"` → `y = 240 - contentHeight - padding` (default 0)

The result is a concrete `y: number` in the IR — emitters are unaware that `align` existed. This computation happens in `ir.ts` during AST→IR construction.

**Static content requirement:** All children must have deterministic height. If a Layout using `align` contains conditionals (`{x && ...}`, ternaries) or loops (`.map()`), the transpiler emits a hard error: _"Layout with align cannot contain conditionals or loops — content height must be statically determinable. Use y={N} instead."_

## Canvas Renderer — Cursor Advance Reference

The Canvas renderer must match these exact per-operation cursor advances from `pdk_layout.c`:

| Operation              | Advance        | Notes                                 |
| ---------------------- | -------------- | ------------------------------------- |
| `text` / `text_italic` | `+lineGap`     | Default lineGap is 22                 |
| `menu_item`            | `+lineGap + 6` | 6px extra for highlight box padding   |
| `divider`              | `+12`          | Fixed — independent of lineGap        |
| `gap`                  | `+pixels`      | Can be negative (moves cursor upward) |

## Canvas Renderer — Rendering Details

Non-trivial rendering behaviors the Canvas renderer must replicate exactly:

**1-bit color model:**

- Canvas starts as **white** (all pixels 0xFF)
- All drawing is **black** (fill/stroke color `#000000`)
- Inverted mode (selected menu items): draw **white** text on a **black** filled rect
- No grayscale, no anti-aliasing — all pixel values are either black or white

**Border geometry (`pdk_draw_border`):** Exact coordinates from `pdk_draw.c`:

- Rect 1 (outer): `strokeRect(4, 4, 392, 232)` — `LCD_COLUMNS=400`, `LCD_ROWS=240`
- Rect 2 (outer, inset 1px): `strokeRect(5, 5, 390, 230)`
- Rect 3 (inner): `strokeRect(10, 10, 380, 220)`
- Corner triangles use `cornerSize` (cs) param. For top-left: `fillTriangle(10, 10, 10+cs, 10, 10, 10+cs)`. Top-right: `fillTriangle(389, 10, 389-cs, 10, 389, 10+cs)`. Bottom-left: `fillTriangle(10, 229, 10+cs, 229, 10, 229-cs)`. Bottom-right: `fillTriangle(389, 229, 389-cs, 229, 389, 229-cs)`
- This is **not** a simple `strokeRect` — the Canvas renderer must draw all 3 rects + 4 triangles

**Divider rendering:** 1px horizontal line at `(marginX, y)` to `(400 - marginX, y)`. Cursor advances by fixed 12px.

**Selected menu items (`pdk_layout_menu_item` with `selected=1`):**

1. Compute `boxH = lineGap + 6`, `padY = (boxH - fontHeight) / 2`
2. Fill black rect: position `(marginX, y - padY)`, size `(400 - 2*marginX) × boxH`
3. Draw text in **inverted mode** (white on black), centered horizontally
4. Restore normal draw mode

**Font height requirement:** `font-parser.ts` must expose `fontHeight` (from `.fnt` file), not just `getTextWidth()`. Menu item vertical centering depends on `(boxH - fontHeight) / 2`.

**Italic font fallback:** If no italic font is loaded, `pdk_layout_text_italic` falls back to the regular font (see `pdk_layout.c:67`). The Canvas renderer must replicate this: if `italicFont` is null/undefined, use `regularFont` for italic text ops.

**Alignment positioning:**

- `LEFT`: draw at `x = marginX`
- `CENTER`: draw at `x = (400 - textWidth) / 2`
- `RIGHT`: draw at `x = 400 - marginX - textWidth`

## Concrete Examples

### Example 1: Simple Static Screen

**Input** (`ConfirmNewGame.tsx`):

```tsx
type Props = {
  choice: number;
};

export function ConfirmNewGameScreen({ choice }: Props) {
  return (
    <Screen border="standard">
      <Layout align="center">
        <Text>Start a new game?</Text>
        <Gap size="xs" />
        <ItalicText>This will erase all progress.</ItalicText>
        <Divider />
        <Gap size="sm" />
        <MenuItem selected={choice === 0}>No, go back</MenuItem>
        <MenuItem selected={choice === 1}>Yes, start over</MenuItem>
      </Layout>
    </Screen>
  );
}
```

**Output** (`gen/screens.c`):

```c
void drawConfirmNewGameScreen(int choice) {
    pdk_draw_border(16);
    PdkLayout L = pdk_layout_start(59); /* align="center": (240 - 121) / 2 */
    pdk_layout_text(&L, "Start a new game?", PDK_ALIGN_CENTER);
    pdk_layout_gap(&L, 3);
    pdk_layout_text_italic(&L, "This will erase all progress.", PDK_ALIGN_CENTER);
    pdk_layout_divider(&L);
    pdk_layout_gap(&L, 6);
    pdk_layout_menu_item(&L, "No, go back", choice == 0);
    pdk_layout_menu_item(&L, "Yes, start over", choice == 1);
}
```

### Example 2: Conditional Rendering + Dynamic Text

**Input** (`TitleScreen.tsx`):

```tsx
type Props = {
  bestScore: number;
  hasSave: boolean;
  titleChoice: number;
};

export function TitleScreen({ bestScore, hasSave, titleChoice }: Props) {
  return (
    <Screen border="standard">
      <Layout y={80}>
        {' '}
        {/* raw y — intentional non-centered placement; align unavailable (conditionals) */}
        <Text>Steady On!</Text>
        <Gap size="xs" />
        {bestScore > 0 && <Text>{`Best: ${bestScore} pts`}</Text>}
        <Divider />
        <Gap size="sm" />
        {hasSave ? (
          <>
            <MenuItem selected={titleChoice === 0}>Continue</MenuItem>
            <MenuItem selected={titleChoice === 1}>New Game</MenuItem>
          </>
        ) : (
          <ItalicText>Press A to begin</ItalicText>
        )}
      </Layout>
    </Screen>
  );
}
```

**Output**:

```c
void drawTitleScreen(int bestScore, int hasSave, int titleChoice) {
    pdk_draw_border(16);
    PdkLayout L = pdk_layout_start(80);
    pdk_layout_text(&L, "Steady On!", PDK_ALIGN_CENTER);
    pdk_layout_gap(&L, 3); /* size="xs" */
    if (bestScore > 0) {
        char _buf0[32];
        snprintf(_buf0, sizeof(_buf0), "Best: %d pts", bestScore);
        pdk_layout_text(&L, _buf0, PDK_ALIGN_CENTER);
    }
    pdk_layout_divider(&L);
    pdk_layout_gap(&L, 6); /* size="sm" */
    if (hasSave) {
        pdk_layout_menu_item(&L, "Continue", titleChoice == 0);
        pdk_layout_menu_item(&L, "New Game", titleChoice == 1);
    } else {
        pdk_layout_text_italic(&L, "Press A to begin", PDK_ALIGN_CENTER);
    }
}
```

### Example 3: Loop + Selection State + Multiple Branches

**Input** (`TournamentVictory.tsx`):

```tsx
const victoryChoiceLabels = [
  'Send the money home',
  'Keep the purse',
  'Enter the next tournament',
];

type Props = {
  choice: number;
  confirmed: boolean;
  tournamentScore: number;
};

export function TournamentVictoryScreen({
  choice,
  confirmed,
  tournamentScore,
}: Props) {
  return (
    <Screen border="standard">
      {!confirmed ? (
        <Layout y={30} lineGap={20} marginX={40}>
          <Text>Champion of the Tilt</Text>
          <Text>at Eshkar's Ford!</Text>
          <Divider />
          <Text>The purse is yours.</Text>
          <Gap pixels={13} />
          {victoryChoiceLabels.map((label, i) => (
            <MenuItem selected={i === choice}>{label}</MenuItem>
          ))}
        </Layout>
      ) : (
        <Layout y={30}>
          <Text>{`Final Score: ${tournamentScore} pts`}</Text>
          <Gap pixels={-4} />
          <Divider />
          <CursorSet y={195} />
          <Divider />
          <Gap pixels={1} />
          <ItalicText>Press A to return.</ItalicText>
        </Layout>
      )}
    </Screen>
  );
}
```

**Output**:

```c
static const char *victoryChoiceLabels[3] = {
    "Send the money home",
    "Keep the purse",
    "Enter the next tournament",
};

void drawTournamentVictoryScreen(int choice, int confirmed, int tournamentScore) {
    pdk_draw_border(16);
    if (!confirmed) {
        PdkLayout L = pdk_layout_start_ex(30, 20, 40);
        pdk_layout_text(&L, "Champion of the Tilt", PDK_ALIGN_CENTER);
        pdk_layout_text(&L, "at Eshkar's Ford!", PDK_ALIGN_CENTER);
        pdk_layout_divider(&L);
        pdk_layout_text(&L, "The purse is yours.", PDK_ALIGN_CENTER);
        pdk_layout_gap(&L, 13);
        for (int i = 0; i < 3; i++)
            pdk_layout_menu_item(&L, victoryChoiceLabels[i], i == choice);
    } else {
        PdkLayout L = pdk_layout_start(30);
        char _buf0[64];
        snprintf(_buf0, sizeof(_buf0), "Final Score: %d pts", tournamentScore);
        pdk_layout_text(&L, _buf0, PDK_ALIGN_CENTER);
        pdk_layout_gap(&L, -4);
        pdk_layout_divider(&L);
        L.y = 195;
        pdk_layout_divider(&L);
        pdk_layout_gap(&L, 1);
        pdk_layout_text_italic(&L, "Press A to return.", PDK_ALIGN_CENTER);
    }
}
```

### Example 4: Left/Right Alignment + Prop Array `.map()`

**Input** (`ScoreBoard.tsx`):

```tsx
type Props = {
  names: string[];
  scores: number[];
};

export function ScoreBoardScreen({ names, scores }: Props) {
  return (
    <Screen border="standard">
      <Layout y={40} marginX={40} lineGap={20}>
        <Text>High Scores</Text>
        <Divider />
        {names.map((name, i) => (
          <>
            <Text align="left">{name}</Text>
            <CursorShift y={-20} />
            <Text align="right">{`${scores[i]} pts`}</Text>
          </>
        ))}
      </Layout>
    </Screen>
  );
}
```

**Output** (`.c`):

```c
void drawScoreBoardScreen(const char *const *names, int namesCount,
                          const int *scores, int scoresCount) {
    pdk_draw_border(16);
    PdkLayout L = pdk_layout_start_ex(40, 20, 40);
    pdk_layout_text(&L, "High Scores", PDK_ALIGN_CENTER);
    pdk_layout_divider(&L);
    for (int i = 0; i < namesCount; i++) {
        pdk_layout_text(&L, names[i], PDK_ALIGN_LEFT);
        L.y += -20;
        char _buf0[32];
        snprintf(_buf0, sizeof(_buf0), "%d pts", scores[i]);
        pdk_layout_text(&L, _buf0, PDK_ALIGN_RIGHT);
    }
}
```

**Output** (`.h`):

```c
#pragma once
#include "pdk_layout.h"

void drawConfirmNewGameScreen(int choice);
void drawLoreScreen(int choice);
void drawTitleScreen(int bestScore, int hasSave, int titleChoice);
void drawTournamentVictoryScreen(int choice, int confirmed, int tournamentScore);
void drawScoreBoardScreen(const char *const *names, int namesCount,
                          const int *scores, int scoresCount);
```

**Generated file structure:**

The `.h` file contains `#pragma once`, includes `pdk_layout.h` (for `PdkLayout`/`PdkAlign` types used transitively), and lists all function prototypes. `static` arrays remain in `.c` only (internal linkage).

The `.c` file begins with:

```c
/* Generated by pdk-tsx — DO NOT EDIT */
#include "screens.h"
#include "pdk_draw.h"
#include "pdk_layout.h"
#include <stdio.h>  /* snprintf — only if any screen uses template literals */
```

Function ordering in the `.c` and `.h` follows alphabetical order by screen name. The `.h` includes a `/* TitleScreen.tsx */` comment before each prototype for traceability.

### Example 5: Paragraph Auto-Wrapping

**Input** (`LoreScreen.tsx`):

```tsx
type Props = {
  choice: number;
};

export function LoreScreen({ choice }: Props) {
  return (
    <Screen border="standard">
      <Layout y={30} lineGap={20} marginX={40}>
        <Paragraph>
          Champion of the Tilt at Eshkar's Ford! The crowd roars as you raise
          your lance.
        </Paragraph>
        <Divider />
        <MenuItem selected={choice === 0}>Continue</MenuItem>
        <MenuItem selected={choice === 1}>Return to camp</MenuItem>
      </Layout>
    </Screen>
  );
}
```

**Output** (`.c`) — assuming font metrics break at ~320px available width (400 - 2×40):

```c
void drawLoreScreen(int choice) {
    pdk_draw_border(16);
    PdkLayout L = pdk_layout_start_ex(30, 20, 40);
    /* <Paragraph> — word-wrapped at transpile time */
    pdk_layout_text(&L, "Champion of the Tilt at", PDK_ALIGN_CENTER);
    pdk_layout_text(&L, "Eshkar's Ford! The crowd roars", PDK_ALIGN_CENTER);
    pdk_layout_text(&L, "as you raise your lance.", PDK_ALIGN_CENTER);
    pdk_layout_divider(&L);
    pdk_layout_menu_item(&L, "Continue", choice == 0);
    pdk_layout_menu_item(&L, "Return to camp", choice == 1);
}
```

Note: exact line breaks depend on the loaded `.fnt` font metrics. The comment in the C output aids traceability back to the `<Paragraph>` source element.

## IR Type Definitions

The IR is the single source of truth between parser, C emitter, and Canvas renderer. Defined in `types.ts`:

```ts
type ExprIR =
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'prop'; name: string }
  | { kind: 'index'; array: string; index: ExprIR }
  | {
      kind: 'comparison';
      op: '==' | '!=' | '>' | '<' | '>=' | '<=';
      left: ExprIR;
      right: ExprIR;
    }
  | { kind: 'arithmetic'; op: '+' | '-' | '*'; left: ExprIR; right: ExprIR }
  | { kind: 'not'; operand: ExprIR }
  | { kind: 'template'; parts: (string | ExprIR)[]; bufferSize: number };

type TextContent =
  | { kind: 'static'; value: string }
  | { kind: 'prop'; name: string }
  | { kind: 'template'; expr: ExprIR & { kind: 'template' } };

type OpIR =
  | {
      kind: 'text';
      content: TextContent;
      align: 'left' | 'center' | 'right';
      italic: boolean;
    }
  | { kind: 'menuItem'; content: TextContent; selected: ExprIR }
  | { kind: 'divider' }
  | { kind: 'gap'; pixels: number | ExprIR }
  | { kind: 'cursorSet'; y: number }
  | { kind: 'cursorShift'; y: number | ExprIR }
  | { kind: 'marginSet'; x: number }
  | {
      kind: 'paragraph';
      lines: string[];
      align: 'left' | 'center' | 'right';
    }
  | { kind: 'conditional'; condition: ExprIR; then: OpIR[]; else?: OpIR[] }
  | {
      kind: 'loop';
      array: string;
      itemName: string;
      indexName: string;
      body: OpIR[];
    }
  | { kind: 'rawC'; code: string };

type LayoutIR = {
  y: number;
  lineGap?: number; // undefined → use default (22)
  marginX?: number; // undefined → use default (30)
  ops: OpIR[];
};

type StaticArrayIR = {
  name: string;
  values: string[];
};

type PropIR = {
  name: string;
  tsType: 'number' | 'boolean' | 'string' | 'string[]' | 'number[]';
};

type ScreenIR = {
  name: string; // e.g., "ConfirmNewGameScreen"
  sourceFile: string; // e.g., "ConfirmNewGame.tsx"
  border: number;
  props: PropIR[];
  staticArrays: StaticArrayIR[];
  layouts: LayoutIR[]; // sequential Layout blocks (or in conditional branches)
  hasRawC: boolean; // flag for Canvas renderer warning
};
```

Fragment flattening happens during IR construction — fragments are never represented in the IR; their children are inlined into the parent's `ops` array.

## Naming Conventions

**Function names:** `{ScreenName}` → `draw{ScreenName}` — e.g., `TournamentVictoryScreen` → `drawTournamentVictoryScreen`

**Static array prefix (collision only):** Strip `Screen` suffix, lowercase first char — e.g., `TournamentVictoryScreen` → `tournamentVictory_`. Only applied when two screens define arrays with the same variable name.

**C parameter ordering:** Follows the declaration order in the `type Props` definition. Array props emit two adjacent params: the pointer first, then the auto-generated count — e.g., `names: string[]` → `const char *const *names, int namesCount`.

**Buffer names:** `_buf0`, `_buf1`, ... auto-incrementing per function scope (resets at each new function).

## Escape Hatches

1. **`<CursorSet y={N} />`**, **`<CursorShift y={N} />`**, and **`<MarginSet x={N} />`** — direct cursor/margin manipulation within a Layout. `CursorSet` assigns an absolute Y position; `CursorShift` adds a relative offset (can be negative)
2. **Hand-written C** — screens with heavy procedural drawing (game elements, animations, custom shapes) stay as `.c` files. The boundary is clean: some screens in `.tsx`, some in `.c`, both coexist.
3. **`<RawC code={`...`} />`** (advanced) — inject verbatim C for rare one-off cases. Uses JSX expression with template literal (not string attribute) to avoid quote escaping issues. **Canvas renderer skips `<RawC>` nodes** (no-op) — screens using `<RawC>` cannot be snapshot-tested. The test helper emits a warning when a screen contains `<RawC>`. Represented as `{ kind: 'rawC'; code: string }` in the IR.

## Project Structure

```
pd-kit/tools/pdk-tsx/
├── package.json              # name: "pdk-tsx", bin: { "pdk-tsx": "./dist/cli.js" }
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── cli.ts                # CLI: --screens, --outDir, --watch
│   ├── parse.ts              # ts.createSourceFile → AST
│   ├── validate.ts           # Check constructs in supported subset
│   ├── ir.ts                 # AST → IR (ScreenIR, OpIR, ExprIR)
│   ├── emit-c.ts             # IR → .c/.h strings
│   ├── emit-canvas.ts        # IR → Canvas render functions
│   ├── font-parser.ts        # Parse Playdate .fnt + companion bitmap PNG
│   ├── wrap.ts               # Transpile-time word wrapping using font metrics
│   ├── canvas-renderer.ts    # 400x240 1-bit canvas (PdkCanvasRenderer)
│   ├── types.ts              # IR type definitions
│   └── jsx.d.ts              # JSX intrinsic element types for in-editor validation
├── test/
│   ├── parse.test.ts
│   ├── emit-c.test.ts
│   ├── emit-canvas.test.ts
│   ├── font-parser.test.ts
│   ├── wrap.test.ts
│   ├── parity.test.ts        # Canvas vs C reference harness pixel comparison
│   ├── fixtures/             # .tsx inputs + expected .c/.h outputs
│   └── golden/               # Blessed PNGs captured from Playdate Simulator
├── fonts/                    # Test font fixtures
└── c-reference-harness/      # Small C program for pixel-level parity testing
    ├── harness.c             # Links pdk_layout.c/pdk_draw.c, renders to raw framebuffer
    ├── mock_pd_api.c         # ~10 mock Playdate graphics functions → pixel buffer
    └── Makefile              # Compiles with system cc, outputs 400x240 raw bitmap
```

## Build Integration (Game Makefile)

```makefile
# Add to game Makefile:
GEN_SCREENS = src/gen/screens.c src/gen/screens.h
SCREEN_TSX  = $(wildcard src/screens/*.tsx)

src/gen/screens.c src/gen/screens.h: $(SCREEN_TSX)
	pnpm pdk-tsx --outDir src/gen --screens src/screens

SRC += src/gen/screens.c
UINCDIR += src/gen
```

Dev workflow: `pnpm pdk-tsx --watch --outDir src/gen --screens src/screens`

Generated files go in `src/gen/` (gitignored). The game's `main.c` includes `screens.h` and calls the generated draw functions from its state machine.

## Snapshot Testing

```tsx
// steady-on/test/screens.test.tsx
import { renderScreen } from 'pdk-tsx/testing';

test('victory choice 0', async () => {
  const png = await renderScreen(TournamentVictoryScreen, {
    choice: 0,
    confirmed: false,
    tournamentScore: 450,
  });
  expect(png).toMatchPlaydateSnapshot('victory-choice-0');
});
```

No simulator. Runs in ~1s. Works on Linux. Update snapshots with `--update`.

## Font Rendering

Exact pixel-match with device:

1. Parse Playdate `.fnt` text file (tracking value, per-character widths)
2. Load companion bitmap table PNG (`-table-W-H.png` with glyph grid)
3. Extract per-glyph bitmaps, blit to canvas for text rendering
4. `getTextWidth(text)` sums character widths + tracking for centering math

## Dependencies

```json
{
  "dependencies": {
    "typescript": "^5.x"
  },
  "devDependencies": {
    "@napi-rs/canvas": "^0.1.x",
    "vitest": "^3.x",
    "fast-check": "^4.x"
  }
}
```

The TypeScript compiler API (`ts.createSourceFile`) is used at runtime by the CLI, so `typescript` is a regular dependency. `@napi-rs/canvas` is devDependencies (only used for snapshot tests, not for C emission). CLI argument parsing uses Node's built-in `parseArgs` (no external dep). Watch mode uses `fs.watch` (no chokidar needed for simple glob watching).

## Error Reporting

**Format:** `{file}:{line}:{col} — error: {message}` — matches TSC-style for IDE integration.

**Partial failure:** If `--screens` directory has 5 `.tsx` files and 1 has errors, the transpiler **fails entirely** and writes no output. Partial output is worse than no output — it creates silent divergence between source and generated code.

**`--watch` error recovery:** On error, print diagnostics and keep watching. On next successful parse, overwrite output. Last valid output is NOT preserved — the developer must fix the error.

**Source traceability:** Generated `.c` includes line comments before each function:

```c
/* ConfirmNewGame.tsx */
void drawConfirmNewGameScreen(int choice) {
```

## Implementation Phases

| Phase | What                                      | Description                                                                                                                                                                 |
| ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | IR types + parser + validator + JSX types | Define `ScreenIR`/`OpIR`/`ExprIR`, parse TSX via TS compiler API, validate subset, ship `jsx.d.ts` with intrinsic element definitions for in-editor prop/element validation |
| 2     | C emitter                                 | IR → `.c`/`.h` generation with snprintf buffers, static arrays, for loops, if/else                                                                                          |
| 3     | CLI tool                                  | `--screens`, `--outDir`, `--watch` modes                                                                                                                                    |
| 4     | Font parser                               | Parse `.fnt` format + bitmap table PNG, text measurement + rendering                                                                                                        |
| 5     | Canvas renderer + constants               | Extract shared `constants.ts`; port `pdk_layout.c`/`pdk_draw.c` to TS, render to `@napi-rs/canvas`                                                                          |
| 6     | Snapshot testing                          | `renderScreen()` → PNG, `toMatchPlaydateSnapshot()` vitest matcher, golden masters from simulator                                                                           |
| 7     | C reference harness + parity              | Build C harness, pixel-level PBT (Canvas vs C), CI drift detection, validate with real screens                                                                              |

## Key Risks

| Risk                                  | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout constant drift (C vs TS)       | Single `constants.ts` source of truth (see §Shared Constants); C reference harness pixel-diff in CI catches any divergence automatically                                                                                                                                                                                                                                                                                                                            |
| Template literal buffer overflow      | `%d` interpolations: literal chars + 16/interpolation, min 32, round to power of 2. `%s` (string prop) interpolations: **hard transpile error** — unbounded length is unsafe for fixed buffers; use `<Text>{name}</Text>` instead (passes pointer directly, no snprintf). Buffer names use `_bufN` convention (N auto-increments per function scope, resets at each new function). Literal `%` chars in template text must be escaped to `%%` in the format string. |
| Scope creep (wanting closures, hooks) | Hard subset boundary with clear errors; complex screens stay in C                                                                                                                                                                                                                                                                                                                                                                                                   |
| Font rendering edge cases             | Playdate fonts are simple bitmap with uniform tracking (no kerning); golden master PNGs from simulator; C harness pixel-diff                                                                                                                                                                                                                                                                                                                                        |
| Build ordering                        | Makefile order-only prerequisite; transpiler is fast (<100ms)                                                                                                                                                                                                                                                                                                                                                                                                       |
| Dual-output divergence (C vs Canvas)  | Four-layer defense: shared constants, golden master PNGs, C reference harness pixel-diff, CI gate (see §Dual-Output Parity)                                                                                                                                                                                                                                                                                                                                         |

## Shared Constants

All magic numbers from `pdk_layout.c` and `pdk_draw.c` are extracted into a single `src/constants.ts` file. Both `emit-canvas.ts` and the test suite import from this file — there is no second copy of these values.

```ts
// src/constants.ts
export const LCD_COLUMNS = 400;
export const LCD_ROWS = 240;

// pdk_layout defaults
export const DEFAULT_LINE_GAP = 22;
export const DEFAULT_MARGIN_X = 30;

// Cursor advances (from pdk_layout.c)
export const ADVANCE_TEXT = 'lineGap'; // +lineGap
export const ADVANCE_MENU_ITEM_EXTRA = 6; // +lineGap + 6
export const ADVANCE_DIVIDER = 12; // fixed
// gap advance = pixels arg (can be negative)

// Border geometry (from pdk_draw.c)
export const BORDER_OUTER_1 = { x: 4, y: 4, w: 392, h: 232 };
export const BORDER_OUTER_2 = { x: 5, y: 5, w: 390, h: 230 };
export const BORDER_INNER = { x: 10, y: 10, w: 380, h: 220 };

// Menu item highlight
export const MENU_ITEM_PAD_EXTRA = 6; // boxH = lineGap + 6
```

If a constant changes in the C source, updating `constants.ts` is the only action needed — tests and renderer pick it up automatically.

## Dual-Output Parity

The Canvas renderer and C emitter must produce pixel-identical output. Four layers of defense:

### Layer 1: Shared Constants (Phase 5)

`constants.ts` eliminates the most common divergence source — hardcoded magic numbers. Both the Canvas renderer and tests reference the same values.

### Layer 2: Golden Master PNGs (Phase 6)

Capture 3-5 reference screenshots from the Playdate Simulator for real steady-on screens. These are checked into `test/golden/` and serve as ground truth. The Canvas renderer must match these exact pixels. Stored as 1-bit PNGs (400x240, black and white only).

Workflow:

1. Build and run steady-on in the Playdate Simulator
2. Navigate to each screen with known prop values
3. Capture screenshots → `test/golden/confirm-new-game-choice0.png`, etc.
4. Canvas renderer output is compared against these — not against "expected" output we invented

### Layer 3: C Reference Harness (Phase 7)

A small C program in `c-reference-harness/` that links the real `pdk_layout.c` and `pdk_draw.c` against ~10 mock Playdate graphics functions. The mocks write to a 400x240 pixel buffer instead of the Playdate LCD.

```c
// mock_pd_api.c — implements just enough of the Playdate API
static uint8_t framebuffer[400 * 240];  // 1-bit: 0=white, 1=black

void mock_fillRect(int x, int y, int w, int h) {
    for (int py = y; py < y + h && py < 240; py++)
        for (int px = x; px < x + w && px < 400; px++)
            framebuffer[py * 400 + px] = 1;
}
// ... strokeRect, drawText (using same .fnt bitmap data), fillTriangle
```

The harness compiles with system `cc` (no Playdate SDK needed), takes a screen function + props on stdin/args, renders to the framebuffer, and dumps the raw bitmap to stdout. The test suite (`parity.test.ts`) then compares Canvas output against the C harness output pixel-by-pixel.

**PBT integration:** Generate random `ScreenIR` trees with fast-check → emit C → compile and run via harness → compare against Canvas render of the same IR → pixel diff must be 0. This catches divergence in logic, constants, AND rendering.

### Layer 4: CI Drift Detection (Phase 7)

A CI step that runs on every commit touching `pdk_layout.c`, `pdk_draw.c`, or `pdk-tsx/src/`:

```yaml
# In CI config
- name: Parity check
  run: |
    cd tools/pdk-tsx
    pnpm test -- --run test/parity.test.ts
```

If someone tweaks a constant in C and forgets to update `constants.ts`, or changes cursor advance logic, the pixel diff fails immediately. No silent drift.

## Critical Files

| File                           | Role                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `pd-kit/src/pdk_layout.c`      | Layout cursor logic — source of truth for Canvas renderer port                 |
| `pd-kit/src/pdk_draw.c`        | Draw primitives — border, divider, centered text                               |
| `pd-kit/src/pdk_layout.h`      | Struct/enum definitions (PdkLayout, PdkAlign)                                  |
| `pdk-tsx/src/constants.ts`     | Shared layout constants — single source of truth for Canvas renderer and tests |
| `pdk-tsx/c-reference-harness/` | C harness for pixel-level parity testing against Canvas renderer               |
| `steady-on/src/draw.c`         | Real screen functions for migration and validation                             |
| `steady-on/Makefile`           | Build integration pattern                                                      |
