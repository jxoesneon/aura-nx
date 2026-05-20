# 9. Aura-NX v1.0.0 Roadmap: Production Quality of Life

While the core of Aura-NX provides robust execution control, telemetry, and asset streaming, professional SDK environments (such as those for modern consoles) offer features that drastically reduce developer friction.

This document outlines the technical roadmap for bringing Aura-NX to feature-parity with commercial Target Managers.

## 1. Zero-Config Auto-Discovery
Currently, developers must hardcode IP addresses (`AURA_DEVICE_IP`). In a studio environment with dozens of devkits, this is unsustainable.

### Implementation Plan:
*   **Protocol:** Implement a custom UDP broadcast beacon or standard mDNS (Bonjour/Avahi) responder within the Aura-Sys sysmodule.
*   **Behavior:** The sysmodule broadcasts `AURA_ANNOUNCE` packets on port `12349`. The PC-side server listens for these broadcasts and maintains a dynamic registry of available targets.
*   **Benefit:** Developers can simply request "Connect to any available QA kit" or "List active targets," eliminating manual IP management.

## 2. Remote Visual Debugging (Screen Capture)
Engineers need to *see* what is happening on the console to diagnose rendering bugs or UI alignment issues.

### Implementation Plan:
*   **Service:** Utilize the Horizon OS `caps:su` (Screen Update) or `caps:sc` (Screen Capture) services.
*   **Sysmodule Hook:** Aura-Sys will request a framebuffer snapshot. To minimize memory overhead, it will utilize the hardware JPEG encoder to compress the frame before transmission.
*   **Tools:** Expose a `capture_screen` tool that fetches the JPEG over TCP and returns it as a Base64-encoded string or saves it to the PC disk.
*   **Benefit:** Enables automated visual regression testing by comparing current frames against known-good references.

## 3. Automated Crash Telemetry & Auto-Symbolication
Currently, analyzing a crash requires manually copying `report_xxxx.bin` from the SD card and running GDB. This process should be instantaneous.

### Implementation Plan:
*   **Sysmodule Hook:** Aura-Sys will use `fs` event notifications to monitor `sdmc:/atmosphere/crash_reports/` for new reports.
*   **Telemetry Stream:** Upon detecting a new crash dump, the sysmodule streams it immediately to the server over the existing JSON-RPC port.
*   **Server-Side Symbolication:** Upon receiving a dump, the server automatically executes `aarch64-none-elf-addr2line` to generate a human-readable stack trace.
*   **Benefit:** Proactive notification of crashes with the exact line of code that faulted, allowing for immediate debugging.

## 4. Aura Target Manager (Fleet Dashboard)
Managing fleets of hardware (Programmers, Artists, QA) requires centralized visibility.

### Implementation Plan:
*   **Dashboard Server:** The PC server will host a lightweight web dashboard (React/Vite) served on port `8080`.
*   **Features:**
    *   Live matrix of all discovered Switch targets.
    *   Real-time graphs of GPU Load, CPU clocks, and Memory Pressure.
    *   One-click asset bundle pushes to multiple consoles simultaneously.
*   **Benefit:** Technical Directors and Lead Programmers can monitor the health and performance of the application across the entire studio's hardware fleet in real-time.

## 5. Persistent State & Save Management
Allowing developers to instantly swap save states to jump to specific points in an application.

### Implementation Plan:
*   **Service:** Hook into `fs` or `save` services to backup and restore the target application's save data directory over the network.
*   **Tools:** `backup_save_state(name)`, `restore_save_state(name)`.
*   **Benefit:** Enables loading specific application states for automated testing or performance profiling in targeted scenarios.