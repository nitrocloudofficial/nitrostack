import React, { useState } from 'react';
import type { FaultScenario, Machine } from '../types';
import { Terminal, PlayCircle, Zap, Server, Settings, RefreshCw, Send } from 'lucide-react';

interface DemoLabProps {
  scenarios: FaultScenario[];
  machines: Machine[];
  onTriggerScenario: (scenarioId: string) => void;
  onCustomInject: (machineId: string, sensor: string, value: number) => void;
  isBackendLive: boolean;
  setIsBackendLive: (live: boolean) => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  wsUrl: string;
  setWsUrl: (url: string) => void;
  logStream: string[];
}

export const DemoLab: React.FC<DemoLabProps> = ({
  scenarios,
  machines,
  onTriggerScenario,
  onCustomInject,
  isBackendLive,
  setIsBackendLive,
  backendUrl,
  setBackendUrl,
  wsUrl,
  setWsUrl,
  logStream,
}) => {
  const [customMachineId, setCustomMachineId] = useState<string>(machines[0]?.id || 'MAC-CNC-101');
  const [customSensor, setCustomSensor] = useState<string>('vibration');
  const [customValue, setCustomValue] = useState<number>(9.5);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionMessage(null);

    try {
      // Attempt quick ping to configured backend URL
      const response = await fetch(`${backendUrl}/health`, { method: 'GET' }).catch(() => null);
      if (response && response.ok) {
        setIsBackendLive(true);
        setConnectionMessage('✅ NitroStack MCP Gateway Online & Connected!');
      } else {
        setIsBackendLive(false);
        setConnectionMessage('⚠️ Backend offline or unreachable. Switched to Standalone Mock Engine mode.');
      }
    } catch {
      setIsBackendLive(false);
      setConnectionMessage('⚠️ Connection refused. Running in offline standalone demonstration mode.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.25rem', padding: '1.25rem' }}>
      
      {/* Left Column: Preset Scenario Launchers & Custom Fault Injector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Preset Fault Scenarios (Live Demo Core) */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlayCircle size={18} color="var(--primary)" />
                Fault Injection Demo Scenarios
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ForgeMind HTTP fault-injection pattern wired to NitroStack MCP tool orchestration
              </p>
            </div>

            <span className="badge-nitro">3 Pre-configured Scenarios</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {scenarios.map((s) => (
              <div
                key={s.id}
                style={{
                  background: s.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                  border: `1px solid ${s.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{s.title}</h3>
                    <span className={`status-pill ${s.severity.toLowerCase()}`}>
                      {s.severity}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    {s.description}
                  </p>

                  <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.72rem' }}>
                    <span className="code-font" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      Target: {s.machineId}
                    </span>
                    <span className="code-font" style={{ color: 'var(--text-muted)' }}>
                      Vib: <strong style={{ color: 'var(--text-main)' }}>{s.simulatedMetrics.vibration} mm/s</strong> | Temp: <strong style={{ color: 'var(--text-main)' }}>{s.simulatedMetrics.temperature}°C</strong>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onTriggerScenario(s.id)}
                  className="btn-danger"
                  style={{ padding: '0.6rem 1.1rem', fontSize: '0.8rem', minWidth: '140px', justifyContent: 'center' }}
                >
                  <Zap size={14} /> Inject Fault
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Anomaly Injector Form */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
            <Settings size={16} color="var(--primary)" />
            Custom Fault Injection Sandbox
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.8rem', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Select Machine:
              </label>
              <select
                value={customMachineId}
                onChange={(e) => setCustomMachineId(e.target.value)}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Target Telemetry Metric:
              </label>
              <select
                value={customSensor}
                onChange={(e) => setCustomSensor(e.target.value)}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="vibration">Vibration (mm/s)</option>
                <option value="temperature">Temperature (°C)</option>
                <option value="power">Power Draw (kW)</option>
                <option value="hydraulicPressure">Hydraulic Pressure (bar)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Breach Threshold Value:
              </label>
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(Number(e.target.value))}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>

            <button
              onClick={() => onCustomInject(customMachineId, customSensor, customValue)}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <Send size={14} /> Send Anomaly
            </button>
          </div>
        </div>

      </div>

      {/* Right Column: Backend Gateway Manager & Live Execution Log Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Connection Manager Box */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Server size={15} color="var(--purple)" />
            NitroStack MCP Server Gateway Config
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.8rem', fontSize: '0.78rem' }}>
            <div>
              <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>REST Base URL:</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="code-font"
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.6rem', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>WebSocket Bus URL:</label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                className="code-font"
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.6rem', borderRadius: '6px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="btn-outline"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} className={isTestingConnection ? 'spin' : ''} />
              Test Gateway Connection
            </button>
          </div>

          {connectionMessage && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: isBackendLive ? 'var(--emerald)' : 'var(--amber)', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px' }}>
              {connectionMessage}
            </div>
          )}
        </div>

        {/* Live Execution Terminal Log */}
        <div className="glass-panel" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={15} color="var(--primary)" />
              NitroStack MCP Gateway Log Stream
            </h3>
            <span className="code-font" style={{ fontSize: '0.68rem', color: 'var(--emerald)' }}>1 Hz Live</span>
          </div>

          <div style={{
            background: '#04070c',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.8rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: '#a3e635',
            flex: 1,
            maxHeight: '300px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            {logStream.map((log, idx) => (
              <div key={idx} style={{ wordBreak: 'break-all' }}>
                <span style={{ color: 'var(--text-dim)' }}>[{new Date().toLocaleTimeString()}]</span> {log}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
