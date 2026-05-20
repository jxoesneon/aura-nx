# 4. Asset Hot-Reloading (Network VFS)

To provide a high-performance engineering workflow, Aura-NX bypasses the SD card entirely for asset development, streaming directly from the PC.

## Why Not LayeredFS (`fs-mitm`)?
Atmosphere's `fs-mitm` is excellent for static RomFS modding, but dynamic runtime file swapping is too slow and structurally rigid for instant "hot reloading" of textures and shaders.

## Network Virtual File System (VFS) Architecture
Aura-NX requires the target homebrew game to link against a lightweight network library.

1.  **VFS Layer (`devoptab`):** 
    The game registers a custom device (e.g., `net:/`) using `libnx`'s `devoptab` interface. Calls like `fopen("net:/textures/hero.png")` are serialized over TCP to the Aura-NX PC MCP server, fetching the file directly into Switch RAM.
2.  **Notification Layer (UDP):**
    The game runs a background listener thread on a UDP port. 
    When the PC-side File Watcher detects a change in the workspace, it fires a `RELOAD_ASSET &lt;path&gt;` packet to the Switch.
3.  **Engine Pipeline Swap:**
    *   **Textures:** The UDP listener signals the render thread. The engine re-fetches the asset via `net:/` and issues the native `glTexImage2D` or NVN equivalent to swap the GPU buffer.
    *   **Shaders:** The PC pre-compiles the shader to native Tegra binary. The Switch fetches the binary and re-binds the shader state mid-frame.

This allows agents to programmatically modify a fragment shader on the PC, trigger the MCP, and visually confirm the result on the Switch in under 100 milliseconds.