# Aura-NX Debug MCP (v2.0.0 Enterprise)

**Aura-NX** is an institutional-grade, Model Context Protocol (MCP) server architecture designed for AAA-grade Nintendo Switch (NX) homebrew development.

## 🚀 v2.0.0 Enterprise Features

*   **Mutual TLS (mTLS):** Certificate-based authentication for secure studio networks.
*   **Fleet Management:** SQLite-backed persistent tracking for hundreds of console targets.
*   **Cycle-Accurate Profiling:** Micro-architectural telemetry via `PMCCNTR_EL0`.
*   **Hardware Video Streaming:** High-performance H.264 streaming scaffolds.
*   **1-Click AI Setup:** Instant configuration for 21+ AI editors (Claude, Cursor, etc.).
*   **CI/CD Pipeline:** Automated cross-platform builds (x64/arm) and HIL testing.

---

## 🛠️ Quick Start

### 1. Automated AI Setup (Recommended)
Automatically configure your favorite AI editor (Claude, Cursor, Aider, etc.) to use Aura-NX:
```bash
./setup-mcp.sh
```

### 2. Switch Deployment
Download the latest **`aura_nx_sysmodule.nsp`** and **`aura_nx_companion.nro`** from the [Releases](https://github.com/jxoesneon/aura-nx/releases) page.
*   Copy `.nsp` to `/atmosphere/contents/`
*   Reboot and connect to LAN.

### 3. mTLS Security Setup
Generate your studio certificates before starting the server:
```bash
./scripts/generate_certs.sh
```

---

## 🔌 Network & Port Configuration

| Port | Protocol | Service | Description |
| :--- | :--- | :--- | :--- |
| **22225** | TCP | **GDB (mTLS)** | Remote execution & breakpoints. |
| **28771** | TCP | **nxlink (mTLS)** | Live console logs. |
| **12346** | TCP | **Sysmodule** | JSON-RPC Hardware Telemetry. |
| **12347** | TCP | **VFS Server** | High-speed asset streaming. |
| **12348** | UDP | **VFS Reload** | Instant hot-reload signaling. |
| **8081** | WS | **Telemetry** | Live Dashboard WebSocket. |
| **12349** | UDP | **Discovery** | Zero-config target auto-find. |
| **12350** | TCP | **Crash Monitor** | Automated dump ingestion. |

---

## 🧰 Available MCP Tools

*   `read_gpu_load` / `read_pmu_counters`: Precision hardware metrics.
*   `set_breakpoint`: Source-level execution control.
*   `capture_screen`: Hardware-accelerated visual frame capture.
*   `reload_asset`: Instant mid-frame asset swapping.
*   `send_input`: Automated gameplay/UI input injection.
*   `backup_save` / `restore_save`: Persistent state management.
*   `get_fleet_status`: Overview of all discovered studio consoles.

---

## 📚 Documentation Index

### Technical Specifications
1. [Architecture Overview](docs/01-architecture.md)
2. [Debugging Protocol](docs/02-debugging-protocol.md)
3. [Profiling Engine](docs/03-profiling-engine.md)
4. [Asset Hot-Reloading](docs/04-asset-hot-reload.md)
13. [v2.0.0 Architecture Deep-Dive](docs/13-v2-architecture.md)

### Institutional Standards
5. [Development Lifecycle](docs/05-development-lifecycle.md)
6. [Quality Assurance & Testing](docs/06-quality-assurance.md)
7. [Security Posture](docs/07-security-posture.md)
8. [Release Operations](docs/08-release-ops.md)
10. [Audit Sign-off](docs/10-audit-signoff.md)
11. [Developer Lifecycle Handbook](docs/11-developer-lifecycle.md)
12. [Technical Advisory](docs/12-v2-roadmap.md)

### Community & AI
*   [SKILL.md (AI Agent Training)](SKILL.md)
*   [Contributing](CONTRIBUTING.md) | [Code of Conduct](CODE_OF_CONDUCT.md)
