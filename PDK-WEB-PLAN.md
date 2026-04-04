# PDK-Web: Playdate Games in the Browser

## Context

Play Playdate games on the web. Three approaches were evaluated: (1) compile C to WASM via Emscripten with a JS PlaydateAPI shim, (2) extend pdk-tsx's Canvas renderer into a full TS game runtime, (3) hybrid WASM logic + TS UI.

**Verdict: Approach 1 (Emscripten/WASM) wins decisively.** It runs existing C games unmodified, the shim surface is only ~40 API functions, and the 1-bit 400x240 display is trivially fast in Canvas2D.

---

## Why Not TSX or Hybrid?

**TSX → IR → Canvas (Approach 2):** pdk-tsx covers static screen layout only (~30% of a game). Gameplay — state machines, physics, sprites, procedural drawing, audio — would require building a full 2D game engine in TS and rewriting every game from scratch. steady-on alone is 4,357 lines of C with balance physics, 20 game states, and tournament progression. Three.js is overkill for a 1-bit 400x240 display — Canvas2D ImageData handles it perfectly.

**Hybrid WASM + TS UI (Approach 3):** Ends up being Approach 1 but harder. You still need the full graphics shim (C draw code calls PlaydateAPI), plus a cross-language state bridge for deeply interleaved draw/state code. Worst of both worlds.

---

## Architecture (Emscripten/WASM)

```
game/src/*.c + pd-kit/src/*.c
        │
   Emscripten (emcc)
        │
        ▼
   game.wasm + game.js (glue)
        │
   playdate-shim.js  ← implements PlaydateAPI function pointers
   ├─ graphics.js    ← Canvas2D (400x240 ImageData, 1-bit)
   ├─ input.js       ← keyboard → buttons, scroll wheel → crank
   ├─ audio.js       ← Web Audio API sample player
   ├─ save.js        ← localStorage binary blobs
   ├─ system.js      ← logging, timing, 30fps frame pump
   └─ font.js        ← .fnt parser (shared with pdk-tsx)
        │
        ▼
   index.html (400×240 canvas, scaled 2-3x)
```

**Key insight:** PlaydateAPI is already a struct of function pointers. Games call `pd->graphics->drawRect(...)`, etc. The shim populates those pointers with JS-backed implementations via Emscripten's `--js-library`. Game C code does not change at all.

---

## API Shim Surface

Measured from steady-on + arch-rivals — the distinct API functions that need shimming:

| Subsystem | Functions | Complexity | Browser Target |
|-----------|-----------|------------|----------------|
| Graphics | 20 (drawRect, fillTriangle, drawText, drawScaledBitmap, setDrawMode, setDrawOffset, etc.) | Medium | Canvas2D ImageData |
| Input | 3 (getButtonState, getCrankAngle, getCrankChange) + isCrankDocked | Low | keydown/keyup + scroll wheel |
| Audio | 6 (sample load/play/stop/volume/isPlaying + loop) | Medium | Web Audio AudioBufferSourceNode |
| File I/O | 5 (open/read/write/close/geterr) | Low | localStorage + base64 |
| System | 6 (log, error, time, realloc, setUpdateCallback, drawFPS) | Low | console, Date, rAF |
| Display | 1 (setInverted) | Low | Pixel buffer inversion |
| **Total** | **~40** | | |

---

## Phased Delivery

| Phase | What | Effort | LOC (est.) |
|-------|------|--------|------------|
| 1 | Emscripten build system + game loop pump + clear/setFont | Small | ~70 |
| 2 | Graphics shim (rect, line, triangle, ellipse, text, bitmap) | Medium | ~400 |
| 3 | Font loading (.fnt parser, glyph blitting) | Medium | ~200 |
| 4 | Input shim (buttons + crank) | Small | ~80 |
| 5 | Audio shim (sample load/play/loop) | Small-Medium | ~150 |
| 6 | Save shim (localStorage) | Small | ~50 |
| 7 | Asset pipeline (.pdx extraction or --preload-file) | Small | ~80 |
| 8 | Polish (2x/3x scaling, touch input, mobile layout) | Medium | ~100 |
| **Total** | | **Medium** | **~1,100** |

---

## How It Works (Detail)

### Game Loop

The Playdate game lifecycle is:
1. System calls `eventHandler(pd, kEventInit, 0)` — game allocates state, loads assets
2. Game calls `pd->system->setUpdateCallback(update, ctx)` — registers per-frame callback
3. System calls `update(ctx)` at 30fps — game logic + rendering

The WASM shim replicates this:
1. On page load, call the exported `eventHandler` with a fake `PlaydateAPI` struct populated with JS-backed function pointers
2. Store the update callback registered via `setUpdateCallback`
3. Use `requestAnimationFrame` throttled to 30fps (skip every other frame) to call the stored update function

### Graphics

The 1-bit model maps cleanly to a 400x240 `ImageData` buffer:
- Canvas starts white (0xFF per pixel)
- All drawing is black (0x00)
- Selected menu items: white text on black rect (inverted)
- `setDrawMode(kDrawModeXOR)`: manual pixel XOR on the buffer (no Canvas2D composite equivalent)
- `setDrawOffset(dx, dy)`: translate all subsequent draws (used for screen shake)
- `setInverted`: flip all pixels in buffer
- `drawScaledBitmap`: decode PNG to ImageData, scale and blit manually (1-bit, no interpolation)
- After all draw calls, put the ImageData to a visible canvas (optionally scaled 2-3x with `imageSmoothingEnabled = false`)

### Font Rendering

Playdate uses bitmap fonts (`.fnt` files + glyph PNG strip). The pdk-tsx plan already specifies a `font-parser.ts` that:
- Parses `.fnt` header (tracking, line height)
- Extracts per-glyph metrics (width, offset)
- Slices glyph bitmaps from the PNG strip

This is directly reusable for `drawText` and `getTextWidth` in the web shim.

### Input Mapping

| Playdate | Web |
|----------|-----|
| D-pad (up/down/left/right) | Arrow keys |
| A button | Z key (or Space) |
| B button | X key (or Escape) |
| Crank angle | Mouse scroll wheel accumulator (0-360°) |
| Crank change | Scroll wheel delta per frame |
| Crank docked | Toggle key (e.g., C) or always undocked |

`getButtonState` returns a bitmask with current/pushed/released — track from keydown/keyup events, compute per-frame deltas.

### Audio

steady-on uses sample-based audio exclusively (no synth, no file player):
- `sample->load(path)` → fetch WAV via HTTP, decode to `AudioBuffer`
- `sampleplayer->play(player, repeat, rate)` → `AudioBufferSourceNode.start()`, set `loop = (repeat == 0)`
- `sampleplayer->stop(player)` → `AudioBufferSourceNode.stop()`
- `sampleplayer->setVolume(player, left, right)` → `GainNode.gain.value = (left + right) / 2`
- Web Audio autoplay policy: "Click to start" overlay on first load

### Save System

pd-kit's `pdk_save` does simple binary blob read/write:
- `file->open(path, kFileWrite)` → key in localStorage
- `file->write(file, data, size)` → base64-encode bytes, store in localStorage
- `file->read(file, data, size)` → base64-decode, copy to WASM memory
- `file->close(file)` → no-op

---

## pdk-tsx Synergy

pdk-tsx should proceed as designed (different problem: fast UI snapshot testing without the Simulator). Components that feed directly into PDK-web:

| Component | pdk-tsx Use | PDK-web Use |
|-----------|------------|-------------|
| `font-parser.ts` | Parse .fnt for Canvas snapshot rendering | Parse .fnt for `drawText`/`getTextWidth` shim |
| `constants.ts` | LCD dimensions, layout defaults | Same constants for shim |
| `c-reference-harness/mock_pd_api.c` | Validate C output matches Canvas | Direct prototype for JS shim architecture |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `setDrawMode(kDrawModeXOR)` — no Canvas2D equivalent | Medium | Manual pixel XOR on ImageData buffer (~20 lines) |
| Bitmap table loading (`-table-W-H.png` convention) | Medium | Parse filename convention, slice spritesheet into frames |
| Web Audio autoplay policy | Low | Standard "click to play" overlay |
| 30fps timing accuracy | Low | `requestAnimationFrame` with frame skip, or `setInterval(33.3ms)` |
| `__builtin_memset` in `PDK_ALLOC` | Low | Emscripten's clang supports it; fallback: `#ifdef __EMSCRIPTEN__` → `memset` |
| Large spritesheets / asset size | Low | Emscripten `--preload-file` bundles assets; lazy HTTP fetch as alternative |

---

## Critical Files

| File | Why |
|------|-----|
| `pd-kit/src/pdk_draw.c` | 54 lines — defines minimum graphics shim surface |
| `pd-kit/src/pdk_layout.c` | 99 lines — text layout calls that the shim must support |
| `pd-kit/include/pdk_game_loop.h` | Entry point macros, PDK_ALLOC |
| `steady-on/src/main.c` | eventHandler/update pattern the WASM shim must replicate |
| `steady-on/src/draw.c` | Full graphics API usage (drawScaledBitmap, fillEllipse, setDrawMode, etc.) |
| `steady-on/src/audio.c` | Complete audio API surface |
| `PDK-TSX-PLAN.md` | Font-parser and c-reference-harness specs to reuse |

---

## Verification Plan

1. Compile steady-on with Emscripten targeting WASM
2. Load in browser — visual comparison against Simulator screenshots for each game state
3. Input: verify d-pad navigation, A/B buttons, crank control in jousting
4. Audio: all 15+ SFX play correctly, ambient loops work
5. Save: persist tournament progress across page reloads
6. Performance: consistent 30fps on mid-range hardware (96KB framebuffer, no GPU needed)