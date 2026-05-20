import * as dgram from "dgram";

const DISCOVERY_PORT = 12349;
const DISCOVERY_PACKET = "AURA_ANNOUNCE";

const discoveredIps = new Set<string>();

/**
 * Starts a UDP listener that waits for 'AURA_ANNOUNCE' packets.
 * Maintains a set of active IPs to prevent duplicate notifications.
 */
export function startDiscoveryListener(onDiscover: (ip: string) => void) {
  const socket = dgram.createSocket("udp4");

  socket.on("message", (msg, rinfo) => {
    if (msg.toString() === DISCOVERY_PACKET) {
      if (!discoveredIps.has(rinfo.address)) {
        discoveredIps.add(rinfo.address);
        console.error(`[discovery] Discovered new device at ${rinfo.address}`);
        onDiscover(rinfo.address);
      }
    }
  });

  socket.on("error", (err) => {
    console.error(`[discovery] Socket error: ${err.message}`);
  });

  socket.bind(DISCOVERY_PORT, () => {
    console.error(`[discovery] Listening on UDP port ${DISCOVERY_PORT}`);
  });
}
