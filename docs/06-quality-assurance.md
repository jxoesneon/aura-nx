# 6. Quality Assurance (QA)

Aura-NX employs a multi-layered testing strategy to ensure reliability in high-pressure AAA development environments.

## Testing Layers

### 1. Unit Testing
*   **PC-Side:** Full coverage for JSON-RPC handlers and protocol encoders using `Vitest`.
*   **Switch-Side:** Logic-only tests compiled for the host OS (Linux/Windows) to verify algorithm correctness without hardware dependencies.

### 2. Integration Testing
*   Testing the interaction between the PC Orchestrator and the GDB/nxlink stubs.
*   Mocking Switch network responses to verify orchestrator resilience during latency spikes.

### 3. Hardware-in-the-Loop (HIL) Testing
The definitive verification phase. Tests are executed on physical Switch hardware (Retail/EDEV) via the **Host-Target** architecture.

*   **Telemetry Verification:** Automated checks to ensure `printf` logs from `libnx` apps are captured by the `nxlink` listener within 50ms.
*   **Input Injection Loops:** The Host PC sends automated HID sequences (controller buttons/joysticks) and monitors the resulting GPU load and frame telemetry to verify cause-and-effect.
*   **Memory Pressure Tests:** Purposely saturating the sysmodule's memory to ensure it handles allocation failures gracefully without crashing Horizon OS.
*   **Hot-Reload Stress Test:** Rapid-fire (5Hz) asset replacement sequences to verify Network VFS stability and buffer management.

## Bug Classification
| Level | Name | Description |
| :--- | :--- | :--- |
| **P0** | **Blocker** | System-wide crash, kernel panic, or brick risk. Must be fixed before any testing continues. |
| **P1** | **Critical** | Functional failure of a core tool (e.g., GDB won't attach). Must be fixed for Beta. |
| **P2** | **Major** | Significant performance regression or stability issue in edge cases. |
| **P3** | **Minor** | UI inconsistencies, logging typos, or non-critical feature bugs. |

## CI/CD Pipeline
Every Pull Request triggers:
1.  **Static Analysis:** `clang-tidy` and `eslint`.
2.  **Unit Tests:** Host-based automated suites.
3.  **Documentation Build:** Verification of API reference completeness.
4.  **HIL Suite (Optional):** Triggered manually for physical hardware verification.