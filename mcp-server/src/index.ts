import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as dgram from "dgram";

// Configuration
const DEVICE_IP = process.env.AURA_DEVICE_IP || "127.0.0.1";
const NXLINK_PORT = 28771;
const GDB_PORT = 22225;
const SYSMODULE_PORT = 12346;
const ASSET_SERVER_PORT = 12347;
const ASSET_RELOAD_PORT = 12348;

const server = new Server(
  {
    name: "aura-nx",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
      } else {
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
 * Asset fetching TCP server (Port 12347)
 * Handles 'FETCH <path>' by reading files from the project root and streaming them.
 */
const assetServer = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString().trim();
    if (request.startsWith("FETCH ")) {
      const relativePath = request.slice(6).trim();
      const projectRoot = process.cwd();
      const fullPath = path.resolve(projectRoot, relativePath);

      // Security check: ensure the path is within project root
      if (!fullPath.startsWith(projectRoot)) {
        console.error(`[asset-server] Blocked attempt to fetch file outside root: ${fullPath}`);
        socket.end();
        return;
      }

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        console.error(`[asset-server] Serving ${relativePath}`);
        const readStream = fs.createReadStream(fullPath);
        readStream.pipe(socket);
      } else {
        console.error(`[asset-server] File not found or invalid: ${relativePath}`);
        socket.end();
      }
    } else {
      socket.end();
    }
  });

  socket.on("error", (err) => {
    console.error("[asset-server] Socket error:", err);
  });
});

assetServer.listen(ASSET_SERVER_PORT, () => {
  console.error(`Asset server started on port ${ASSET_SERVER_PORT}`);
});

/**
 * Helper to calculate GDB RSP checksum.
 */
function calculateChecksum(data: string): string {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data.charCodeAt(i)) % 256;
  }
  return sum.toString(16).padStart(2, "0");
}

/**
 * Simplified GDB client to set a breakpoint.
 */
async function setGdbBreakpoint(address: string): Promise<string> {
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
async function fetchGpuLoad(): Promise<number> {
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
      } catch (e) {
        // Wait for more data if not a complete JSON
      }
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Sysmodule connection timed out at ${DEVICE_IP}`));
    });

    client.on("error", (err: any) => {
      if (err.code === "ECONNREFUSED") {
        reject(new Error(`Connection refused at ${DEVICE_IP}:${SYSMODULE_PORT}. Is the sysmodule running?`));
      } else if (err.code === "ETIMEDOUT") {
        reject(new Error(`Connection timed out at ${DEVICE_IP}:${SYSMODULE_PORT}.`));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Helper to send UDP reload signal to the device.
 */
async function sendReloadSignal(assetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const message = Buffer.from(`RELOAD_ASSET ${assetPath}`);
    client.send(message, ASSET_RELOAD_PORT, DEVICE_IP, (err) => {
      client.close();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Handler for listing available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "read_gpu_load":
      try {
        const load = await fetchGpuLoad();
        return {
          content: [{ type: "text", text: `GPU Load: ${load}%` }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to fetch GPU load: ${error.message}` }],
        };
      }

    case "set_breakpoint":
      try {
        const location = request.params.arguments?.location as string;
        // Strip 0x if present for GDB packet
        const address = location.startsWith("0x") ? location.slice(2) : location;
        const response = await setGdbBreakpoint(address);
        return {
          content: [{ type: "text", text: `GDB Response: ${response}` }],
        };
      } catch (error: any) {
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
      try {
        const assetPath = request.params.arguments?.path as string;
        await sendReloadSignal(assetPath);
        return {
          content: [{ type: "text", text: `Reload signal sent for asset: ${assetPath}` }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to send reload signal: ${error.message}` }],
        };
      }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Aura-NX MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
