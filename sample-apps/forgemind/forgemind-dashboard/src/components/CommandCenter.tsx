import React, { useState, useEffect } from 'react';
import type { Machine, AnomalyFinding } from '../types';
import { Activity, Gauge, Flame, Zap, Clock, ShieldCheck, AlertTriangle, ChevronRight, User, Wrench, BarChart2 } from 'lucide-react';
import { MachineSchematic } from './MachineSchematic';
import { DefectExplainer } from './DefectExplainer';

interface CommandCenterProps {
  machines: Machine[];
  selectedMachine: Machine;
  setSelectedMachine: (m: Machine) => void;
  anomalies: AnomalyFinding[];
  onTriggerInvestigation: (machineId: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  machines,
  selectedMachine,
  setSelectedMachine,
  anomalies,
  onTriggerInvestigation,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'vibration' | 'temperature' | 'power'>('vibration');
  const [telemetryHistory, setTelemetryHistory] = useState<Array<{ time: string; val: number }>>([]);
  const [windowTimer, setWindowTimer] = useState<number>(45);

  // Live telemetry pulse animation & 45s window timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setWindowTimer((prev) => (prev > 1 ? prev - 1 : 45));

      // Generate sparkline values for selected machine
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
      let currentVal = selectedMachine.telemetry.vibration;
      if (selectedMetric === 'temperature') currentVal = selectedMachine.telemetry.temperature;
      if (selectedMetric === 'power') currentVal = selectedMachine.telemetry.powerConsumption;

      // Add slight micro fluctuation for live realism
      const variance = (Math.random() - 0.5) * (currentVal * 0.05);
      const val = Number((currentVal + variance).toFixed(2));

      setTelemetryHistory((prev) => [...prev.slice(-14), { time: now, val }]);
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedMachine, selectedMetric]);

  const getStatusColor = (status: Machine['status']) => {
    if (status === 'CRITICAL') return 'var(--crimson)';
    if (status === 'WARNING') return 'var(--amber)';
    return 'var(--emerald)';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', padding: '1.25rem' }}>
      
      {/* Main Left Column: Machine Radar & Telemetry Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Machine Radar Header & Grid */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Gauge size={18} color="var(--primary)" />
                Machine Radar Overview
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Real-time telemetry stream across 3 active production lines
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter Line:</span>
              <select style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.78rem'
              }}>
                <option value="all">All Lines ({machines.length} Machines)</option>
                <option value="line1">Line 1 — Precision Machining</option>
                <option value="line2">Line 2 — Polymer Fabrication</option>
                <option value="line3">Line 3 — Logistics & Packaging</option>
              </select>
            </div>
          </div>

          {/* Machine Tiles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {machines.map((m) => {
              const isSelected = selectedMachine.id === m.id;
              const isCritical = m.status === 'CRITICAL';
              const isWarning = m.status === 'WARNING';

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMachine(m)}
                  className={`glass-panel ${isCritical ? 'glass-panel-critical' : isWarning ? 'glass-panel-warning' : isSelected ? 'glass-panel-glow' : ''}`}
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--primary-light)' : undefined,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Status Indicator Stripe */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: getStatusColor(m.status),
                    boxShadow: `0 0 10px ${getStatusColor(m.status)}`
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <div>
                      <span className="code-font" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{m.id}</span>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{m.name}</h3>
                    </div>
                    <span className={`status-pill ${m.status.toLowerCase()}`}>
                      <span className={`live-dot ${m.status.toLowerCase()}`} />
                      {m.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.line}
                  </p>

                  {/* Telemetry Metrics Mini Table */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Activity size={10} /> Vib:
                      </span>
                      <span className="code-font" style={{ fontWeight: 700, color: m.telemetry.vibration > 4 ? 'var(--crimson)' : 'var(--text-main)' }}>
                        {m.telemetry.vibration.toFixed(1)} mm/s
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Flame size={10} /> Temp:
                      </span>
                      <span className="code-font" style={{ fontWeight: 700, color: m.telemetry.temperature > 80 ? 'var(--amber)' : 'var(--text-main)' }}>
                        {m.telemetry.temperature}°C
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Zap size={10} /> Power:
                      </span>
                      <span className="code-font" style={{ fontWeight: 700 }}>
                        {m.telemetry.powerConsumption.toFixed(1)} kW
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <ShieldCheck size={10} /> Health:
                      </span>
                      <span className="code-font" style={{ fontWeight: 700, color: m.healthScore < 80 ? 'var(--crimson)' : 'var(--emerald)' }}>
                        {m.healthScore}%
                      </span>
                    </div>
                  </div>

                  {m.status !== 'HEALTHY' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerInvestigation(m.id);
                      }}
                      className="btn-danger"
                      style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', padding: '0.4rem', fontSize: '0.75rem' }}
                    >
                      <AlertTriangle size={12} /> Investigate AI Finding
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Isometric Blueprint Visualizer (Wow Factor) */}
        <MachineSchematic
          machine={selectedMachine}
          onFixComponent={() => onTriggerInvestigation(selectedMachine.id)}
        />

        {/* Dynamic Defect Explainer & Diagnostics Assistant */}
        <DefectExplainer
          machine={selectedMachine}
        />

        {/* Live Telemetry Sparkline & Graph Monitor */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BarChart2 size={16} color="var(--primary)" />
                Telemetry Stream — {selectedMachine.name} ({selectedMachine.id})
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                High-frequency metric sampling (1 Hz) with threshold boundary checking
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className={`btn-outline ${selectedMetric === 'vibration' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('vibration')}
                style={{
                  padding: '0.3rem 0.7rem',
                  fontSize: '0.75rem',
                  borderColor: selectedMetric === 'vibration' ? 'var(--primary)' : undefined,
                  color: selectedMetric === 'vibration' ? 'var(--primary)' : undefined
                }}
              >
                Vibration (mm/s)
              </button>

              <button
                className={`btn-outline ${selectedMetric === 'temperature' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('temperature')}
                style={{
                  padding: '0.3rem 0.7rem',
                  fontSize: '0.75rem',
                  borderColor: selectedMetric === 'temperature' ? 'var(--amber)' : undefined,
                  color: selectedMetric === 'temperature' ? 'var(--amber)' : undefined
                }}
              >
                Temperature (°C)
              </button>

              <button
                className={`btn-outline ${selectedMetric === 'power' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('power')}
                style={{
                  padding: '0.3rem 0.7rem',
                  fontSize: '0.75rem',
                  borderColor: selectedMetric === 'power' ? 'var(--purple)' : undefined,
                  color: selectedMetric === 'power' ? 'var(--purple)' : undefined
                }}
              >
                Power Draw (kW)
              </button>
            </div>
          </div>

          {/* Visual Waveform Bar Chart */}
          <div style={{
            background: '#ffffff',
            padding: '1.25rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            height: '180px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.5rem',
            position: 'relative'
          }}>
            {/* Threshold Line */}
            <div style={{
              position: 'absolute',
              top: '30%',
              left: '1rem',
              right: '1rem',
              borderTop: '1px dashed var(--crimson)',
              zIndex: 1,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <span className="code-font" style={{ fontSize: '0.65rem', color: 'var(--crimson)', background: '#ffffff', padding: '0 0.5rem', marginTop: '-0.6rem' }}>
                Anomaly Threshold Limit
              </span>
            </div>

            {telemetryHistory.map((item, idx) => {
              const maxScale = selectedMetric === 'vibration' ? 10 : selectedMetric === 'temperature' ? 120 : 60;
              const heightPercent = Math.min(100, Math.max(10, (item.val / maxScale) * 100));
              const isBreach = (selectedMetric === 'vibration' && item.val > 4.5) || (selectedMetric === 'temperature' && item.val > 80);

              // Use clean peacock blue variants
              const normalBarColor = selectedMetric === 'vibration' ? 'var(--primary)' : selectedMetric === 'temperature' ? '#0891b2' : '#0ea5e9';

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', zIndex: 2 }}>
                  <span className="code-font" style={{ fontSize: '0.62rem', color: isBreach ? 'var(--crimson)' : 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    {item.val}
                  </span>
                  <div style={{
                    width: '100%',
                    height: `${heightPercent}%`,
                    backgroundColor: isBreach ? 'var(--crimson)' : normalBarColor,
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                    boxShadow: isBreach ? '0 2px 8px rgba(239, 68, 68, 0.4)' : 'none'
                  }} />
                  <span className="code-font" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                    {item.time.split(':')[2]}s
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Column: ForgeMind 45s Correlation Timeline & Machine Inspector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* 45-Second Correlation Window Widget */}
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} color="var(--primary)" />
              ForgeMind 45s Window Filter
            </h3>
            <span className="code-font" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
              {windowTimer}s remaining
            </span>
          </div>

          {/* Progress bar for 45s windowing */}
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.8rem' }}>
            <div style={{
              height: '100%',
              width: `${(windowTimer / 45) * 100}%`,
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--purple) 100%)',
              transition: 'width 1s linear'
            }} />
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Groups sensor findings into 45-second correlation blocks before passing findings to NitroStack MCP RAG agents.
          </p>
        </div>

        {/* Live Anomaly Findings Feed */}
        <div className="glass-panel" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={15} color="var(--amber)" />
            Active Anomaly Findings Stream
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '280px', paddingRight: '0.2rem' }}>
            {anomalies.length === 0 ? (
              <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', padding: '2rem 0' }}>
                All systems operating within baseline parameters
              </div>
            ) : (
              anomalies.map((anom) => (
                <div
                  key={anom.id}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderLeft: `3px solid ${anom.severity === 'CRITICAL' ? 'var(--crimson)' : 'var(--amber)'}`,
                    padding: '0.6rem 0.8rem',
                    borderRadius: '0 6px 6px 0',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span className="code-font" style={{ fontWeight: 700, color: 'var(--text-main)' }}>{anom.machineName}</span>
                    <span className="code-font" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{anom.timestamp}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{anom.message}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="code-font" style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>
                      {anom.correlationWindow}
                    </span>
                    <button
                      onClick={() => onTriggerInvestigation(anom.machineId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      Investigate <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Machine Inspector Panel */}
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wrench size={15} color="var(--primary)" />
            Machine Specs — {selectedMachine.name}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Machine ID:</span>
              <span className="code-font">{selectedMachine.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Machine Type:</span>
              <span>{selectedMachine.type}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Production Line:</span>
              <span>{selectedMachine.line}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Maintenance:</span>
              <span>{selectedMachine.lastMaintenance}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assigned Specialist:</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <User size={12} /> {selectedMachine.assignedTechnician || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
