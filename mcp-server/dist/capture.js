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
exports.handleCaptureScreen = handleCaptureScreen;
const net = __importStar(require("net"));
/**
 * Requests a screen capture frame from the Aura-NX sysmodule.
 *
 * @param ip The IP address of the Nintendo Switch console.
 * @returns A base64 encoded string representing the captured frame (JPEG).
 */
async function handleCaptureScreen(ip) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const port = 12346;
        let data = '';
        client.connect(port, ip, () => {
            const request = {
                jsonrpc: '2.0',
                method: 'capture_screen',
                params: {},
                id: 1
            };
            client.write(JSON.stringify(request));
        });
        client.on('data', (chunk) => {
            data += chunk.toString();
            // Basic check if we have a full JSON response (assuming it ends with \n or just closes)
            try {
                const response = JSON.parse(data);
                if (response.result) {
                    resolve(response.result);
                    client.destroy();
                }
                else if (response.error) {
                    reject(new Error(response.error.message || 'Unknown JSON-RPC error'));
                    client.destroy();
                }
            }
            catch (e) {
                // Keep waiting for more data
            }
        });
        client.on('error', (err) => {
            reject(err);
        });
        client.on('close', () => {
            if (data) {
                try {
                    const response = JSON.parse(data);
                    if (response.result) {
                        resolve(response.result);
                    }
                    else {
                        reject(new Error('Incomplete or invalid response from sysmodule'));
                    }
                }
                catch (e) {
                    reject(new Error('Failed to parse response from sysmodule'));
                }
            }
            else {
                reject(new Error('Connection closed without data'));
            }
        });
        // Set a timeout
        client.setTimeout(5000);
        client.on('timeout', () => {
            client.destroy();
            reject(new Error('Connection timed out'));
        });
    });
}
