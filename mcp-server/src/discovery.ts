import * as dgram from "dgram";
import db from "./db";

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
      db.prepare(`
        INSERT INTO devices (ip, name, status, last_seen)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(ip) DO UPDATE SET
          status = excluded.status,
          last_seen = CURRENT_TIMESTAMP
      `).run(rinfo.address, `Switch-${rinfo.address.split('.').pop()}`, 'active');

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
