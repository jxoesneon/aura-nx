import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as net from 'net';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { startCrashMonitor } from '../../mcp-server/src/crash_monitor';

vi.mock('net');
vi.mock('fs');
vi.mock('child_process');

describe('crash_monitor', () => {
  let mockServer: any;
  let serverConnectionHandler: Function;
  let mockSocket: any;
  let socketEventHandlers: { [key: string]: Function } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    socketEventHandlers = {};
    mockSocket = {
      on: vi.fn((event, handler) => {
        socketEventHandlers[event] = handler;
        return mockSocket;
      }),
    };
    mockServer = {
      listen: vi.fn((port, cb) => cb && cb()),
      on: vi.fn(),
    };
    (net.createServer as any).mockImplementation((cb: Function) => {
      serverConnectionHandler = cb;
      return mockServer;
    });
    (fs.existsSync as any).mockReturnValue(false);
  });

  it('should start crash monitor and handle crash reports', async () => {
    startCrashMonitor();

    expect(net.createServer).toHaveBeenCalled();
    expect(mockServer.listen).toHaveBeenCalledWith(12350, expect.any(Function));

    // Simulate device connection
    serverConnectionHandler(mockSocket);

    // Simulate data receiving
    socketEventHandlers['data'](Buffer.from('crash content'));
    
    // Simulate end of transmission
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await socketEventHandlers['end']();

    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('crash_'), Buffer.from('crash content'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Symbolication Report:'));
    
    consoleSpy.mockRestore();
  });

  it('should handle socket errors', () => {
    startCrashMonitor();
    serverConnectionHandler(mockSocket);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    socketEventHandlers['error'](new Error('Socket fail'));
    expect(consoleSpy).toHaveBeenCalledWith('[crash-monitor] Socket error:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should symbolicate using addr2line if ELF exists', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (child_process.execFile as any).mockImplementation((file: any, args: any, cb: any) => {
      cb(null, 'ResolvedSymbol', '');
    });

    startCrashMonitor();
    serverConnectionHandler(mockSocket);
    socketEventHandlers['data'](Buffer.from('data'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await socketEventHandlers['end']();

    expect(child_process.execFile).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Resolved 0x7100012345: ResolvedSymbol'));
    
    consoleSpy.mockRestore();
  });

  it('should handle addr2line errors', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (child_process.execFile as any).mockImplementation((file: any, args: any, cb: any) => {
      cb(new Error('addr2line failed'), '', '');
    });

    startCrashMonitor();
    serverConnectionHandler(mockSocket);
    socketEventHandlers['data'](Buffer.from('data'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await socketEventHandlers['end']();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('addr2line error: addr2line failed'));
    
    consoleSpy.mockRestore();
  });

  it('should handle addr2line stderr', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (child_process.execFile as any).mockImplementation((file: any, args: any, cb: any) => {
      cb(null, '', 'some error in stderr');
    });

    startCrashMonitor();
    serverConnectionHandler(mockSocket);
    socketEventHandlers['data'](Buffer.from('data'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await socketEventHandlers['end']();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('addr2line stderr: some error in stderr'));
    
    consoleSpy.mockRestore();
  });
});
