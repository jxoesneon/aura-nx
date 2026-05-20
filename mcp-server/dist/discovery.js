"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDiscoveryListener = startDiscoveryListener;
const dgram = __importStar(require("dgram"));
const DISCOVERY_PORT = 12349;
const DISCOVERY_PACKET = "AURA_ANNOUNCE";
const discoveredIps = new Set();
/**
 * Starts a UDP listener that waits for 'AURA_ANNOUNCE' packets.
 * Maintains a set of active IPs to prevent duplicate notifications.
 */
function startDiscoveryListener(onDiscover) {
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
