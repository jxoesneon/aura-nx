# 1. Architecture Overview

The Aura-NX architecture consists of a PC-side MCP Orchestrator and Switch-side implementation layers (Sysmodule + Engine Integration).

## Topology

```text
+-------------------+                          +-----------------------+
|   AI Agent Swarm  |                          |    Nintendo Switch    |
| (Claude/Cursor)   |                          |     (Horizon OS)      |
+--------+----------+                          +-----------------------+
         |                                     |
    [JSON-RPC over MCP]                        |
         |                                     |
+--------v----------+                          |   +-------------------+
| Aura-NX MCP Server| <--- (mTLS / 22225) -----+ | Atmosphere GDB    |
|   (PC Node.js)    |                          |   +-------------------+
|                   | <--- (mTLS / 28771) -----+ | libnx app logger  |
| - GDB Manager     |                          |   +-------------------+
| - Fleet DB (SQL)  | <--- (mTLS / 12346) -----+ | Aura Sysmodule    |
| - mTLS CA Layer   |                          |   +-------------------+
| - VFS Host        | --- (UDP + TCP devoptab) --> | VFS Client (App)  |
+-------------------+                          +-----------------------+
```

## Tiers
1.  **Aura-NX MCP Server (PC-Side):**
    Exposes specialized MCP Tools (`read_gpu_load`, `set_breakpoint`, `read_log_stream`) to AI agents. It acts as a translator between standard MCP JSON-RPC and the raw Switch TCP protocols.
2.  **Atmosphere CFW / Aura Sysmodule:**
    Handles low-level hardware access (GDB stubs, `nvdrv` hooks) and exposes them over LAN.
3.  **Application VFS Integration:**
    A lightweight `libnx` integration embedded within the target homebrew game to support UDP reload signals and `devoptab` network file fetching.