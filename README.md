# pd-kit

Shared C utility library for [Playdate](https://play.date/) games. Games compile pd-kit sources directly alongside their own — no separate library build step.

## Modules

| Module          | SDK needed? | Description                                              |
| --------------- | ----------- | -------------------------------------------------------- |
| `pdk_crank`     | No          | Crank angle to value mapping (clamp + lerp)              |
| `pdk_draw`      | Yes         | Centered text, decorative border, horizontal divider     |
| `pdk_layout`    | Yes         | Cursor-based text layout with alignment and menu items   |
| `pdk_save`      | Yes         | Generic versioned binary save/load                       |
| `pdk_game_loop` | Yes         | Header-only: `PDK_ALLOC` macro, DLL export macro         |
| `pdk_test`      | No          | Header-only: assert and test suite macros                |
| `pbt`           | No          | Property-based testing: RNG, generators, property runner |

All public symbols use the `pdk_` prefix (functions) or `PDK_` prefix (macros).

## Usage

Add pd-kit as a git submodule in your game project:

```bash
git submodule add https://github.com/AverageZ/pd-kit.git pd-kit
```

Then wire it into your game's Makefile:

```makefile
PDK = pd-kit
VPATH += src:$(PDK)/src
SRC = src/main.c src/your_game.c \
      $(PDK)/src/pdk_crank.c $(PDK)/src/pdk_draw.c $(PDK)/src/pdk_save.c
UINCDIR = src $(PDK)/src $(PDK)/include

# Must appear before includes so compile_commands doesn't become default
.DEFAULT_GOAL := all

include $(PDK)/Makefile.inc
include $(SDK)/C_API/buildsupport/common.mk
```

Include what you need:

```c
#include <pdk.h>          // everything
#include <pdk_crank.h>    // or just individual modules
```

> **Sibling directory alternative:** set `PDK = ../pd-kit` to reference pd-kit as a sibling directory instead of a submodule.

## Testing

```bash
make test    # compiles and runs pure-math tests (no SDK needed)
make clean   # removes build artifacts
```

## Project Structure

```
pd-kit/
├── src/           # Compiled modules (.c + .h)
├── include/       # Header-only modules + umbrella header
├── test/          # Unit tests (pure math, no SDK)
├── Makefile       # Test targets
└── Makefile.inc   # SDK detection + compile_commands (for consuming games)
```
