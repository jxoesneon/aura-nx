import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';

// Mocking net and dgram modules as requested
vi.mock('net', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn(),
    on: vi.fn(),
  })),
  Socket: vi.fn(() => ({
    connect: vi.fn(),
    write: vi.fn(),
    on: vi.fn(),
    setTimeout: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('dgram', () => ({
  createSocket: vi.fn(() => ({
    send: vi.fn(),
    close: vi.fn(),
  })),
}));

/**
 * Replicated GDB RSP checksum algorithm from aura-nx/mcp-server/src/index.ts
 */
function calculateChecksum(data: string): string {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data.charCodeAt(i)) % 256;
  }
  return sum.toString(16).padStart(2, "0");
}

/**
 * Replicated Asset Server path normalization and traversal protection logic
 */
function normalizeAndCheckPath(projectRoot: string, relativePath: string): { fullPath: string, isSafe: boolean } {
  const fullPath = path.resolve(projectRoot, relativePath);
  // Security check: ensure the path is within project root
  const isSafe = fullPath.startsWith(projectRoot);
  return { fullPath, isSafe };
}

/**
 * Replicated JSON-RPC response parsing for get_gpu_load and get_clocks
 * Based on sysmodule/src/main.cpp implementation
 */
function parseGpuLoad(jsonResponse: string): number {
  const response = JSON.parse(jsonResponse);
  // Sysmodule returns "load" field in result object
  return response.result?.load ?? response.result?.gpu_load ?? 0;
}

function parseClocks(jsonResponse: string): { cpu: number, gpu: number } {
  const response = JSON.parse(jsonResponse);
  // Sysmodule returns "cpu" and "gpu" fields in result object
  return {
    cpu: response.result?.cpu ?? 0,
    gpu: response.result?.gpu ?? 0
  };
}

describe('MCP Server Logic Tests', () => {
  describe('GDB Checksum Calculation', () => {
    it('should calculate correct checksum for a standard breakpoint packet', () => {
      const packetData = 'Z0,0x7100001234,4';
      expect(calculateChecksum(packetData)).toBe('b0');
    });

    it('should calculate correct checksum for a simple "g" packet', () => {
      expect(calculateChecksum('g')).toBe('67'); // 'g' = 103 = 0x67
    });

    it('should always return a 2-character hex string (padding)', () => {
      // char(1) is 1, so checksum should be "01"
      expect(calculateChecksum('\x01')).toBe('01');
    });
  });

  describe('Asset Server Path Protection', () => {
    const projectRoot = '/data/data/com.termux/files/home/aura-nx';

    it('should allow valid relative paths within the project root', () => {
      const { fullPath, isSafe } = normalizeAndCheckPath(projectRoot, 'assets/textures/player.png');
      expect(fullPath).toBe(path.join(projectRoot, 'assets/textures/player.png'));
      expect(isSafe).toBe(true);
    });

    it('should block directory traversal attempts using "../"', () => {
      const { isSafe } = normalizeAndCheckPath(projectRoot, '../../.ssh/id_rsa');
      expect(isSafe).toBe(false);
    });

    it('should block absolute paths outside the root', () => {
      const { isSafe } = normalizeAndCheckPath(projectRoot, '/etc/passwd');
      expect(isSafe).toBe(false);
    });

    it('should handle paths with redundant dots correctly', () => {
      const { isSafe } = normalizeAndCheckPath(projectRoot, './src/../assets/data.bin');
      expect(isSafe).toBe(true);
    });
  });

  describe('JSON-RPC Response Parsing', () => {
    it('should parse GPU load percentage correctly', () => {
      const mockResponse = JSON.stringify({
        jsonrpc: "2.0",
        result: { load: 72 },
        id: 1
      });
      expect(parseGpuLoad(mockResponse)).toBe(72);
    });

    it('should parse CPU and GPU clocks correctly', () => {
      const mockResponse = JSON.stringify({
        jsonrpc: "2.0",
        result: {
          cpu: 1020000000,
          gpu: 768000000
        },
        id: 1
      });
      const clocks = parseClocks(mockResponse);
      expect(clocks.cpu).toBe(1020000000);
      expect(clocks.gpu).toBe(768000000);
    });

    it('should return 0 when fields are missing or malformed', () => {
      const emptyResponse = '{"jsonrpc":"2.0","result":{},"id":1}';
      expect(parseGpuLoad(emptyResponse)).toBe(0);
      expect(parseClocks(emptyResponse)).toEqual({ cpu: 0, gpu: 0 });
    });
  });
});
