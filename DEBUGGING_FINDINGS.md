# Aura-NX Sysmodule Debugging Findings

*Session Date: 2026-05-20*
*Device IP: 192.168.100.72*
*Title ID: 4200000000000012*

---

## Executive Summary

The aura-nx sysmodule was failing to start on hardware after deployment, with all TCP/UDP ports closed and no crash logs. Through systematic elimination, we identified multiple root causes and produced a working minimal sysmodule. Full feature restoration requires additional work on service initialization.

---

## 1. Root Causes Identified

### 1.1 `std::thread` Requires `svcCreateThread` Syscall

**Finding:** `discovery.cpp` uses `std::thread(discoveryLoop).detach()` for the UDP broadcast loop.

**Impact:** The NPDM kernel capabilities did not include `svcCreateThread` (0x08), causing an immediate crash or silent failure when `std::thread` was constructed.

**Evidence:**
- The devkitPro sysmodule template NPDM includes `svcCreateThread` among ~80 syscalls
- Our original NPDM only included 5 syscalls (`svcSleepThread`, `svcGetSystemTick`, `svcConnectToNamedPort`, `svcSendSyncRequest`, `svcGetInfo`)
- Removing all `.cpp` files that use `std::thread` allowed the sysmodule to start

**Resolution:** Removed `discovery.cpp` (and all other feature `.cpp` files) from the build temporarily. Discovery needs to be reimplemented without `std::thread`.

---

### 1.2 `spsmInitialize()` Causes Runtime Crash

**Finding:** Calling `spsmInitialize()` in `__appInit()` causes the sysmodule to either fail to start or crash when handling the first client connection.

**Evidence:**
- Build WITHOUT `spsmInitialize()` → Port 12346 OPEN, JSON-RPC works ✓
- Build WITH only `spsmInitialize()` added back → Port 12346 OPEN, but "Connection reset by peer" on first client ✗
- Build WITH `spsmInitialize()` + `nvInitialize()` + `clkrstInitialize()` → Port 12346 CLOSED ✗

**Hypothesis:** `spsm` service may require a specific kernel capability, different service access permissions, or may not be available in sysmodule context on this firmware version.

**Impact:** `reboot` JSON-RPC handler cannot call `spsmShutdown(true)`. Currently returns a stub response.

---

### 1.3 `nvInitialize()` and `clkrstInitialize()` Also Crash

**Finding:** These services fail similarly to `spsmInitialize()`.

**Impact:**
- GPU load reading stubbed (returns 0)
- Clock readings stubbed (returns 0)

---

### 1.4 TCP RST on Missing `recv()`

**Finding:** When the sysmodule accepted a connection and immediately called `send()` without first calling `recv()`, some clients received "Connection reset by peer".

**Resolution:** Added `recv()` before `send()` in the client handler loop to consume the client's request before responding.

---

### 1.5 NPDM Service Access Needs `service_host: ["*"]`

**Finding:** The original `template_fixed.npdm` had `service_access: ["*", "spsm"]` but was missing `service_host: ["*"]`.

**Impact:** Some services may require `service_host` permissions to function correctly in sysmodule context.

**Resolution:** Copied the devkitPro sysmodule template NPDM structure, which includes `service_host: ["*"]`.

---

### 1.6 BSD Socket Buffer Size Too Large

**Finding:** Default `socketInitializeDefault()` allocates ~2.25MB of transfer memory:
- `tcp_tx_buf_max_size = 0x40000` (256KB)
- `tcp_rx_buf_max_size = 0x40000` (256KB)
- `sb_efficiency = 4`
- Total: `4 * (0x40000 + 0x40000 + 0x2400 + 0xA500)` ≈ 2.25MB

**Impact:** Transfer memory allocation may fail in sysmodules with limited memory pools.

**Resolution:** Reduced buffers to minimal sizes:
```cpp
cfg.tcp_tx_buf_size = 0x4000;
cfg.tcp_rx_buf_size = 0x4000;
cfg.tcp_tx_buf_max_size = 0x8000;
cfg.tcp_rx_buf_max_size = 0x8000;
cfg.udp_tx_buf_size = 0x1200;
cfg.udp_rx_buf_size = 0x5280;
cfg.sb_efficiency = 1;
cfg.num_bsd_sessions = 1;
```
This reduces transfer memory to ~90KB.

---

### 1.7 `smExit()` Must Be Called After All Service Inits

**Finding:** The `sm:` service manager handle is required by `bsdInitialize()` (called inside `socketInitialize()`), which internally calls `smGetServiceWrapper()` for `bsd:s` or `bsd:u`.

**Impact:** Calling `smExit()` before `socketInitialize()` causes BSD socket init to fail.

**Resolution:** `smExit()` is called as the LAST step in `__appInit()`, after all service initializations.

---

### 1.8 NPDM JSON Requires Exact devkitPro Template Structure

**Finding:** `npdmtool` produces significantly different binary output depending on which JSON fields are present. The devkitPro template includes `service_host`, extensive `syscalls`, and specific kernel capability structures.

**Impact:** Custom NPDM JSON with only partial fields may produce invalid kernel capabilities.

**Resolution:** Adapted the devkitPro template `sysmodule.json` (from `/opt/devkitpro/examples/switch/templates/sysmodule/`) with our title ID.

---

### 1.9 NSO Binary Was Valid All Along

**Finding:** Initial analysis showed `text_size=0` and `rodata_off` beyond file size. This was due to reading the WRONG offsets from the NSO header.

**Correct NSO Header Layout (from Switchbrew):**
| Offset | Field |
|--------|-------|
| 0x00 | Magic "NSO0" |
| 0x10 | TextFileOffset |
| 0x14 | TextMemoryOffset |
| 0x18 | TextSize (decompressed) |
| 0x20 | RoFileOffset |
| 0x24 | RoMemoryOffset |
| 0x28 | RoSize (decompressed) |
| 0x30 | DataFileOffset |
| 0x34 | DataMemoryOffset |
| 0x38 | DataSize (decompressed) |
| 0x60 | TextFileSize (compressed) |
| 0x64 | RoFileSize (compressed) |
| 0x68 | DataFileSize (compressed) |

**Evidence:** Our NSO has `TextFileSize = 108,955` bytes (compressed), `RoFileSize = 19,249`, `DataFileSize = 2,578`. Total file: 131,038 bytes. Valid and functional.

---

### 1.10 PFS0 Container Structure

**Finding:** The sysmodule "NSP" is actually a PFS0 (Partitioned File System 0) container.

**Structure:**
- PFS0 header at offset 0 (16 bytes)
- File entry table (24 bytes per file)
- String table
- File data (with 16-byte alignment)

**Contents:**
- `main.npdm` — NPDM descriptor
- `main` — NSO executable (renamed from `.nso`)

**Build command:**
```bash
npdmtool template.json exefs/main.npdm
build_pfs0 exefs/ exefs.nsp
```

---

## 2. Working vs. Broken Configurations

| Build | sm | setsys | fs | nv | clkrst | spsm | socket | Result |
|-------|----|--------|----|----|--------|------|--------|--------|
| Original | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | `socketInitializeDefault()` | **Ports closed** |
| Minimal | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | Custom buffers | **Works!** |
| + spsm | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | Custom buffers | **RST on connect** |
| + nv/clkrst | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | Custom buffers | **Ports closed** |
| Full handlers | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | Custom buffers | **Works!** |

---

## 3. Current Working Architecture

### 3.1 `__appInit()` Order

```cpp
smInitialize();           // Required for all service access
setsysInitialize();       // Get firmware version for hosversionSet()
fsInitialize();           // SD card access
fsdevMountSdmc();         // Mount /sdmc/
socketInitialize(&cfg);   // BSD sockets with minimal buffers
smExit();                 // Close sm: handle LAST
```

### 3.2 JSON-RPC Endpoints (Stubbed)

All endpoints respond correctly on TCP port 12346:

| Method | Status | Notes |
|--------|--------|-------|
| `get_gpu_load` | Stub (returns 0) | Needs `nvInitialize()` |
| `get_clocks` | Stub (returns 0) | Needs `clkrstInitialize()` |
| `capture_screen` | Stub | Needs framebuffer capture impl |
| `backup_save` | Stub | Needs actual save backup logic |
| `restore_save` | Stub | Needs actual save restore logic |
| `inject_input` | Stub | Needs `hid` service |
| `get_pmu_counters` | Stub (returns 0) | Needs PMU access |
| `reboot` | Stub | Needs `spsmInitialize()` + `spsmShutdown()` |

### 3.3 Disabled Features

| Feature | Why Disabled |
|---------|-------------|
| UDP discovery broadcast | Requires `std::thread` |
| GPU load reading | `nvInitialize()` crashes |
| CPU/GPU clock reading | `clkrstInitialize()` crashes |
| Remote reboot | `spsmInitialize()` crashes |
| Save backup/restore | Not yet implemented |
| Input injection | Not yet implemented |
| Screen capture | Not yet implemented |

---

## 4. MCP Server Status

### 4.1 Configuration

**File:** `/Users/meilynlopezcubero/.codeium/windsurf/mcp_config.json`

```json
"aura-nx": {
  "args": ["ts-node", "/Users/mey/aura-nx/mcp-server/src/index.ts"],
  "command": "npx",
  "disabled": false
}
```

### 4.2 Issue: Port 28771 Zombie Processes

The MCP server binds to TCP port 28771 for nxlink log collection. If the server process crashes or is killed without proper cleanup, the port remains held by a zombie Node process.

**Symptom:** `EADDRINUSE: address already in use :::28771`

**Fix:** `killall -9 node` or `kill -9 <PID>`

### 4.3 Connection Flow

```
Windsurf MCP bridge
    → spawns: npx ts-node /Users/mey/aura-nx/mcp-server/src/index.ts
    ← stdio JSON-RPC communication
        MCP server
        → TCP connect to 192.168.100.72:12346
        ← Switch sysmodule JSON-RPC response
```

---

## 5. Files of Interest

| File | Purpose |
|------|---------|
| `sysmodule/src/main.cpp` | Sysmodule entry point and JSON-RPC handlers |
| `sysmodule/Makefile` | Build configuration |
| `sysmodule/template_fixed.npdm` | NPDM JSON descriptor |
| `mcp-server/src/index.ts` | MCP server (TCP/UDP listeners, tool handlers) |
| `mcp-server/src/discovery.ts` | Device discovery via UDP broadcast |
| `mcp-server/src/capture.ts` | Screen capture handler |
| `mcp-server/src/crash_monitor.ts` | Crash report collection |
| `mcp-server/src/save_manager.ts` | Save backup/restore logic |

---

## 6. Next Steps for Feature Restoration

### 6.1 Immediate Priority

1. **Fix `spsmInitialize()` crash** — Required for actual reboot functionality
2. **Fix MCP stdio connection** — Required for Windsurf to invoke tools
3. **Verify `reboot_switch` MCP tool** — End-to-end test

### 6.2 Medium Priority

4. **Implement discovery without `std::thread`** — Use `svcCreateThread` with proper NPDM syscalls, or use a timer-based approach in the main loop
5. **Fix `nvInitialize()`** — Required for real GPU load reading
6. **Fix `clkrstInitialize()`** — Required for real clock readings

### 6.3 Lower Priority

7. **Implement actual screen capture** — Use `capssc` or framebuffer access
8. **Implement save backup/restore** — Use `fs` service for save data manipulation
9. **Implement input injection** — Use `hid` service
10. **Implement PMU counter reading** — Requires `pm` service or direct register access

---

## 7. Technical Reference

### 7.1 NPDM Binary Offsets

The `npdmtool` output:
- `META` magic at offset 0x0
- `ACID` section at offset 0x80 (0x200 within file for devkitPro template)
- `ACI0` section at offset from `AciOffset` field
- Title ID at ACID offset 0x210 and ACI0 offset 0x10 (from section start)

### 7.2 NSO Format

- `NSO0` magic at offset 0x0
- Compressed segment sizes at offsets 0x60, 0x64, 0x68
- Flags at offset 0x0C indicate compression status

### 7.3 PFS0 Format

- `PFS0` magic at offset 0x0
- num_files at offset 0x4
- string_table_size at offset 0x8
- File entries at offset 0x10 (24 bytes each)
- String table after entries
- File data after string table (16-byte aligned)
