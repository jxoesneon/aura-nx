import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as net from 'net';
import { handleCaptureScreen } from '../../mcp-server/src/capture';

vi.mock('net');

describe('capture', () => {
  let mockSocket: any;
  let eventHandlers: { [key: string]: Function } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};
    mockSocket = {
      connect: vi.fn((port, ip, cb) => {
        if (cb) setTimeout(cb, 0);
        return mockSocket;
      }),
      write: vi.fn(),
      on: vi.fn((event, handler) => {
        eventHandlers[event] = handler;
        return mockSocket;
      }),
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    };
    (net.Socket as any).mockReturnValue(mockSocket);
  });

  it('should handle successful screen capture', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(mockSocket.connect).toHaveBeenCalledWith(12346, '192.168.1.10', expect.any(Function));
    expect(mockSocket.write).toHaveBeenCalledWith(JSON.stringify({
      jsonrpc: '2.0',
      method: 'capture_screen',
      params: {},
      id: 1
    }));

    // Simulate response
    const mockResponse = JSON.stringify({
      jsonrpc: '2.0',
      result: 'base64data',
      id: 1
    });
    eventHandlers['data'](Buffer.from(mockResponse));

    const result = await promise;
    expect(result).toBe('base64data');
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it('should handle partial data then full response', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    
    await new Promise(resolve => setTimeout(resolve, 10));

    const part1 = '{"jsonrpc": "2.0", "res';
    const part2 = 'ult": "success", "id": 1}';
    
    eventHandlers['data'](Buffer.from(part1));
    eventHandlers['data'](Buffer.from(part2));

    const result = await promise;
    expect(result).toBe('success');
  });

  it('should handle JSON-RPC error response', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    await new Promise(resolve => setTimeout(resolve, 10));

    const mockResponse = JSON.stringify({
      jsonrpc: '2.0',
      error: { message: 'Failed to capture' },
      id: 1
    });
    eventHandlers['data'](Buffer.from(mockResponse));

    await expect(promise).rejects.toThrow('Failed to capture');
  });

  it('should handle socket error', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    eventHandlers['error'](new Error('Network error'));

    await expect(promise).rejects.toThrow('Network error');
  });

  it('should handle timeout', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    eventHandlers['timeout']();

    await expect(promise).rejects.toThrow('Connection timed out');
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it('should handle close with data (result)', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    eventHandlers['data'](Buffer.from('{"jsonrpc": "2.0", "result": "closed_data", "id": 1}'));
    // We don't call resolve yet because handleCaptureScreen might be waiting for more or just destroys on first valid parse.
    // In capture.ts: resolve(response.result); client.destroy();
    // But if it didn't destroy yet...
    eventHandlers['close']();

    const result = await promise;
    expect(result).toBe('closed_data');
  });

  it('should handle close with invalid data', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    eventHandlers['data'](Buffer.from('invalid json'));
    eventHandlers['close']();

    await expect(promise).rejects.toThrow('Failed to parse response from sysmodule');
  });

  it('should handle close without data', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    eventHandlers['close']();

    await expect(promise).rejects.toThrow('Connection closed without data');
  });

  it('should handle close with incomplete data (no result/error)', async () => {
    const promise = handleCaptureScreen('192.168.1.10');
    eventHandlers['data'](Buffer.from('{"jsonrpc": "2.0"}'));
    eventHandlers['close']();

    await expect(promise).rejects.toThrow('Incomplete or invalid response from sysmodule');
  });
});
