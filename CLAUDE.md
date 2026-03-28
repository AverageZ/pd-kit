# pd-kit — Shared Playdate C Library

A shared library of common Playdate game utilities. Lives alongside game projects as a sibling directory — games compile pd-kit sources directly (no separate library build).

## Developer Context
The developer is learning C and comes from a TypeScript background. When modifying pd-kit:
- Explain C concepts by drawing parallels to TypeScript
- All public symbols use `pdk_` prefix (functions) or `PDK_` prefix (macros)
- Keep modules independent — each can be used without the others

## Build & Test
- **Run tests**: `make test` (compiles pure-math modules with system `cc`, no SDK needed)
- **Clean**: `make clean`

## Modules

| Module | SDK needed? | Description |
|--------|------------|-------------|
| `pdk_crank.c/h` | No | Crank angle → value mapping (clamp + lerp) |
| `pdk_draw.c/h` | Yes | Centered text, decorative border, horizontal divider |
| `pdk_save.c/h` | Yes | Generic versioned binary save/load |
| `pdk_game_loop.h` | Yes | Header-only: `PDK_ALLOC` macro, DLL export macro |
| `pdk_test.h` | No | Header-only: `PDK_ASSERT`, `PDK_TEST_SUITE`, etc. |
| `pbt.c/h` | No | Property-based testing: RNG, generators, property runner |

## How Games Consume pd-kit

Games reference pd-kit via relative path `../pd-kit/`. Add to your game's Makefile:

```makefile
PDK = ../pd-kit
VPATH += src:$(PDK)/src
SRC = src/main.c src/draw.c src/your_game.c \
      $(PDK)/src/pdk_crank.c $(PDK)/src/pdk_draw.c $(PDK)/src/pdk_save.c
UINCDIR = src $(PDK)/src $(PDK)/include

include $(PDK)/Makefile.inc
include $(SDK)/C_API/buildsupport/common.mk
```

No separate library build step. pd-kit `.c` files compile alongside your game's sources.

## API Quick Reference

### pdk_crank_map
```c
float pdk_crank_map(float crankAngle, float window, float outMin, float outMax);
```
Maps crank angle through a window to an output range. Angles > 180° snap to 0 (reset). Angles > window clamp to window.

### pdk_draw_*
```c
void pdk_draw_init(PlaydateAPI *pd, LCDFont *font);
void pdk_draw_centered(const char *text, int y);
void pdk_draw_border(int cornerSize);
void pdk_draw_divider(int y, int marginX);
```
Call `pdk_draw_init()` once during `kEventInit`. Each game keeps its own draw module for game-specific rendering and calls both `pdk_draw_*` and its own functions.

### pdk_save_*
```c
void pdk_save_init(PlaydateAPI *pd);
int  pdk_save_write(const char *filename, const void *data, int size);
int  pdk_save_load(const char *filename, void *data, int size);
```
Each game defines its own `SaveData` struct. The zero-fill-before-read pattern is handled by the library. Call `pdk_save_init()` once during `kEventInit`.

### PDK_ALLOC (macro)
```c
GameContext *ctx = PDK_ALLOC(pd, GameContext);
```
Allocates and zero-fills a struct via the Playdate allocator.

### pbt (Property-Based Testing)
```c
PBTRng    pbt_rng_seed(uint64_t seed);
int       pbt_int(PBTRng *rng, int min, int max);
float     pbt_float(PBTRng *rng, float min, float max);
int       pbt_enum(PBTRng *rng, int count);
int       pbt_bool(PBTRng *rng);
int       pbt_weighted(PBTRng *rng, int pct);
int       pbt_check(const char *name, PBTProperty prop, void *ctx, int num_runs);
#define   PBT_ASSERT(cond)   // return 0 (fail) if false
#define   PBT_PASS           // return 1 (pass)
```
C equivalent of fast-check. Games define per-project arbitraries in `test/arbitraries.h` and properties in `test/test_properties.c`. Uses xorshift64 RNG — deterministic, seedable. On failure, prints the seed for replay. Compile into test targets with `$(PDK)/src/pbt.c`.

## Project Structure
```
pd-kit/
├── src/           # Compiled source modules (.c + .h)
├── include/       # Header-only modules + umbrella header
├── test/          # Unit tests (pure math, no SDK)
└── build/         # Test build output (gitignored)
```

## Anti-Requirements
- **No standalone binary** — pd-kit is always compiled as part of a game
- **No version pinning** — all games always use the latest pd-kit
- **No game-specific code** — mechanics, assets, and state machines stay in game projects
