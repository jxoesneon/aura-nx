# Aura-NX Feature Restoration Plan

## Status: Phase 1 Complete (Core Sysmodule Working)

- [x] Sysmodule starts on boot
- [x] TCP 12346 JSON-RPC server responds
- [x] MCP `reboot_switch` tool works end-to-end
- [x] All JSON-RPC handlers dispatch correctly

---

## Phase 2: Service Initialization Fixes

### 2.1 `nvInitialize()` — GPU Load Reading

**Current Status:** Stubbed (returns 0)
**Root Cause:** `nvInitialize()` crashes when called in `__appInit()`
**Hypothesis:** The `nv` service may require `service_host` access or specific kernel capabilities
**Approach:**
1. Try calling `nvInitialize()` with `sm:` still open (may have failed because `smExit()` was called too early)
2. Check if `nv` needs to be opened via `fsOpenDeviceOperator` or other means
3. Try using `nvIoctl` directly without `nvInitialize()` (may not need explicit init)
4. Check Atmosphere logs for specific error codes

**Test:** After fix, `get_gpu_load` should return non-zero values when GPU is active.

---

### 2.2 `clkrstInitialize()` — Clock Reading

**Current Status:** Stubbed (returns 0)
**Root Cause:** `clkrstInitialize()` crashes when called in `__appInit()`
**Hypothesis:** Similar to `nvInitialize()`, may need `sm:` open or different init sequence
**Approach:**
1. Try with `sm:` kept open
2. Check if `clkrst` needs `fsdev` to be mounted first
3. Try `pcv` service as alternative (older libnx versions used `pcv` instead of `clkrst`)

**Test:** After fix, `get_clocks` should return actual CPU/GPU frequencies.

---

### 2.3 `spsmInitialize()` — Already Fixed!

**Status:** ✅ FIXED
**Fix:** Keep `sm:` open during main loop (don't call `smExit()` in `__appInit()`)
**Verification:** MCP `reboot_switch` triggers actual system reboot

---

## Phase 3: Discovery Broadcast

### 3.1 Problem: `std::thread` Requires `svcCreateThread`

**Current Status:** UDP 12349 discovery not running
**Root Cause:** `discovery.cpp` uses `std::thread` which requires `svcCreateThread` syscall
**Approach Options:**

#### Option A: Add `svcCreateThread` to NPDM
- Update `template_fixed.npdm` to include `svcCreateThread: "0x08"` in syscalls
- Rebuild and test
- Risk: May require additional syscalls (`svcStartThread: "0x09"`, `svcExitThread: "0x0a"`)

#### Option B: Implement Timer-Based Discovery in Main Loop
- Remove `std::thread` from `discovery.cpp`
- Add a counter in `main()` loop that sends broadcast every N iterations
- Send UDP broadcast from the main thread using non-blocking socket
- Simpler, no threading needed

#### Option C: Use `svcCreateThread` Directly
- Call `svcCreateThread` manually instead of using `std::thread`
- More control over thread creation
- Requires proper NPDM syscall permissions

**Recommendation:** Option B is simplest and doesn't require NPDM changes.

---

## Phase 4: Real Feature Implementation

### 4.1 Screen Capture (`capture_screen`)

**Current Status:** Returns mock base64 string
**Implementation:**
1. Use `capssc` service to capture framebuffer
2. Convert RGBA framebuffer to JPEG
3. Base64 encode and return in JSON response
4. Alternatively, use `nv` service for GPU framebuffer access

**Dependencies:** May need `nvInitialize()` working first.

---

### 4.2 Save Backup/Restore (`backup_save`, `restore_save`)

**Current Status:** Returns stub success messages
**Implementation:**
1. Use `fs` service to navigate save data directories
2. Copy files to/from `/sdmc:/aura_saves/<name>/`
3. Handle save data mount/unmount properly

**Code Path:** `sysmodule/src/save_manager.cpp`

---

### 4.3 Input Injection (`inject_input`)

**Current Status:** Returns stub success message
**Implementation:**
1. Use `hid` service to send input reports
2. Parse button bitmask from JSON params
3. Use `hidSendVibrationValue` or `hidSetNpadJoyAssignment` for different input types

**Dependencies:** May need `hidInitialize()` in `__appInit()`.

---

### 4.4 PMU Counters (`get_pmu_counters`)

**Current Status:** Returns 0
**Implementation:**
1. Use `pm` service for performance counters
2. Or access PMU registers directly via `svcGetInfo`
3. Requires `pm:bm` or `pm:shell` service access

---

## Phase 5: Companion NRO Features

### 5.1 Companion Application (`aura_nx_companion.nro`)

**Current Status:** Builds but minimal functionality
**Enhancement Ideas:**
- Display current GPU/CPU load on screen
- Show active connections
- Allow manual save backup/restore from UI
- Display nxlink logs
- Show crash reports

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Fix `nvInitialize()` | Medium | High (GPU load is core feature) |
| 2 | Fix `clkrstInitialize()` | Low | High (Clocks are core feature) |
| 3 | Discovery broadcast (Option B) | Low | Medium (Nice to have) |
| 4 | Real `capture_screen` | Medium | Medium |
| 5 | Save backup/restore | Medium | Medium |
| 6 | Input injection | Medium | Low |
| 7 | PMU counters | Low | Low |
| 8 | Companion UI | High | Low |

---

## Quick Wins

### Add `svcCreateThread` to NPDM (for Option A)

Edit `sysmodule/template_fixed.npdm` and add to `syscalls`:
```json
"svcCreateThread": "0x08",
"svcStartThread": "0x09",
"svcExitThread": "0x0a"
```

Rebuild NPDM with `npdmtool` and test.

### Timer-Based Discovery (Option B)

In `main.cpp`, add counter and UDP broadcast in the main loop:
```cpp
static int discovery_counter = 0;
if (++discovery_counter >= 500) {  // Every ~5 seconds
    discovery_counter = 0;
    send_discovery_broadcast();
}
```

---

## Testing Checklist

After each feature is implemented:
- [ ] Build passes (`make clean && make`)
- [ ] Deploy to Switch (`curl` via FTP)
- [ ] Reboot Switch
- [ ] Test via direct TCP JSON-RPC
- [ ] Test via MCP tool
- [ ] Update `DEBUGGING_FINDINGS.md` with results
