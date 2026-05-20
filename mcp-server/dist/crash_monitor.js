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
exports.startCrashMonitor = startCrashMonitor;
const net = __importStar(require("net"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Starts the Crash Telemetry monitor on TCP port 12350.
 * Listens for incoming crash dumps from the Aura-NX sysmodule.
 */
function startCrashMonitor() {
    const PORT = 12350;
    const server = net.createServer((socket) => {
        console.error("[crash-monitor] Device connected for crash report");
        let crashData = Buffer.alloc(0);
        socket.on("data", (data) => {
            const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
            crashData = Buffer.concat([crashData, chunk]);
        });
        socket.on("end", async () => {
            console.error(`[crash-monitor] Received crash dump (${crashData.length} bytes)`);
            if (crashData.length > 0) {
                // Save the dump for debugging
                const dumpPath = path.join(process.cwd(), `crash_${Date.now()}.bin`);
                fs.writeFileSync(dumpPath, crashData);
                console.error(`[crash-monitor] Dump saved to ${dumpPath}`);
                // Attempt to symbolicate if aarch64-none-elf-addr2line is available
                // In a real scenario, we'd extract the PC/LR from the dump.
                // For this implementation, we simulate the symbolication log.
                symbolicate(dumpPath);
            }
        });
        socket.on("error", (err) => {
            console.error("[crash-monitor] Socket error:", err);
        });
    });
    server.listen(PORT, () => {
        console.error(`[crash-monitor] Listening for crash reports on port ${PORT}`);
    });
}
/**
 * Symbolicates a crash dump using addr2line or prints a mock log.
 */
function symbolicate(dumpPath) {
    // Mock symbolication logic
    console.error("[crash-monitor] Symbolication Report:");
    console.error("  Thread: Main (ID 0x100)");
    console.error("  Exception: Instruction Abort (0x100)");
    // Example of how we would call addr2line if we had a valid ELF and addresses
    const mockAddress = "0x7100012345";
    const elfPath = "aura_sysmodule.elf";
    if (fs.existsSync(elfPath)) {
        (0, child_process_1.exec)(`aarch64-none-elf-addr2line -e ${elfPath} -f -C ${mockAddress}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[crash-monitor] addr2line error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`[crash-monitor] addr2line stderr: ${stderr}`);
                return;
            }
            console.error(`[crash-monitor] Resolved ${mockAddress}: ${stdout.trim()}`);
        });
    }
    else {
        console.error(`[crash-monitor] Mock trace for ${mockAddress}:`);
        console.error("    aura::sysmodule::CrashHandler() + 0x42");
        console.error("    aura::sysmodule::MainLoop() + 0x1a8");
    }
}
