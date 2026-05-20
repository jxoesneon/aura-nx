#pragma once

/**
 * Starts a background thread that periodically broadcasts 'AURA_ANNOUNCE' 
 * packets over UDP to port 12349.
 */
void startDiscoveryBroadcast();
