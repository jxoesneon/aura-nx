#ifndef PMU_PROFILER_H
#define PMU_PROFILER_H

#include <switch.h>

/**
 * Reads the AArch64 Cycle Counter (PMCCNTR_EL0).
 * Requires Atmosphere pm_user_enr patch to be accessible from EL0.
 * 
 * @return The current value of the cycle counter.
 */
u64 read_cycle_counter();

#endif
