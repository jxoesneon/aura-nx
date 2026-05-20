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
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const net = __importStar(require("net"));
// Configuration
const DEVICE_IP = process.env.AURA_DEVICE_IP || "127.0.0.1";
const NXLINK_PORT = 28771;
const GDB_PORT = 22225;
const SYSMODULE_PORT = 12346;
const server = new index_js_1.Server({
    name: "aura-nx",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Global log buffer for nxlink data
let nxLogBuffer = "";
/**
 * nxlink listener (Port 28771)
 * Handles the nxlink handshake: 4-byte LE length + message string.
 */
const nxlinkServer = net.createServer((socket) => {
    console.error("nxlink client connected");
    let buffer = Buffer.alloc(0);
    socket.on("data", (data) => {
        const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 4) {
            const length = buffer.readUInt32LE(0);
            if (buffer.length >= 4 + length) {
                const message = buffer.toString("utf8", 4, 4 + length);
                console.error(`[nxlink] ${message}`);
                nxLogBuffer += message + "\n";
                // Keep buffer size reasonable
                if (nxLogBuffer.length > 10000) {
                    nxLogBuffer = nxLogBuffer.slice(-10000);
                }
                buffer = buffer.slice(4 + length);
            }
            else {
                break;
            }
        }
    });
    socket.on("end", () => {
        console.error("nxlink client disconnected");
    });
    socket.on("error", (err) => {
        console.error("nxlink socket error:", err);
    });
});
nxlinkServer.listen(NXLINK_PORT, () => {
    console.error(`nxlink listener started on port ${NXLINK_PORT}`);
});
/**
 * Helper to calculate GDB RSP checksum.
 */
function calculateChecksum(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum = (sum + data.charCodeAt(i)) % 256;
    }
    return sum.toString(16).padStart(2, "0");
}
/**
 * Simplified GDB client to set a breakpoint.
 */
async function setGdbBreakpoint(address) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let response = "";
        client.setTimeout(5000);
        client.connect(GDB_PORT, DEVICE_IP, () => {
            // Z0: Software breakpoint
            // kind: 4 for ARM64
            const packetData = `Z0,${address},4`;
            const packet = `$${packetData}#${calculateChecksum(packetData)}`;
            client.write(packet);
        });
        client.on("data", (data) => {
            response += data.toString();
            // Wait for ACK (+) or response
            if (response.includes("+") || response.includes("$")) {
                resolve(response);
                client.destroy();
            }
        });
        client.on("timeout", () => {
            client.destroy();
            reject(new Error("GDB connection timeout"));
        });
        client.on("error", (err) => {
            reject(err);
        });
    });
}
/**
 * Fetch GPU load from Switch sysmodule via JSON-RPC.
 */
async function fetchGpuLoad() {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let dataReceived = "";
        client.setTimeout(3000);
        client.connect(SYSMODULE_PORT, DEVICE_IP, () => {
            client.write(JSON.stringify({ method: "get_gpu_load", id: 1 }));
        });
        client.on("data", (data) => {
            dataReceived += data.toString();
            try {
                const response = JSON.parse(dataReceived);
                resolve(response.result?.gpu_load ?? 0);
                client.destroy();
            }
            catch (e) {
                // Wait for more data if not a complete JSON
            }
        });
        client.on("timeout", () => {
            client.destroy();
            reject(new Error("Sysmodule connection timeout"));
        });
        client.on("error", (err) => {
            reject(err);
        });
    });
}
/**
 * Handler for listing available tools.
 */
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "read_gpu_load",
                description: "Read the current GPU load percentage from the device.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "set_breakpoint",
                description: "Set a breakpoint at a specific address or function name.",
                inputSchema: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "Hex address to break at (e.g. 0x7100001234).",
                        },
                    },
                    required: ["location"],
                },
            },
            {
                name: "get_nxlink_logs",
                description: "Retrieve the buffered nxlink logs.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "reload_asset",
                description: "Reload a specific asset in the running process.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to the asset to reload.",
                        },
                    },
                    required: ["path"],
                },
            },
        ],
    };
});
/**
 * Handler for tool calls.
 */
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "read_gpu_load":
            try {
                const load = await fetchGpuLoad();
                return {
                    content: [{ type: "text", text: `GPU Load: ${load}%` }],
                };
            }
            catch (error) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Failed to fetch GPU load: ${error.message}` }],
                };
            }
        case "set_breakpoint":
            try {
                const location = request.params.arguments?.location;
                // Strip 0x if present for GDB packet
                const address = location.startsWith("0x") ? location.slice(2) : location;
                const response = await setGdbBreakpoint(address);
                return {
                    content: [{ type: "text", text: `GDB Response: ${response}` }],
                };
            }
            catch (error) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Failed to set breakpoint: ${error.message}` }],
                };
            }
        case "get_nxlink_logs":
            return {
                content: [{ type: "text", text: nxLogBuffer || "No logs available." }],
            };
        case "reload_asset":
            return {
                content: [{ type: "text", text: `Asset reloaded: ${request.params.arguments?.path} (Placeholder)` }],
            };
        default:
            throw new Error("Unknown tool");
    }
});
/**
 * Start the server using stdio transport.
 */
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Aura-NX MCP server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
