# 3. Profiling Engine (GPU & CPU)

To allow AI agents to automatically diagnose performance bottlenecks, Aura-NX implements remote profiling using Horizon OS services.

## Micro-Architectural Profiling (PMU)
For high-fidelity optimization, Aura-NX provides nanosecond-precision telemetry.

*   **Metric:** `PMCCNTR_EL0` (Cycle Count)
*   **Resolution:** ~1.02 GHz (approx 0.98ns per cycle).
*   **Requirements:** Accessing this counter from EL0 requires the Atmosphere `pm_user_enr` kernel patch.
*   **MCP Tool:** `read_pmu_counters` returns the current cycle count, allowing agents to measure the exact performance cost of a specific function or shader invocation.

## GPU Load (`nvdrv` IOCTL)
The Tegra X1 Power Management Unit (PMU) provides real-time GPU utilization metrics.

*   **Service/Node:** `/dev/nvhost-gpu`
*   **IOCTL:** `NVGPU_GPU_IOCTL_PMU_GET_GPU_LOAD` (`0x40084716`)
*   **Data Format:** The kernel returns a `uint32_t` between `0` and `1000`. Dividing by 10 yields the percentage (e.g., `855` = `85.5%`).
*   **Sampling:** This provides a very rapid snapshot (approx. 1/60s). The sysmodule should sample this repeatedly and expose an averaged `average_gpu_load` to the MCP server.

## Hardware Clocks (`clkrst`)
For accurate performance analysis, agents need to know the current throttling state of the hardware.

*   **Service:** `clkrst` (Clock and Reset)
*   **Modules:**
    *   `PcvModuleId_Cpu (0)`
    *   `PcvModuleId_Gpu (1)`
    *   `PcvModuleId_Emc (56)` - RAM Controller
*   **API:** `clkrstOpenSession` followed by `clkrstGetClockRate` yields the current frequency in Hz.

## PMU Hardware Counters Limitations
Accessing raw ARM cycle counters (`PMCCNTR_EL0`) from user-space triggers an `Illegal Instruction` fault unless patched at the kernel level (`PMUSERENR_EL0 = 0xF`). The Aura-NX architecture defaults to `armGetSystemTick()` (19.2MHz reference) for thread timing, and relies on `nvdrv` for overall load, avoiding the need for unstable custom kernel patches.