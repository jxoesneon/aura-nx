#ifndef INPUT_INJECTOR_H
#define INPUT_INJECTOR_H

#include <switch.h>

/**
 * Injects input into the system.
 * @param buttons Bitmask of buttons to inject.
 * @param duration_ms Duration of the input in milliseconds.
 */
void injectInput(u64 buttons, int duration_ms);

#endif // INPUT_INJECTOR_H
