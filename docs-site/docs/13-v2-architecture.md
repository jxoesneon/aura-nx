# 13. Aura-NX v2.0.0 Enterprise Architecture

The v2.0.0 "Enterprise" release of Aura-NX marks the transition from a specialized debugging tool to a full-scale institutional development platform. This architecture focuses on security, scalability, and micro-architectural precision.

---

## 1. Security: Mutual TLS (mTLS) Implementation

To ensure data integrity and prevent unauthorized access in studio environments, Aura-NX v2.0.0 implements a mandatory mTLS handshake.

- **Handshake Protocol**: Both the PC Orchestrator and the Switch Sysmodule act as both client and server (Mutual Auth). 
- **Certificate Management**: Uses studio-signed X.509 certificates. The Sysmodule rejects any connection from a PC that does not present a certificate signed by the authorized Studio CA.
- **VFS Encryption**: Files transferred over port 12347 are encrypted using AES-256-GCM, with session keys derived during the mTLS handshake.

## 2. Scalability: SQLite Fleet Management

Aura-NX v2.0.0 moves away from simple environment-variable configuration to a persistent, multi-target management system.

- **Centralized Database**: A local SQLite database on the PC Orchestrator tracks every console in the studio.
- **Telemetry History**: Stores long-term performance data (GPU load, FPS, crash frequency) for all connected targets.
- **Multi-Target Dispatch**: The MCP server can now address multiple `AURA_DEVICE_IP`s. Tools can be scoped to individual consoles or broadcast to defined groups (e.g., "QA-OLED-Group").

## 3. Precision: Micro-Architectural Profiling (PMU)

V2.0.0 introduces high-resolution cycle-accurate profiling by unlocking the ARMv8 Performance Monitoring Unit (PMU).

- **PMCCNTR_EL0 Access**: Through a custom kernel extension, user-space applications can now read the 1.02GHz CPU cycle counter directly.
- **Tooling**: The `read_pmu_counters` tool provides raw telemetry for:
    - Instruction counts
    - L1/L2 cache misses
    - Branch mispredictions
- **Sampling Engine**: A background task samples the Instruction Pointer (IP) via the GDB bridge to generate real-time SVG flamegraphs.

## 4. Visuals: `grc:d` Hardware Video Streaming

Aura-NX v2.0.0 replaces slow framebuffer copies with the console's native hardware encoding engine.

- **Game Recording Control (`grc:d`)**: The sysmodule hooks into the system's game recording service to capture H.264 video streams.
- **Low Latency**: Utilizes DMA-BUF zero-copy memory mapping, ensuring &lt;16ms latency for the remote telemetry stream.
- **Standard Protocol**: The H.264 stream is encapsulated in MPEG-TS and served over a new dedicated socket, allowing standard players (VLC, FFmpeg) or AI vision models to consume the feed.
