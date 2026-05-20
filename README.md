# Aura-NX Debug MCP

**Aura-NX** is an institutional-grade, Model Context Protocol (MCP) server architecture designed for AAA-grade Nintendo Switch (NX) homebrew development. It provides a robust, secure, and professional development environment for autonomous AI agent swarms to debug, profile, and hot-reload Switch applications over a LAN connection.

## 🏗️ Architecture

The Aura-NX ecosystem is split into three primary layers, facilitating seamless communication between AI agents and bare-metal hardware.

### 1. PC Orchestrator (Node.js MCP Server)
Acts as the central nervous system. It translates high-level AI intents (via JSON-RPC MCP) into low-level socket commands for the Switch. It hosts the Asset VFS and the Telemetry broadcast engine.

### 2. Switch Implementation (Aura Sysmodule)
A custom background process running on the Nintendo Switch (Horizon OS). It hooks into system services like `nvdrv` for GPU load and `clkrst` for hardware clocks, exposing them via a specialized JSON-RPC interface.

### 3. Application Layer (Client Lib)
A lightweight integration embedded in the homebrew application. It provides the `devoptab` interface for the Network VFS and a UDP listener for instant asset hot-reloading signals.

---

## 🔌 Network & Port Configuration

Aura-NX utilizes a specific set of ports for various telemetry and control streams. Ensure your firewall allows these over the LAN.

| Port | Protocol | Service | Description |
| :--- | :--- | :--- | :--- |
| **22225** | TCP | **GDB** | Standard Atmosphere GDB stub for remote debugging. |
| **28771** | TCP | **nxlink** | Standard `stdout`/`stderr` redirection for libnx logs. |
| **12346** | TCP | **Sysmodule** | Aura-NX JSON-RPC interface for GPU/Input/Screen capture. |
| **12347** | TCP | **VFS Server** | PC-side file server for streaming assets to the Switch. |
| **12348** | UDP | **VFS Reload** | UDP signaling for instant asset cache invalidation. |
| **8081** | WS | **Telemetry** | WebSocket stream for the Target Manager Dashboard. |

---

## 🛠️ Setup Process

### 1. Switch Console Setup
1.  Copy the `aura-sysmodule` (from `sysmodule/`) to `/atmosphere/contents/0123456789ABCDEF/` (replace with actual Program ID).
2.  Ensure Atmosphere is running with `debugmode=1` in `system_settings.ini`.
3.  Connect the Switch to the same LAN as your PC and note its IP address.

### 2. PC Setup
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-org/aura-nx.git
    cd aura-nx
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment:**
    Set the `AURA_DEVICE_IP` environment variable or create a `.env` file:
    ```bash
    export AURA_DEVICE_IP=192.168.1.100
    ```
4.  **Launch the MCP Server:**
    ```bash
    npm start
    ```

### 3. Application Integration
Link your project with `client-lib/` and initialize the Aura-NX client:
```cpp
#include <aura/vfs.h>
// ...
auraVfsInit("192.168.1.50"); // Your PC IP
```

---

## 🧰 Available MCP Tools

Aura-NX exposes the following tools to AI agents:

*   `read_gpu_load`: Returns the current Tegra GPU utilization as a percentage.
*   `set_breakpoint`: Interacts with the GDB stub to set hardware/software breakpoints at specific hex addresses.
*   `get_nxlink_logs`: Fetches the latest buffered logs from the application's `stdout`.
*   `reload_asset`: Triggers a UDP signal to the Switch to force the engine to re-fetch a file via VFS.
*   `capture_screen`: Requests a JPEG frame from the current framebuffer (base64).
*   `backup_save` / `restore_save`: Programmatically manages game save states for regression testing.
*   `send_input`: Injects virtual button presses (A, B, X, Y, D-Pad, etc.) for automated gameplay testing.

---

## 📚 Documentation Index

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
9. [Aura-NX v1.0.0 Roadmap (Advanced QoL)](docs/09-roadmap-v1.md)
10. [Audit Sign-off](docs/10-audit-signoff.md)
11. [Developer Lifecycle Handbook](docs/11-developer-lifecycle.md)
