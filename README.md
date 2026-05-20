# Aura-NX Debug MCP

**Aura-NX** is an institutional-grade, Model Context Protocol (MCP) server architecture designed for AAA-grade Nintendo Switch (NX) homebrew development. It provides a robust, secure, and professional development environment for autonomous AI agent swarms to debug, profile, and hot-reload Switch applications over a LAN connection.

## Vision
To bridge the gap between AI-driven development and bare-metal Nintendo Switch hardware through a standardized, high-performance, and verifiable toolchain.

## Documentation Index

### Technical Specifications
1. [Architecture Overview](docs/01-architecture.md)
2. [Debugging Protocol (GDB & nxlink)](docs/02-debugging-protocol.md)
3. [Profiling Engine (GPU & CPU)](docs/03-profiling-engine.md)
4. [Asset Hot-Reloading (Network VFS)](docs/04-asset-hot-reload.md)

### Institutional Standards
5. [Development Lifecycle](docs/05-development-lifecycle.md)
6. [Quality Assurance (QA) & Testing](docs/06-quality-assurance.md)
7. [Security Posture](docs/07-security-posture.md)
8. [Release Operations (RelOps)](docs/08-release-ops.md)

### Community & Participation
*   [Contributing Guidelines](CONTRIBUTING.md)
*   [Code of Conduct](CODE_OF_CONDUCT.md)

## Core Capabilities
*   **Execution Control:** Automated GDB backtracing and live debugging with ASLR awareness.
*   **Telemetry:** TCP-based `stdout`/`stderr` redirection for real-time console logs.
*   **Observability:** Institutional-grade monitoring of Tegra PMU GPU load and system-wide hardware clocks.
*   **Workflow:** Network-backed Virtual File System (VFS) for instant, mid-frame texture and shader hot-reloading.
*   **Professional Rigor:** Full lifecycle support from Alpha to Gold, backed by Hardware-in-the-Loop (HIL) testing and strict security audits.