import React from 'react';

interface StackFrame {
  function: string;
  file: string;
  line: number;
}

interface AuraTraceProps {
  pc: string;
  stack: StackFrame[];
  registers: { [key: string]: string };
}

const AuraTrace: React.FC<AuraTraceProps> = ({ pc, stack, registers }) => {
  return (
    <div className="aura-trace">
      <div className="trace-header">
        <h2>Aura-Trace GDB Visualizer</h2>
        <div className="pc-badge">PC: {pc}</div>
      </div>

      <div className="trace-content">
        <div className="stack-trace">
          <h3>Stack Trace</h3>
          <div className="frame-list">
            {stack.map((frame, index) => (
              <div key={index} className="stack-frame">
                <span className="frame-index">#{index}</span>
                <span className="frame-func">{frame.function}</span>
                <span className="frame-loc">
                  {frame.file}:{frame.line}
                </span>
              </div>
            ))}
            {stack.length === 0 && <p>No stack information available</p>}
          </div>
        </div>

        <div className="registers-view">
          <h3>Registers</h3>
          <div className="register-grid">
            {Object.entries(registers).map(([reg, val]) => (
              <div key={reg} className="register-item">
                <span className="reg-name">{reg}</span>
                <span className="reg-val">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .aura-trace {
          background: #1e1e1e;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #333;
          margin-top: 2rem;
          font-family: monospace;
        }
        .trace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #333;
          padding-bottom: 1rem;
        }
        .trace-header h2 {
          margin: 0;
          color: #ff0055;
          font-size: 1.25rem;
        }
        .pc-badge {
          background: #ff0055;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-weight: bold;
        }
        .trace-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .stack-trace h3, .registers-view h3 {
          margin-top: 0;
          color: #00d4ff;
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .frame-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .stack-frame {
          display: flex;
          gap: 1rem;
          padding: 0.5rem;
          background: #2a2a2a;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .frame-index {
          color: #888;
          min-width: 2rem;
        }
        .frame-func {
          color: #0f0;
          font-weight: bold;
        }
        .frame-loc {
          color: #aaa;
        }
        .register-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.5rem;
        }
        .register-item {
          display: flex;
          justify-content: space-between;
          background: #000;
          padding: 0.4rem 0.6rem;
          border-radius: 4px;
          font-size: 0.8rem;
          border-left: 2px solid #ff0055;
        }
        .reg-name {
          color: #ff0055;
          font-weight: bold;
        }
        .reg-val {
          color: #eee;
        }
      `}</style>
    </div>
  );
};

export default AuraTrace;
