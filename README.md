# Aura-NX: Advanced Console Engineering Framework

**Aura-NX** is an elite, Enterprise-grade Model Context Protocol (MCP) server architecture engineered for AAA Nintendo Switch (NX) development ecosystems. It bridges the gap between raw hardware and developer intuition, delivering **Total Observability**, **Zero-Latency Asset Pushing**, and **High-Fidelity Telemetry**.

## 🚀 Elite Infrastructure Capabilities

*   **Mutual TLS (mTLS):** Sophisticated certificate-based authentication securing studio-wide console networks.
*   **Fleet Orchestration:** SQLite-backed persistent tracking and management for large-scale console deployments.
*   **Micro-Architectural Analysis:** Precision telemetry and cycle-accurate profiling via `PMCCNTR_EL0`.
*   **Hardware-Accelerated Streaming:** High-performance H.264 visual streaming pipelines for remote debugging.
*   **Instant AI Integration:** Seamless configuration for 21+ advanced AI editors (Claude, Cursor, etc.).
*   **Enterprise CI/CD:** Automated cross-platform build pipelines (x64/arm) with Hardware-In-the-Loop (HIL) validation.

---

## 🛠️ Rapid Integration

### 1. Automated AI Orchestration (Recommended)
Instantly configure your AI development environment to leverage the full power of Aura-NX:
```bash
./setup-mcp.sh
```

### 2. Hardware Deployment
Acquire the latest **`aura_nx_sysmodule.nsp`** and **`aura_nx_companion.nro`** from the [Advanced Releases](https://github.com/jxoesneon/aura-nx/releases) portal.
*   Deploy `.nsp` to `/atmosphere/contents/`
*   Initialize system and establish network link.

### 3. Secure Protocol Setup
Generate studio-grade mTLS certificates to establish your secure trust perimeter:
```bash
./scripts/generate_certs.sh
```

---

## 🔌 Unified Port Mapping

| Port | Protocol | Service | Strategic Impact |
| :--- | :--- | :--- | :--- |
| **22225** | TCP | **GDB (mTLS)** | Remote execution control & precision breakpoints. |
| **28771** | TCP | **nxlink (mTLS)** | Real-time console diagnostic streaming. |
| **12346** | TCP | **Sysmodule** | JSON-RPC Hardware Telemetry & Command Link. |
| **12347** | TCP | **VFS Server** | Zero-latency remote asset synchronization. |
| **12348** | UDP | **VFS Reload** | Immediate mid-frame asset hot-swapping. |
| **8081** | WS | **Telemetry** | Live Analytics Dashboard & Visual Insight. |
| **12349** | UDP | **Discovery** | Automated target identification & zero-config pairing. |
| **12350** | TCP | **Crash Monitor** | High-velocity automated dump ingestion & analysis. |

---

## 🧰 Professional Toolset

*   `read_gpu_load` / `read_pmu_counters`: Elite hardware performance metrics.
*   `set_breakpoint`: Total execution control at the source level.
*   `capture_screen`: Hardware-accelerated frame capture for visual validation.
*   `reload_asset`: Instantaneous mid-frame asset deployment.
*   `send_input`: Automated gameplay logic & UI interaction injection.
*   `backup_save` / `restore_save`: Robust persistent state orchestration.
*   `get_fleet_status`: Comprehensive visibility into the active studio console fleet.

---

## 📚 Engineering Documentation

### Technical Specifications
1. [Architecture Overview](docs/01-architecture.md)
2. [Debugging Protocol](docs/02-debugging-protocol.md)
3. [Profiling Engine](docs/03-profiling-engine.md)
4. [Asset Hot-Reloading](docs/04-asset-hot-reload.md)
13. [Advanced Architecture Deep-Dive](docs/13-v2-architecture.md)

### Enterprise Engineering Standards
5. [Development Lifecycle](docs/05-development-lifecycle.md)
6. [Quality Assurance & Validation](docs/06-quality-assurance.md)
7. [Security Posture & Trust](docs/07-security-posture.md)
8. [Release Operations](docs/08-release-ops.md)
10. [Audit & Compliance Sign-off](docs/10-audit-signoff.md)
11. [Developer Lifecycle Handbook](docs/11-developer-lifecycle.md)
12. [Strategic Advisory & Roadmap](docs/12-v2-roadmap.md)

### AI & Collaborative Ecosystem
*   [SKILL.md (AI Agent Synthesis)](SKILL.md)
*   [Contributing](CONTRIBUTING.md) | [Code of Conduct](CODE_OF_CONDUCT.md)
