#include "pmu_profiler.h"

u64 read_cycle_counter() {
    u64 val;
    // mrs x0, pmccntr_el0
    // Access to this register from EL0 requires PMUSERENR_EL0.EN to be set.
    // This is typically handled by Atmosphere's pm_user_enr patch.
    asm volatile("mrs %0, pmccntr_el0" : "=r"(val));
    return val;
}
