# 2. Debugging Protocol (GDB & nxlink)

Aura-NX utilizes existing Atmosphere capabilities to provide execution control and console telemetry.

## nxlink (Logging Telemetry)
The MCP server implements an `nxlink` listener to capture all `printf` / `stdout` output from the Switch app in real-time.

*   **Port:** TCP `28771`
*   **Handshake:** The Switch connects to the PC, sending a 4-byte little-endian integer indicating the length of the Application Name, followed by the ASCII string itself.
*   **Data Stream:** Raw byte stream from `libnx`'s virtual `nxlink:` device (`dup2` hijacked FD 1 and 2).
*   **MCP Exposure:** Can be exposed as an MCP Resource subscription (`switch://logs/live`).

## Atmosphere Standalone GDB Stub
For source-level debugging, the MCP server acts as a GDB client (wrapping standard GDB RSP).

*   **Configuration:** `sd:/atmosphere/config/system_settings.ini` must have `enable_standalone_gdbstub = u8!0x1`.
*   **Port:** TCP `22225`
*   **Supported Features (AArch64):**
    *   Software (`break`) and Hardware (`hbreak`) breakpoints (up to 6 HW slots).
    *   Hardware watchpoints (`watch`, `rwatch`, `awatch`).
    *   Full thread listing and context switching (`info threads`).
*   **ASLR Handling:** The MCP *must* issue the `monitor get info` command to retrieve the ASLR slide offset, which is necessary to correctly map the ELF symbols to runtime memory.
*   **Execution Control:** Use `monitor wait application` to freeze the app on the very first instruction upon launch.