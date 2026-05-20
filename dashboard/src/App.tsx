import { useState, useEffect } from 'react'
import './App.css'

interface SwitchDevice {
  id: string;
  name: string;
  ip: string;
  gpuLoad: number;
  cpuClock: number;
  logs?: string;
}

const INITIAL_DEVICES: SwitchDevice[] = [
  { id: '1', name: 'Switch-01', ip: '127.0.0.1', gpuLoad: 0, cpuClock: 1020 },
  { id: '2', name: 'Switch-02', ip: '192.168.1.16', gpuLoad: 12, cpuClock: 768 },
  { id: '3', name: 'Switch-PRO', ip: '192.168.1.20', gpuLoad: 88, cpuClock: 1785 },
];

function App() {
  const [devices, setDevices] = useState<SwitchDevice[]>(INITIAL_DEVICES);
  const [lastLog, setLastLog] = useState<string>("");

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8081');

    socket.onopen = () => {
      console.log('Connected to Aura-NX Telemetry');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry') {
          setDevices(prevDevices => prevDevices.map(device => {
            // Update the device matching the IP from telemetry
            // Defaulting to device '1' if it's localhost for the demo
            if (device.ip === data.deviceIp || (data.deviceIp === '127.0.0.1' && device.id === '1')) {
              return {
                ...device,
                gpuLoad: data.gpuLoad,
                ip: data.deviceIp
              };
            }
            return device;
          }));
          
          if (data.logs) {
            setLastLog(prev => (prev + data.logs).slice(-2000));
          }
        }
      } catch (e) {
        console.error('Error parsing telemetry:', e);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    socket.onclose = () => {
      console.log('Disconnected from Aura-NX Telemetry');
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleCaptureScreen = (deviceName: string) => {
    console.log(`Calling MCP tool: capture_screen for ${deviceName}`);
    // Mocking the fetch call as per instructions
    fetch('/api/tools/capture_screen', {
      method: 'POST',
      body: JSON.stringify({ device: deviceName })
    }).catch(() => {
      console.log('Fetch mocked: capture_screen tool would be executed by MCP server');
    });
    alert(`Screen Capture initiated for ${deviceName} (MCP Tool: capture_screen)`);
  };

  return (
    <div className="aura-dashboard">
      <header>
        <h1>Aura Target Manager</h1>
      </header>
      
      <main>
        <div className="device-grid">
          {devices.map(device => (
            <div key={device.id} className="device-card">
              <h3>{device.name}</h3>
              <p><strong>IP:</strong> {device.ip}</p>
              <div className="metrics">
                <div className="metric">
                  <span>GPU Load:</span>
                  <div className="progress-bar">
                    <div className="progress" style={{ width: `${device.gpuLoad}%` }}></div>
                  </div>
                  <span>{device.gpuLoad}%</span>
                </div>
                <div className="metric">
                  <span>CPU Clock:</span>
                  <span>{device.cpuClock} MHz</span>
                </div>
              </div>
              <button className="capture-btn" onClick={() => handleCaptureScreen(device.name)}>
                Capture Screen
              </button>
            </div>
          ))}
        </div>

        <div className="log-viewer">
          <h3>Real-time Logs</h3>
          <pre>{lastLog || "Waiting for logs..."}</pre>
        </div>
      </main>

      <style>{`
        .aura-dashboard {
          padding: 2rem;
          font-family: system-ui, -apple-system, sans-serif;
          color: #eee;
          background: #121212;
          min-height: 100vh;
        }
        header h1 {
          border-bottom: 2px solid #333;
          padding-bottom: 1rem;
          margin-bottom: 2rem;
          color: #00d4ff;
        }
        .device-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .device-card {
          background: #1e1e1e;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #333;
          transition: transform 0.2s;
        }
        .device-card:hover {
          transform: translateY(-4px);
          border-color: #00d4ff;
        }
        .device-card h3 {
          margin-top: 0;
          color: #00d4ff;
        }
        .metrics {
          margin: 1.5rem 0;
        }
        .metric {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
        }
        .progress-bar {
          flex-grow: 1;
          height: 8px;
          background: #333;
          border-radius: 4px;
          margin: 0 1rem;
          overflow: hidden;
        }
        .progress {
          height: 100%;
          background: #00d4ff;
        }
        .capture-btn {
          width: 100%;
          padding: 0.75rem;
          background: #00d4ff;
          color: #000;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .capture-btn:hover {
          background: #008fb3;
        }
        .log-viewer {
          background: #000;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #333;
          margin-top: 2rem;
        }
        .log-viewer h3 {
          margin-top: 0;
          color: #00d4ff;
          font-size: 1rem;
        }
        .log-viewer pre {
          white-space: pre-wrap;
          word-break: break-all;
          font-family: monospace;
          font-size: 0.85rem;
          color: #0f0;
          max-height: 300px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  )
}

export default App
