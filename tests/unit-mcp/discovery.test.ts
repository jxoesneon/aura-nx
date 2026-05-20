import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dgram from 'dgram';
import { startDiscoveryListener } from '../../mcp-server/src/discovery';

vi.mock('dgram');

describe('discovery', () => {
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = {
      on: vi.fn(),
      bind: vi.fn((port, cb) => cb && cb()),
      close: vi.fn(),
    };
    (dgram.createSocket as any).mockReturnValue(mockSocket);
  });

  it('should start a discovery listener and handle messages', () => {
    const onDiscover = vi.fn();
    startDiscoveryListener(onDiscover);

    expect(dgram.createSocket).toHaveBeenCalledWith('udp4');
    expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockSocket.bind).toHaveBeenCalledWith(12349, expect.any(Function));

    // Simulate a message
    const messageHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'message')[1];
    
    // Valid packet
    messageHandler(Buffer.from('AURA_ANNOUNCE'), { address: '192.168.1.10' });
    expect(onDiscover).toHaveBeenCalledWith('192.168.1.10');

    // Duplicate IP should be ignored
    onDiscover.mockClear();
    messageHandler(Buffer.from('AURA_ANNOUNCE'), { address: '192.168.1.10' });
    expect(onDiscover).not.toHaveBeenCalled();

    // Invalid packet
    messageHandler(Buffer.from('INVALID'), { address: '192.168.1.11' });
    expect(onDiscover).not.toHaveBeenCalled();
  });

  it('should handle socket errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    startDiscoveryListener(() => {});
    const errorHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'error')[1];
    
    errorHandler(new Error('Test error'));
    expect(consoleSpy).toHaveBeenCalledWith('[discovery] Socket error: Test error');
    consoleSpy.mockRestore();
  });
});
