# 8. Release Operations (RelOps)

Aura-NX employs a rigorous release process to ensure that each version is stable, compatible, and verifiable.

## Versioning Strategy
Aura-NX follows [Semantic Versioning 2.0.0](https://semver.org/).

*   **MAJOR:** Incompatible API changes (e.g., breaking the JSON-RPC schema or IPC interface).
*   **MINOR:** Backwards-compatible features (e.g., a new MCP tool like `read_emc_bandwidth`).
*   **PATCH:** Backwards-compatible bug fixes (e.g., fixing a race condition in the VFS).

## Release Channels
| Channel | Target Audience | Stability |
| :--- | :--- | :--- |
| **Nightly** | Contributors / Testers | Bleeding edge. High risk of crashes. |
| **Beta** | Early Adopters | Feature complete. Undergoing HIL testing. |
| **Stable** | Production Teams | Institutional grade. Verified through the full QA lifecycle. |

## Build & Packaging

### Switch Components
*   **Build Artifacts:** `AuraNX.nsp` (Sysmodule), `AuraNX.elf` (Debug symbols).
*   **Symbolication:** The `.elf` file for every stable release is archived in a long-term storage (LTS) bucket to ensure that any crash dumps reported from the field can be symbolicatied even years later.

### PC Components
*   **Build Artifacts:** `@aura-nx/mcp-server` (NPM package).
*   **Distribution:** Published to internal or public NPM registries with a signed provenance.

## Deployment & Rollback
*   **Deployment:** For Switch homebrew, deployment involves copying the `.nsp` to the SD card at `/atmosphere/contents/` and rebooting.
*   **Rollback:** If a P0 bug is detected in a new release, teams should revert to the previous `Stable` build immediately. The Aura-NX PC Orchestrator is designed to be backwards compatible with at least one previous MINOR version of the sysmodule to facilitate smooth rollbacks.

## Maintenance & Support
*   **LTS:** One version per year is designated as a **Long Term Support** release, receiving critical security patches for 24 months.
*   **End-of-Life (EOL):** Older versions are deprecated 6 months after a new MAJOR release. No patches are provided for EOL versions.