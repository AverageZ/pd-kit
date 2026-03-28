/**
 * pdk_save.h — Generic versioned binary save/load
 *
 * Wraps the Playdate file API with error logging and forward-compatible
 * versioned I/O. Games define their own SaveData struct and pass raw
 * bytes through these functions.
 *
 * Requires Playdate SDK. Call pdk_save_init() once during kEventInit.
 */

#ifndef PDK_SAVE_H
#define PDK_SAVE_H

#include "pd_api.h"

/**
 * Initialize the save module with the Playdate API pointer.
 */
void pdk_save_init(PlaydateAPI *pd);

/**
 * Write binary data to a save file.
 *
 * @param filename  File path within the Playdate data directory
 * @param data      Pointer to the data to write
 * @param size      Number of bytes to write
 * @return          1 on success, 0 on failure (logged to console)
 */
int pdk_save_write(const char *filename, const void *data, int size);

/**
 * Load binary data from a save file.
 *
 * Zero-fills the output buffer before reading so that if the file is
 * shorter than expected (old save version), new fields default to 0.
 *
 * @param filename  File path within the Playdate data directory
 * @param data      Pointer to buffer to fill
 * @param size      Size of the buffer in bytes
 * @return          Number of bytes read, or 0 on failure (logged to console)
 */
int pdk_save_load(const char *filename, void *data, int size);

#endif /* PDK_SAVE_H */
