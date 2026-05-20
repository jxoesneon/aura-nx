# 5. Development Lifecycle

Aura-NX follows an institutional-grade lifecycle model based on AAA console development standards. This ensures that tools are robust, performant, and reliable across all phases of development.

## Project Phases

### 1. Planning & Specification (Phase 0)
*   **Deliverable:** Technical Design Document (TDD) and IPC Interface Specification.
*   **Goal:** Define the exact `nvdrv` hooks and network protocols to be implemented. Define success metrics (e.g., latency < 16ms for hot-reloads).

### 2. Alpha (Feature Complete)
*   **Definition:** Core sysmodule logic, GDB bridge, and Network VFS are functional.
*   **Focus:** Functionality over stability. Features are "wired up" but not yet optimized.
*   **Exit Criteria:** All core MCP tools return successful responses on real hardware.

### 3. Beta (Stability & Content Complete)
*   **Definition:** No new features added. Focus shifts to memory management and performance tuning.
*   **Constraints:** Sysmodules MUST remain under the strict **16MB memory limit**.
*   **Focus:** Error handling, edge-case remediation (e.g., handling network drops during VFS fetch), and performance profiling.

### 4. Release Candidate (RC)
*   **Definition:** Potential ship-ready build.
*   **Verification:** Exhaustive Hardware-in-the-Loop (HIL) testing. No "Showstopper" bugs (system hangs or kernel panics) permitted.
*   **Exit Criteria:** 100% pass rate on automated regression suites.

### 5. Gold (Master Release)
*   **Definition:** The final signed-off version.
*   **Packaging:** Release of binary sysmodules (`.nsp`), PC orchestrator (`npm` package), and final documentation.

## Environment Standardization
To ensure consistency across the development team:
*   **Compiler:** `aarch64-none-elf-gcc` (devkitPro) for Switch components.
*   **Runtime:** Node.js LTS for PC components.
*   **Linting:** `eslint` (PC) and `clang-tidy` (Switch).
*   **Documentation:** Doxygen (C++) and TypeDoc (TypeScript) are integrated into the build pipeline. All builds will fail if `WARN_AS_ERROR` is triggered by missing documentation.