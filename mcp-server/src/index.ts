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
import { WebSocketServer } from "ws";

import { startDiscoveryListener } from "./discovery";
import { handleCaptureScreen } from "./capture";
import { startCrashMonitor } from "./crash_monitor";
import { backupSave, restoreSave } from "./save_manager";

// Configuration
let DEVICE_IP = process.env.AURA_DEVICE_IP || "127.0.0.1";
const NXLINK_PORT = 28771;
const GDB_PORT = 22225;
const SYSMODULE_PORT = 12346;
const ASSET_SERVER_PORT = 12347;
const ASSET_RELOAD_PORT = 12348;
const WS_PORT = 8081;

const server = new Server(
  {
    name: "aura-nx",
    version: "1.0.0",
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
 */
const nxlinkServer = net.createServer((socket) => {
  let buffer = Buffer.alloc(0);

  socket.on("data", (data) => {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0);
      if (buffer.length >= 4 + length) {
        const message = buffer.toString("utf8", 4, 4 + length);
        nxLogBuffer += message + "\n";
        if (nxLogBuffer.length > 10000) {
          nxLogBuffer = nxLogBuffer.slice(-10000);
        }
        buffer = buffer.slice(4 + length);
      } else {
        break;
      }
    }
  });

  socket.on("error", (err) => {
    // Ignore generic errors
  });
});

nxlinkServer.listen(NXLINK_PORT, () => {
  console.error(`nxlink listener started on port ${NXLINK_PORT}`);
});

/**
 * Asset fetching TCP server (Port 12347)
 */
const assetServer = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString().trim();
    if (request.startsWith("FETCH ")) {
      const relativePath = request.slice(6).trim();
      const projectRoot = process.cwd();
      const fullPath = path.resolve(projectRoot, relativePath);

      if (!fullPath.startsWith(projectRoot)) {
        socket.end();
        return;
      }

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const readStream = fs.createReadStream(fullPath);
        readStream.pipe(socket);
      } else {
        socket.end();
      }
    } else {
      socket.end();
    }
  });
});

assetServer.listen(ASSET_SERVER_PORT, () => {
  console.error(`Asset server started on port ${ASSET_SERVER_PORT}`);
});

function calculateChecksum(data: string): string {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data.charCodeAt(i)) % 256;
  }
  return sum.toString(16).padStart(2, "0");
}

async function setGdbBreakpoint(address: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = "";

    client.setTimeout(5000);
    client.connect(GDB_PORT, DEVICE_IP, () => {
      const packetData = `Z0,${address},4`;
      const packet = `$${packetData}#${calculateChecksum(packetData)}`;
      client.write(packet);
    });

    client.on("data", (data) => {
      response += data.toString();
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
        resolve(response.result?.load ?? response.result?.gpu_load ?? 0);
        client.destroy();
      } catch (e) {
      }
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Timeout at ${DEVICE_IP}`));
    });

    client.on("error", (err: any) => {
      reject(err);
    });
  });
}

async function sendReloadSignal(assetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const message = Buffer.from(`RELOAD_ASSET ${assetPath}`);
    client.send(message, ASSET_RELOAD_PORT, DEVICE_IP, (err) => {
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * WebSocket Telemetry Server
 */
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws) => {
  console.error("Dashboard connected to telemetry");
});

setInterval(async () => {
  try {
    const gpuLoad = await fetchGpuLoad().catch(() => 0);
    const telemetry = {
      type: "telemetry",
      deviceIp: DEVICE_IP,
      gpuLoad,
      logs: nxLogBuffer,
    };
    
    const message = JSON.stringify(telemetry);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
    
    nxLogBuffer = ""; // Clear logs after broadcast to avoid duplicates
  } catch (error) {
    // Ignore errors during broadcast
  }
}, 1000);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_gpu_load",
        description: "Read the current GPU load percentage from the device.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "set_breakpoint",
        description: "Set a breakpoint at a specific address or function name.",
        inputSchema: {
          type: "object",
          properties: {
            location: { type: "string", description: "Hex address (e.g. 0x7100001234)." },
          },
          required: ["location"],
        },
      },
      {
        name: "get_nxlink_logs",
        description: "Retrieve the buffered nxlink logs.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "reload_asset",
        description: "Reload a specific asset in the running process.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the asset to reload." },
          },
          required: ["path"],
        },
      },
      {
        name: "capture_screen",
        description: "Capture the current framebuffer of the foreground game.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "backup_save",
        description: "Backup the save state of the current game.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the save backup." },
          },
          required: ["name"],
        },
      },
      {
        name: "restore_save",
        description: "Restore a previously backed up save state.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the save backup to restore." },
          },
          required: ["name"],
        },
      },
      {
        name: "send_input",
        description: "Inject a button press into the system.",
        inputSchema: {
          type: "object",
          properties: {
            button: { type: "string", description: "Button to press (e.g., 'A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', 'Plus', 'Minus', 'Left', 'Up', 'Right', 'Down')." },
            duration: { type: "number", description: "Duration to hold the button in milliseconds." },
          },
          required: ["button", "duration"],
        },
      }
    ],
  };
});

async function injectInput(button: string, duration: number): Promise<string> {
  const buttonMap: { [key: string]: string } = {
    "A": (1n << 0n).toString(),
    "B": (1n << 1n).toString(),
    "X": (1n << 2n).toString(),
    "Y": (1n << 3n).toString(),
    "StickL": (1n << 4n).toString(),
    "StickR": (1n << 5n).toString(),
    "L": (1n << 6n).toString(),
    "R": (1n << 7n).toString(),
    "ZL": (1n << 8n).toString(),
    "ZR": (1n << 9n).toString(),
    "Plus": (1n << 10n).toString(),
    "Minus": (1n << 11n).toString(),
    "Left": (1n << 12n).toString(),
    "Up": (1n << 13n).toString(),
    "Right": (1n << 14n).toString(),
    "Down": (1n << 15n).toString(),
  };

  const buttonValue = buttonMap[button];
  if (!buttonValue) {
    throw new Error(`Unknown button: ${button}`);
  }

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let dataReceived = "";

    client.setTimeout(3000);
    client.connect(SYSMODULE_PORT, DEVICE_IP, () => {
      client.write(JSON.stringify({ 
        method: "inject_input", 
        params: { buttons: buttonValue, duration: duration },
        id: 1 
      }));
    });

    client.on("data", (data) => {
      dataReceived += data.toString();
      try {
        const response = JSON.parse(dataReceived);
        resolve(response.result ?? "Input injected");
        client.destroy();
      } catch (e) {
      }
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Timeout at ${DEVICE_IP}`));
    });

    client.on("error", (err: any) => {
      reject(err);
    });
  });
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "read_gpu_load":
      try {
        const load = await fetchGpuLoad();
        return { content: [{ type: "text", text: `GPU Load: ${load}%` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "set_breakpoint":
      try {
        const location = request.params.arguments?.location as string;
        const address = location.startsWith("0x") ? location.slice(2) : location;
        const response = await setGdbBreakpoint(address);
        return { content: [{ type: "text", text: `GDB Response: ${response}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "get_nxlink_logs":
      const logs = nxLogBuffer;
      nxLogBuffer = "";
      return { content: [{ type: "text", text: logs || "No logs available." }] };

    case "reload_asset":
      try {
        const assetPath = request.params.arguments?.path as string;
        await sendReloadSignal(assetPath);
        return { content: [{ type: "text", text: `Reload signal sent for asset: ${assetPath}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "capture_screen":
      try {
        const b64 = await handleCaptureScreen(DEVICE_IP);
        return { content: [{ type: "text", text: b64 }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "backup_save":
      try {
        const name = request.params.arguments?.name as string;
        const res = await backupSave(DEVICE_IP, name);
        return { content: [{ type: "text", text: res }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "restore_save":
      try {
        const name = request.params.arguments?.name as string;
        const res = await restoreSave(DEVICE_IP, name);
        return { content: [{ type: "text", text: res }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "send_input":
      try {
        const button = request.params.arguments?.button as string;
        const duration = request.params.arguments?.duration as number;
        const res = await injectInput(button, duration);
        return { content: [{ type: "text", text: res }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    default:
      throw new Error("Unknown tool");
  }
});

async function main() {
  // Start the newly added background tasks
  startDiscoveryListener((ip) => {
    // Auto-update the active device IP when discovered
    DEVICE_IP = ip;
  });
  startCrashMonitor();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Aura-NX MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});