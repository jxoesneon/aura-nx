import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Aura-NX E2E Integration Test Suite
 * This suite verifies the MCP server's ability to handle low-level TCP protocols
 * (nxlink and VFS Asset Server) and expose their state via MCP tools.
 */
describe('Aura-NX E2E Integration Tests', () => {
  let client: Client;

  beforeAll(async () => {
    // Initialize the MCP Client to communicate with the local server
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["ts-node", "mcp-server/src/index.ts"],
      env: { ...process.env, AURA_DEVICE_IP: "127.0.0.1" }
    });

    client = new Client({
      name: "integration-test-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  /**
   * nxlink Test: Verifies the 4-byte LE length + string handshake protocol.
   */
  describe('nxlink Protocol (Port 28771)', () => {
    it('should receive, buffer, and retrieve logs via nxlink handshake', async () => {
      const port = 28771;
      const logMessage = "LOG: Aura-NX System Initialization Complete";
      
      const socket = new net.Socket();
      await new Promise<void>((resolve, reject) => {
        socket.connect(port, '127.0.0.1', resolve);
        socket.on('error', reject);
      });

      // nxlink Protocol: [4-byte Little Endian Length][Message String]
      const messageBuffer = Buffer.from(logMessage);
      const header = Buffer.alloc(4);
      header.writeUInt32LE(messageBuffer.length, 0);
      
      socket.write(Buffer.concat([header, messageBuffer]));
      
      // Allow the server a brief window to process the socket data
      await new Promise(r => setTimeout(r, 200));
      socket.end();

      // Verify log persistence via the get_nxlink_logs MCP tool
      const result = await client.callTool({
        name: "get_nxlink_logs",
        arguments: {}
      });

      const logs = result.content[0].text as string;
      expect(logs).toContain(logMessage);
    });
  });

  /**
   * VFS Asset Server Test: Verifies the FETCH command for asset hot-reloading.
   */
  describe('VFS Asset Server (Port 12347)', () => {
    const dummyFile = 'dummy_asset.txt';
    const dummyContent = 'AURA_NX_VFS_DATA_0123456789';

    beforeAll(() => {
      // Create a dummy file in the project root for testing
      fs.writeFileSync(path.resolve(process.cwd(), dummyFile), dummyContent);
    });

    afterAll(() => {
      const filePath = path.resolve(process.cwd(), dummyFile);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it('should serve project assets via the TCP FETCH command', async () => {
      const port = 12347;
      const socket = new net.Socket();
      
      await new Promise<void>((resolve, reject) => {
        socket.connect(port, '127.0.0.1', resolve);
        socket.on('error', reject);
      });
      
      // Command format: FETCH <filename>\n
      socket.write(`FETCH ${dummyFile}\n`);

      const receivedData = await new Promise<string>((resolve) => {
        let data = '';
        socket.on('data', (chunk) => {
          data += chunk.toString();
        });
        socket.on('end', () => resolve(data));
      });

      expect(receivedData.trim()).toBe(dummyContent);
    });
  });
});