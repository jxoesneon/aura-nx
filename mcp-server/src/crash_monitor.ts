import * as net from "net";
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Starts the Crash Telemetry monitor on TCP port 12350.
 * Listens for incoming crash dumps from the Aura-NX sysmodule.
 */
export function startCrashMonitor() {
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

        // Attempt to symbolicate
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
function symbolicate(dumpPath: string) {
  // Mock symbolication logic
  console.error("[crash-monitor] Symbolication Report:");
  console.error("  Thread: Main (ID 0x100)");
  
  const mockAddress = "0x7100012345";
  const elfPath = path.join(process.cwd(), "aura_sysmodule.elf");

  if (fs.existsSync(elfPath)) {
    execFile("aarch64-none-elf-addr2line", ["-e", elfPath, "-f", "-C", mockAddress], (error, stdout, stderr) => {
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
  } else {
    console.error(`[crash-monitor] Mock trace for ${mockAddress}:`);
    console.error("    aura::sysmodule::CrashHandler() + 0x42");
    console.error("    aura::sysmodule::MainLoop() + 0x1a8");
  }
}
