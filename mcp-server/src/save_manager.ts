import * as net from "net";

const SYSMODULE_PORT = 12346;

/**
 * Sends a JSON-RPC backup_save command to the sysmodule.
 * 
 * @param ip The IP address of the Switch device.
 * @param name The name of the save to backup.
 * @returns A promise that resolves with the status message from the device.
 */
export async function backupSave(ip: string, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let dataReceived = "";

    client.setTimeout(5000);
    client.connect(SYSMODULE_PORT, ip, () => {
      client.write(JSON.stringify({
        jsonrpc: "2.0",
        method: "backup_save",
        params: { name },
        id: 1
      }));
    });

    client.on("data", (data) => {
      dataReceived += data.toString();
      try {
        const response = JSON.parse(dataReceived);
        if (response.error) {
          reject(new Error(response.error.message || "Backup failed"));
        } else {
          resolve(response.result?.status || "Backup initiated successfully");
        }
        client.destroy();
      } catch (e) {
        // Wait for complete JSON payload
      }
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Backup request timed out for device at ${ip}`));
    });

    client.on("error", (err) => {
      reject(new Error(`Backup connection error: ${err.message}`));
    });
  });
}

/**
 * Sends a JSON-RPC restore_save command to the sysmodule.
 * 
 * @param ip The IP address of the Switch device.
 * @param name The name of the save to restore.
 * @returns A promise that resolves with the status message from the device.
 */
export async function restoreSave(ip: string, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let dataReceived = "";

    client.setTimeout(5000);
    client.connect(SYSMODULE_PORT, ip, () => {
      client.write(JSON.stringify({
        jsonrpc: "2.0",
        method: "restore_save",
        params: { name },
        id: 1
      }));
    });

    client.on("data", (data) => {
      dataReceived += data.toString();
      try {
        const response = JSON.parse(dataReceived);
        if (response.error) {
          reject(new Error(response.error.message || "Restore failed"));
        } else {
          resolve(response.result?.status || "Restore initiated successfully");
        }
        client.destroy();
      } catch (e) {
        // Wait for complete JSON payload
      }
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Restore request timed out for device at ${ip}`));
    });

    client.on("error", (err) => {
      reject(new Error(`Restore connection error: ${err.message}`));
    });
  });
}
