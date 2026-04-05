/**
 * pdk_save.c — Generic versioned binary save/load
 *
 * Extracted from steady-on/src/save.c. The game-specific SaveData struct
 * and field mapping stay in the game — this module handles the raw file I/O,
 * error logging, and zero-fill-before-read pattern.
 */

#include "pdk_save.h"

#include <string.h>

static PlaydateAPI *pd = NULL;

void pdk_save_init(PlaydateAPI *playdate) {
    pd = playdate;
}

int pdk_save_write(const char *filename, const void *data, int size) {
    SDFile *f = pd->file->open(filename, kFileWrite);
    if (f == NULL) {
        pd->system->logToConsole("pdk_save: failed to open '%s' for writing: %s", filename,
                                 pd->file->geterr());
        return 0;
    }

    int written = pd->file->write(f, data, size);
    pd->file->close(f);

    if (written != size) {
        pd->system->logToConsole("pdk_save: write incomplete (%d of %d bytes)", written, size);
        return 0;
    }

    return 1;
}

int pdk_save_load(const char *filename, void *data, int size) {
    SDFile *f = pd->file->open(filename, kFileReadData);
    if (f == NULL) {
        pd->system->logToConsole("pdk_save: no save file '%s' found", filename);
        return 0;
    }

    /* Zero-fill before read so that if the file is shorter than the current
     * struct (old save version), new fields default to 0. */
    memset(data, 0, size);

    int bytesRead = pd->file->read(f, data, size);
    pd->file->close(f);

    if (bytesRead < 0) {
        pd->system->logToConsole("pdk_save: read error on '%s'", filename);
        return 0;
    }

    return bytesRead;
}
