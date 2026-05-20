#ifndef CAPTURE_H
#define CAPTURE_H

#include <switch.h>
#include <stddef.h>

/**
 * Captures the screen of the Nintendo Switch.
 * 
 * @param out_buffer Pointer to a buffer that will be allocated and filled with JPEG data.
 * @param out_size Pointer to a variable that will receive the size of the buffer.
 * @return true if successful, false otherwise.
 */
bool captureScreen(char** out_buffer, size_t* out_size);

#endif
