/**
 * pdk_game_loop.h — Header-only macros for Playdate game setup
 *
 * Provides the allocator macro and event handler boilerplate that both
 * steady-on and arch-rivals repeat identically in main.c.
 */

#ifndef PDK_GAME_LOOP_H
#define PDK_GAME_LOOP_H

/**
 * Allocate a zeroed struct using the Playdate allocator.
 *
 * Equivalent to malloc + memset(0), but uses pd->system->realloc which
 * goes through the Playdate memory tracker. realloc(NULL, size) behaves
 * like malloc — this is standard C.
 *
 * Usage:
 *   GameContext *ctx = PDK_ALLOC(pd, GameContext);
 */
#define PDK_ALLOC(pd, type)                                                    \
  (type *)({                                                                   \
    void *_p = (pd)->system->realloc(NULL, sizeof(type));                      \
    if (_p)                                                                    \
      __builtin_memset(_p, 0, sizeof(type));                                   \
    _p;                                                                        \
  })

/**
 * Standard Playdate event handler DLL export prefix.
 *
 * Place before `int eventHandler(...)` to handle both Windows DLL
 * and normal builds:
 *
 *   PDK_EVENT_HANDLER_EXPORT
 *   int eventHandler(PlaydateAPI *pd, PDSystemEvent event, uint32_t arg) {
 *       ...
 *   }
 */
#ifdef _WINDLL
#define PDK_EVENT_HANDLER_EXPORT __declspec(dllexport)
#else
#define PDK_EVENT_HANDLER_EXPORT
#endif

#endif /* PDK_GAME_LOOP_H */
