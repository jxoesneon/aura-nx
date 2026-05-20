#ifndef AURA_NX_H
#define AURA_NX_H

/**
 * @file aura_nx.h
 * @brief Aura-NX Client Library Public API
 */

#ifdef __cplusplus
extern "C" {
#endif

#include <switch.h>

/**
 * @brief Initializes the Aura-NX client library and registers the net:/ VFS.
 * @param pc_ip The LAN IP address of the PC running the Aura-NX MCP server.
 * @return Result 0 on success, or an error code.
 */
Result auraNxInit(const char* pc_ip);

/**
 * @brief Updates the Aura-NX client state. Should be called periodically.
 */
void auraNxUpdate();

/**
 * @brief Sets a callback for asset reload signals.
 * @param cb The callback function, receiving the path of the asset to reload.
 */
void auraNxSetReloadCallback(void (*cb)(const char* path));

#ifdef __cplusplus
}
#endif

#endif // AURA_NX_H
