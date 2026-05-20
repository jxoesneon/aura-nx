import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as net from 'net';
import { backupSave, restoreSave } from '../../mcp-server/src/save_manager';

vi.mock('net');

describe('save_manager', () => {
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

  describe('backupSave', () => {
    it('should handle successful backup', async () => {
      const promise = backupSave('192.168.1.10', 'test_save');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"method":"backup_save"'));
      expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"name":"test_save"'));

      eventHandlers['data'](Buffer.from(JSON.stringify({ result: { status: 'success' } })));
      const result = await promise;
      expect(result).toBe('success');
    });

    it('should use default message if status is missing', async () => {
        const promise = backupSave('192.168.1.10', 'test_save');
        await new Promise(resolve => setTimeout(resolve, 10));
        eventHandlers['data'](Buffer.from(JSON.stringify({ result: {} })));
        const result = await promise;
        expect(result).toBe('Backup initiated successfully');
    });

    it('should handle JSON-RPC error', async () => {
      const promise = backupSave('192.168.1.10', 'test_save');
      await new Promise(resolve => setTimeout(resolve, 10));
      eventHandlers['data'](Buffer.from(JSON.stringify({ error: { message: 'Failed' } })));
      await expect(promise).rejects.toThrow('Failed');
    });

    it('should handle JSON-RPC error without message', async () => {
        const promise = backupSave('192.168.1.10', 'test_save');
        await new Promise(resolve => setTimeout(resolve, 10));
        eventHandlers['data'](Buffer.from(JSON.stringify({ error: {} })));
        await expect(promise).rejects.toThrow('Backup failed');
    });

    it('should handle timeout', async () => {
      const promise = backupSave('192.168.1.10', 'test_save');
      eventHandlers['timeout']();
      await expect(promise).rejects.toThrow('Backup request timed out');
    });

    it('should handle connection error', async () => {
      const promise = backupSave('192.168.1.10', 'test_save');
      eventHandlers['error'](new Error('Conn fail'));
      await expect(promise).rejects.toThrow('Backup connection error: Conn fail');
    });
    
    it('should wait for complete JSON', async () => {
        const promise = backupSave('192.168.1.10', 'test_save');
        await new Promise(resolve => setTimeout(resolve, 10));
        eventHandlers['data'](Buffer.from('{"res'));
        eventHandlers['data'](Buffer.from('ult": {"status": "ok"}}'));
        const result = await promise;
        expect(result).toBe('ok');
    });
  });

  describe('restoreSave', () => {
    it('should handle successful restore', async () => {
      const promise = restoreSave('192.168.1.10', 'test_save');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"method":"restore_save"'));
      
      eventHandlers['data'](Buffer.from(JSON.stringify({ result: { status: 'restored' } })));
      const result = await promise;
      expect(result).toBe('restored');
    });

    it('should use default message if status is missing', async () => {
        const promise = restoreSave('192.168.1.10', 'test_save');
        await new Promise(resolve => setTimeout(resolve, 10));
        eventHandlers['data'](Buffer.from(JSON.stringify({ result: {} })));
        const result = await promise;
        expect(result).toBe('Restore initiated successfully');
    });

    it('should handle JSON-RPC error', async () => {
      const promise = restoreSave('192.168.1.10', 'test_save');
      await new Promise(resolve => setTimeout(resolve, 10));
      eventHandlers['data'](Buffer.from(JSON.stringify({ error: { message: 'Failed' } })));
      await expect(promise).rejects.toThrow('Failed');
    });

    it('should handle JSON-RPC error without message', async () => {
        const promise = restoreSave('192.168.1.10', 'test_save');
        await new Promise(resolve => setTimeout(resolve, 10));
        eventHandlers['data'](Buffer.from(JSON.stringify({ error: {} })));
        await expect(promise).rejects.toThrow('Restore failed');
    });

    it('should handle timeout', async () => {
      const promise = restoreSave('192.168.1.10', 'test_save');
      eventHandlers['timeout']();
      await expect(promise).rejects.toThrow('Restore request timed out');
    });

    it('should handle connection error', async () => {
      const promise = restoreSave('192.168.1.10', 'test_save');
      eventHandlers['error'](new Error('Conn fail'));
      await expect(promise).rejects.toThrow('Restore connection error: Conn fail');
    });
  });
});
