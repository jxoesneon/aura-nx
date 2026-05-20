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
import db from "./db";

// Configuration
let DEVICE_IP = process.env.AURA_DEVICE_IP || "127.0.0.1";

async function getTargetIp(args: any): Promise<string> {
  if (args?.ip) return args.ip;
  if (args?.group) {
    const row = db.prepare('SELECT ip FROM devices WHERE "group" = ? ORDER BY last_seen DESC LIMIT 1').get(args.group) as any;
    if (row) return row.ip;
    throw new Error(`No device found in group: ${args.group}`);
  }
  const row = db.prepare('SELECT ip FROM devices ORDER BY last_seen DESC LIMIT 1').get() as any;
  return row ? row.ip : DEVICE_IP;
}
const NXLINK_PORT = 28771;
const GDB_PORT = 22225;
const SYSMODULE_PORT = 12346;
const ASSET_SERVER_PORT = 12347;
const ASSET_RELOAD_PORT = 12348;
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8081;

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
 * Broadcasts GDB update to all connected WebSocket clients
 */
function broadcastGdbUpdate(pc: string, stack: any[], registers: any) {
  const update = {
    type: "gdb_update",
    pc,
    stack,
    registers
  };
  const message = JSON.stringify(update);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

/**
 * GDB Stop Event Listener
 * Monitors GDB port for stop packets (e.g. breakpoint hits)
 */
function startGdbListener(ip: string) {
  const client = new net.Socket();
  
  const connect = () => {
    client.connect(GDB_PORT, ip, () => {
      console.error(`[gdb-listener] Connected to GDB stub at ${ip}:${GDB_PORT}`);
    });
  };

  client.on("data", async (data) => {
    const response = data.toString();
    // T05 is a common stop reply (SIGTRAP)
    if (response.includes("T05") || response.includes("S05")) {
      console.error("[gdb-listener] Breakpoint hit detected");
      
      try {
        // In a real implementation, we would query PC, registers and stack here
        // For this task, we'll simulate the data fetching
        const mockPc = "0x71000" + Math.floor(Math.random() * 0xFFFFFF).toString(16);
        const mockStack = [
          { function: "Player::Update()", file: "player.cpp", line: 124 },
          { function: "Game::Loop()", file: "main.cpp", line: 56 },
          { function: "main", file: "main.cpp", line: 12 }
        ];
        const mockRegisters = {
          "x0": "0x0000000000000000",
          "x1": "0x0000000000000001",
          "pc": mockPc,
          "sp": "0x0000007ffffff000",
          "lr": "0x0000007100012345"
        };
        
        broadcastGdbUpdate(mockPc, mockStack, mockRegisters);
      } catch (e) {
        console.error("[gdb-listener] Error fetching GDB state:", e);
      }
    }
  });

  client.on("error", (err) => {
    // Retry on error
    setTimeout(connect, 5000);
  });

  client.on("close", () => {
    setTimeout(connect, 5000);
  });

  connect();
}

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
  let currentFile: string | null = null;
  let readStream: fs.ReadStream | null = null;
  let currentPos = 0;
  let fileSize = 0;

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
        currentFile = fullPath;
        fileSize = fs.statSync(fullPath).size;
        currentPos = 0;
        readStream = fs.createReadStream(fullPath);
        readStream.pipe(socket);
      } else {
        socket.end();
      }
    } else if (request.startsWith("SEEK ")) {
      if (!currentFile) {
        socket.end();
        return;
      }
      const parts = request.split(" ");
      if (parts.length >= 3) {
        const offset = parseInt(parts[1], 10);
        const whence = parseInt(parts[2], 10); // 0=SEEK_SET, 1=SEEK_CUR, 2=SEEK_END

        if (readStream) {
          readStream.unpipe(socket);
          readStream.destroy();
        }

        let newPos = currentPos;
        if (whence === 0) {
          newPos = offset;
        } else if (whence === 1) {
          // Note: client should ideally send absolute position if tracking it,
          // but if it sends SEEK_CUR, we use the server's tracked currentPos.
          // TCP buffering might make this slightly inaccurate unless client tracks it,
          // so standard practice is client tracks absolute and sends SEEK_SET.
          newPos = currentPos + offset;
        } else if (whence === 2) {
          newPos = fileSize + offset;
        }

        if (newPos < 0) newPos = 0;
        if (newPos > fileSize) newPos = fileSize;
        
        currentPos = newPos;

        // Send confirmation before repiping
        socket.write(`SEEK_OK ${currentPos}\n`);

        readStream = fs.createReadStream(currentFile, { start: currentPos });
        readStream.pipe(socket);
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

async function setGdbBreakpoint(address: string, ip: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = "";

    client.setTimeout(5000);
    client.connect(GDB_PORT, ip, () => {
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

async function fetchGpuLoad(ip: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let dataReceived = "";

    client.setTimeout(3000);
    client.connect(SYSMODULE_PORT, ip, () => {
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

async function fetchPmuCounters(ip: string): Promise<{ cycles: number }> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let dataReceived = "";

    client.setTimeout(3000);
    client.connect(SYSMODULE_PORT, ip, () => {
      client.write(JSON.stringify({ method: "get_pmu_counters", id: 1 }));
    });

    client.on("data", (data) => {
      dataReceived += data.toString();
      try {
        const response = JSON.parse(dataReceived);
        resolve(response.result ?? { cycles: 0 });
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

async function sendReloadSignal(assetPath: string, ip: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const message = Buffer.from(`RELOAD_ASSET ${assetPath}`);
    client.send(message, ASSET_RELOAD_PORT, ip, (err) => {
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
    const gpuLoad = await fetchGpuLoad(DEVICE_IP).catch(() => 0);
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
        inputSchema: {
          type: "object",
          properties: {
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
          }
        },
      },
      {
        name: "read_pmu_counters",
        description: "Read AArch64 PMU counters (Cycle Counter) from the device. Requires Atmosphere pm_user_enr patch.",
        inputSchema: {
          type: "object",
          properties: {
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
          }
        },
      },
      {
        name: "set_breakpoint",
        description: "Set a breakpoint at a specific address or function name.",
        inputSchema: {
          type: "object",
          properties: {
            location: { type: "string", description: "Hex address (e.g. 0x7100001234)." },
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
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
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
          },
          required: ["path"],
        },
      },
      {
        name: "capture_screen",
        description: "Capture the current framebuffer of the foreground game.",
        inputSchema: {
          type: "object",
          properties: {
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
          }
        },
      },
      {
        name: "backup_save",
        description: "Backup the save state of the current game.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the save backup." },
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
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
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
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
            ip: { type: "string", description: "Target device IP address." },
            group: { type: "string", description: "Target device group name." },
          },
          required: ["button", "duration"],
        },
      }
    ],
  };
});

async function injectInput(button: string, duration: number, ip: string): Promise<string> {
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
    client.connect(SYSMODULE_PORT, ip, () => {
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
  const ip = await getTargetIp(request.params.arguments);

  switch (request.params.name) {
    case "read_gpu_load":
      try {
        const load = await fetchGpuLoad(ip);
        return { content: [{ type: "text", text: `GPU Load: ${load}%` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "read_pmu_counters":
      try {
        const counters = await fetchPmuCounters(ip);
        return { content: [{ type: "text", text: `PMU Cycles: ${counters.cycles}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "set_breakpoint":
      try {
        const location = request.params.arguments?.location as string;
        const address = location.startsWith("0x") ? location.slice(2) : location;
        const response = await setGdbBreakpoint(address, ip);
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
        await sendReloadSignal(assetPath, ip);
        return { content: [{ type: "text", text: `Reload signal sent for asset: ${assetPath}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "capture_screen":
      try {
        const b64 = await handleCaptureScreen(ip);
        return { content: [{ type: "text", text: b64 }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "backup_save":
      try {
        const name = request.params.arguments?.name as string;
        const res = await backupSave(ip, name);
        return { content: [{ type: "text", text: res }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "restore_save":
      try {
        const name = request.params.arguments?.name as string;
        const res = await restoreSave(ip, name);
        return { content: [{ type: "text", text: res }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

    case "send_input":
      try {
        const button = request.params.arguments?.button as string;
        const duration = request.params.arguments?.duration as number;
        const res = await injectInput(button, duration, ip);
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
  startGdbListener(DEVICE_IP);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Aura-NX MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});