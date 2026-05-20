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
exports.backupSave = backupSave;
exports.restoreSave = restoreSave;
const net = __importStar(require("net"));
const SYSMODULE_PORT = 12346;
/**
 * Sends a JSON-RPC backup_save command to the sysmodule.
 *
 * @param ip The IP address of the Switch device.
 * @param name The name of the save to backup.
 * @returns A promise that resolves with the status message from the device.
 */
async function backupSave(ip, name) {
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
                }
                else {
                    resolve(response.result?.status || "Backup initiated successfully");
                }
                client.destroy();
            }
            catch (e) {
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
async function restoreSave(ip, name) {
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
                }
                else {
                    resolve(response.result?.status || "Restore initiated successfully");
                }
                client.destroy();
            }
            catch (e) {
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
