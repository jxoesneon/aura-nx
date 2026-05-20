# 9. Aura-NX v1.0.0 Roadmap: Enterprise Niceties

While the core of Aura-NX provides robust execution control, telemetry, and asset streaming, AAA console development environments (like those for PS5 or Xbox Series X) offer Quality-of-Life (QoL) "niceties" that drastically reduce friction.

This document outlines the technical roadmap for bringing Aura-NX to feature-parity with official Target Managers.

## 1. Zero-Config Auto-Discovery
Currently, developers must hardcode IP addresses (`AURA_DEVICE_IP`). In a studio with dozens of devkits, this is unsustainable.

### Implementation Plan:
*   **Protocol:** Implement a custom UDP broadcast beacon or standard mDNS (Bonjour/Avahi) responder within the Aura-Sys sysmodule.
*   **Behavior:** The sysmodule broadcasts `AURA_ANNOUNCE` packets on port `12349`. The PC MCP Server listens for these broadcasts and maintains a dynamic registry of available "Targets".
*   **Benefit:** The AI Agent or developer can simply request "Connect to any available QA kit" or "List active targets," eliminating manual IP management.

## 2. Remote Visual Debugging (Screen Capture)
AI agents and QA engineers need to *see* what is happening on the console to diagnose rendering bugs or UI alignment issues.

### Implementation Plan:
*   **Service:** Utilize the Horizon OS `caps:su` (Screen Update) or `caps:sc` (Screen Capture) services.
*   **Sysmodule Hook:** Aura-Sys will request a framebuffer snapshot. To minimize memory overhead, it will request the hardware JPEG encoder to compress the frame before sending.
*   **MCP Tool:** Expose a `capture_screen` tool that fetches the JPEG over TCP and returns it as a Base64-encoded string or saves it to the PC disk.
*   **Benefit:** AI agents can perform visual regression testing by comparing current frames against known-good references.

## 3. Automated Crash Telemetry & Auto-Symbolication
Currently, analyzing a crash requires manually copying `report_xxxx.bin` from the SD card and running GDB. This should be instantaneous.

### Implementation Plan:
*   **Sysmodule Hook:** Aura-Sys will use `fs` event notifications or simply poll `sdmc:/atmosphere/crash_reports/` for new files.
*   **Telemetry Stream:** Upon detecting a new crash dump, the sysmodule streams it immediately to the MCP Server over the existing JSON-RPC port.
*   **PC-Side Symbolication:** The MCP Server maintains a mapping of `.elf` files. Upon receiving a dump, it automatically executes `aarch64-none-elf-addr2line` or `nx-crash-report.py` to generate a human-readable stack trace.
*   **Benefit:** An AI agent is proactively notified of crashes with the exact line of code that faulted, allowing it to begin debugging before the human developer even realizes a crash occurred.

## 4. Aura Target Manager (Fleet Dashboard)
Enterprise development requires managing fleets of hardware (Programmers, Artists, QA).

### Implementation Plan:
*   **Dashboard Server:** The MCP Server will optionally host a lightweight web dashboard (React/Vite) served on port `8080`.
*   **Features:**
    *   Live matrix of all discovered Switch targets.
    *   Real-time graphs of GPU Load, CPU clocks, and Memory Pressure (using WebSockets tied to the JSON-RPC telemetry).
    *   One-click asset bundle pushes to multiple consoles simultaneously.
*   **Benefit:** Technical Directors and Lead Programmers can monitor the health and performance of the game across the entire studio's hardware fleet in real-time.

## 5. Persistent State & Save Management
Allowing developers and AI to instantly swap save states to jump to specific points in a game.

### Implementation Plan:
*   **Service:** Hook into `fs` or `save` services to backup and restore the target application's save data directory over the network.
*   **MCP Tools:** `backup_save_state(name)`, `restore_save_state(name)`.
*   **Benefit:** AI agents can load a specific "boss fight" save state, run an automated combat test, and report the GPU load, entirely autonomously.