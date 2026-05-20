import { useState } from 'react'
import './App.css'

interface SwitchDevice {
  id: string;
  name: string;
  ip: string;
  gpuLoad: number;
  cpuClock: number;
}

const MOCKED_DEVICES: SwitchDevice[] = [
  { id: '1', name: 'Switch-01', ip: '192.168.1.15', gpuLoad: 45, cpuClock: 1020 },
  { id: '2', name: 'Switch-02', ip: '192.168.1.16', gpuLoad: 12, cpuClock: 768 },
  { id: '3', name: 'Switch-PRO', ip: '192.168.1.20', gpuLoad: 88, cpuClock: 1785 },
];

function App() {
  const [devices] = useState<SwitchDevice[]>(MOCKED_DEVICES);

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
              <button className="capture-btn" onClick={() => alert('Screen Capture initiated for ' + device.name)}>
                Capture Screen
              </button>
            </div>
          ))}
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
      `}</style>
    </div>
  )
}

export default App
