/**
 * pdk.h — pd-kit umbrella header
 *
 * Include this single header to get all pd-kit modules.
 * Or include individual module headers for finer control.
 *
 * NOTE: SDK-dependent headers (pdk_draw, pdk_layout, pdk_save) require
 * the Playdate SDK include path. This header is meant for use by
 * consuming games, not by pd-kit's own tests.
 */

#ifndef PDK_H
#define PDK_H

/* SDK-independent */
#include "pdk_crank.h"
#include "pdk_game_loop.h"
#include "pdk_test.h"

/* SDK-dependent (require pd_api.h on the include path) */
#include "pdk_draw.h"
#include "pdk_layout.h"
#include "pdk_save.h"

#endif /* PDK_H */
