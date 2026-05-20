# 7. Security Posture

Aura-NX is designed to be a high-privilege development tool. Its security model focuses on preventing unauthorized system modification and ensuring operational stability.

## Core Security Pillars

### 1. IPC Access Control
*   **Service Access Control (SAC):** The sysmodule implements strict SAC whitelisting within its `.npdm` file. Only processes with the appropriate `ProgramId` or `ServiceAccess` permissions can interface with Aura-NX.
*   **PID Verification:** For sensitive operations (e.g., memory mapping or process injection), Aura-NX validates the caller's PID using the kernel's `svcGetProcessId` to ensure the request is originating from an authorized development agent.

### 2. Network Security
Since Aura-NX exposes the Switch to a LAN, the following precautions are mandatory:
*   **Authenticated Handshake:** The PC Orchestrator must provide a pre-shared key (PSK) or token during the initial TCP connection.
*   **Bounds Checking:** All network packets (especially VFS asset paths and command buffers) are strictly validated. Any malformed packet results in an immediate connection termination to prevent buffer overflow exploits.
*   **Non-Blocking I/O:** The network loop uses `O_NONBLOCK`. This prevents a malicious or slow network peer from "hanging" the sysmodule, which could otherwise trigger a system-wide OS hang (Horizon OS watchdog timeout).

### 3. Execution Integrity
*   **Binary Integrity:** Distributed sysmodule binaries (`.nsp`) are checksummed and can be optionally signed.
*   **Code Injection Prevention:** While Aura-NX supports debugging, it does not allow the injection of arbitrary code into other system processes (except for the target process being debugged).

### 4. Operational Stability (Anti-DoS)
*   **Rate Limiting:** To prevent the sysmodule from starving the foreground game of CPU cycles, the network and profiling loops are rate-limited to a maximum of 60Hz.
*   **Memory Sandboxing:** Aura-NX uses a pre-allocated memory pool for its internal buffers to prevent it from consuming the system's global heap and causing out-of-memory (OOM) failures in the OS.

## Security Auditing
*   **Fuzzing:** The PC-side JSON-RPC layer is subject to automated fuzzing to detect parser vulnerabilities.
*   **Static Analysis:** `clang-tidy` is configured with security-centric checks (e.g., `bugprone-*`, `cppcoreguidelines-*`) to catch memory safety issues at compile-time.