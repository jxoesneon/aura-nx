# 7. Security Posture

Aura-NX is designed to be a high-privilege development tool. Its security model focuses on preventing unauthorized system modification and ensuring operational stability.

## Core Security Pillars

### 1. IPC Access Control
*   **Service Access Control (SAC):** The sysmodule implements strict SAC whitelisting within its `.npdm` file. Only processes with the appropriate `ProgramId` or `ServiceAccess` permissions can interface with Aura-NX.
*   **PID Verification:** For sensitive operations (e.g., memory mapping or process injection), Aura-NX validates the caller's PID using the kernel's `svcGetProcessId` to ensure the request is originating from an authorized development agent.

### 2. Network Security (mTLS)
Aura-NX v2.0.0 enforces **Mutual TLS (mTLS)** for all LAN communication.
*   **Certificate Authority (CA):** Studios must generate a local CA using `scripts/generate_certs.sh`.
*   **Mutual Authentication:** Both the MCP Server and the Switch Sysmodule must present valid certificates signed by the Studio CA. The server will `rejectUnauthorized: true` any connection from an unknown or unsigned device.
*   **Encrypted Payloads:** All telemetry, logs, and asset data are encrypted in transit using TLS 1.3, preventing sniffing on shared networks.
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