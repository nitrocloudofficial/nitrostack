import React, { useState } from 'react';
import type { Machine } from '../types';
import { Activity, Shield, AlertOctagon } from 'lucide-react';

interface DefectExplainerProps {
  machine: Machine;
  onCheckInventory?: (partId: string) => void;
}

export const DefectExplainer: React.FC<DefectExplainerProps> = ({ machine }) => {
  const [activeTab, setActiveTab] = useState<'signature' | 'radar' | 'checklist'>('signature');

  // Custom checklist state per machine
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    loto: false,
    ppe: false,
    coolant: false,
    torque: false,
  });

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isFaulty = machine.status !== 'HEALTHY';

  // Defect signature data mappings based on machine types
  const getMachineDefectData = () => {
    if (machine.id === 'EQ101' || machine.id === 'MAC-CNC-101') {
      return {
        defectName: 'Spindle Bearing Inner-Race Micro-Pitting',
        description: 'Repetitive impact pulses caused by ceramic ball rollers traveling over a microscopic pit on the inner ring race.',
        harmonicFreq: 'Ball Pass Frequency Inner-Race (BPFI) at 240 Hz',
        evidenceText: 'Vibration spectrum displays high-energy sidebands around the 3rd shaft harmonic (300Hz), coupled with thermal saturation.',
        wearFactors: { friction: 85, thermal: 78, load: 40, power: 30, fatigue: 60 },
        partNumber: 'PART-BRG-77',
        checklistItems: [
          { key: 'loto', text: 'Engage Main Disconnect Switch 3 (3-Phase 480V) and apply padlocks.' },
          { key: 'ppe', text: 'Wear thermal cut-resistant gloves & impact-resistant face shield.' },
          { key: 'coolant', text: 'Confirm spindle oil chiller cooling loop bypass valve is closed.' },
          { key: 'torque', text: 'Calibrate hydraulic torque wrench to 120 Nm for spindle collar retightening.' },
        ]
      };
    } else if (machine.id === 'EQ103' || machine.id === 'MAC-ARM-202') {
      return {
        defectName: 'Robotic Servo Actuator Joint Backlash & Hydraulic Leakage',
        description: 'Thermal viscosity drop in ISO-VG-46 oil causing seal bypass leakage under peak payload movements.',
        harmonicFreq: 'Joint Backlash Oscillating Jitter at 15 Hz',
        evidenceText: 'Vibration sensors report irregular structural resonance during deceleration, accompanied by joint temperature spike.',
        wearFactors: { friction: 35, thermal: 92, load: 80, power: 75, fatigue: 50 },
        partNumber: 'PART-FLD-12',
        checklistItems: [
          { key: 'loto', text: 'Engage safety pins at Axis 2 joint to mechanically lockout robot arm fall.' },
          { key: 'ppe', text: 'Wear high-temperature apron & chemical safety goggles.' },
          { key: 'coolant', text: 'Depressurize joint hydraulic manifold accumulator.' },
          { key: 'torque', text: 'Inspect proportional flow valve mount bolts for seal pinch.' },
        ]
      };
    } else if (machine.id === 'EQ107' || machine.id === 'MAC-STP-404') {
      return {
        defectName: 'Proportional Hydraulic Relief Valve Seat Cavitation',
        description: 'Rapid hydraulic pressure drops leading to micro-implosions of air bubbles eroding the steel valve seat.',
        harmonicFreq: 'Pressure Pulsation Peak at 480 Hz',
        evidenceText: 'High-frequency acoustic noise emissions coupled with a line pressure drop below the nominal 150-bar threshold.',
        wearFactors: { friction: 45, thermal: 50, load: 95, power: 25, fatigue: 85 },
        partNumber: 'PART-VLV-99',
        checklistItems: [
          { key: 'loto', text: 'Isolate main hydraulic pump, lock out hydraulic valve lever, and vent main cylinder accumulator.' },
          { key: 'ppe', text: 'Wear high-pressure blast protection shield and fluid-resistant clothing.' },
          { key: 'coolant', text: 'Check hydraulic oil reservoir level and verify no bubble aeration.' },
          { key: 'torque', text: 'Torque replacement seat bolts to 240 Nm using cross-pattern sequence.' },
        ]
      };
    }

    // Default fallback (Healthy or generic)
    return {
      defectName: 'Nominal Mechanical Calibration',
      description: 'Standard baselines. Component shows standard rotational frequency profiles and minor thermal wear.',
      harmonicFreq: '1x Rotational Frequency at 50 Hz',
      evidenceText: 'Sensor readings indicate normal micro-fluctuations matching nominal factory baseline operation.',
      wearFactors: { friction: 12, thermal: 28, load: 15, power: 18, fatigue: 14 },
      partNumber: 'N/A',
      checklistItems: [
        { key: 'loto', text: 'Lockout/Tagout is not required for normal scheduled inspection.' },
        { key: 'ppe', text: 'Standard safety glasses and steel-toed boots.' },
        { key: 'coolant', text: 'Ensure automatic greaser cartridge is above 20% level.' },
        { key: 'torque', text: 'Verify mounting bracket bolts have visible torque seals intact.' },
      ]
    };
  };

  const defectData = getMachineDefectData();

  // Stress Radar SVG polygon calc
  const computeRadarPoints = () => {
    const center = 100;
    const r = 70;
    const { friction, thermal, load, power, fatigue } = defectData.wearFactors;

    // Five axes at angles: 0, 72, 144, 216, 288 degrees
    const angles = [
      (0 * Math.PI) / 180 - Math.PI / 2,
      (72 * Math.PI) / 180 - Math.PI / 2,
      (144 * Math.PI) / 180 - Math.PI / 2,
      (216 * Math.PI) / 180 - Math.PI / 2,
      (288 * Math.PI) / 180 - Math.PI / 2,
    ];

    const factors = [friction, thermal, load, power, fatigue];
    const points = angles.map((angle, i) => {
      const distance = (factors[i] / 100) * r;
      const x = center + distance * Math.cos(angle);
      const y = center + distance * Math.sin(angle);
      return `${x},${y}`;
    });

    return points.join(' ');
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>

      {/* Component Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
        <div>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: isFaulty ? 'var(--crimson)' : 'var(--emerald)',
            background: isFaulty ? 'var(--crimson-glow)' : 'var(--emerald-glow)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: '0.4rem'
          }}>
            {isFaulty ? 'Defect Diagnostics Active' : 'Baseline Healthy Mode'}
          </span>
          <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
            {defectData.defectName}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {defectData.description}
          </p>
        </div>

        {/* Tab Selectors */}
        <div style={{ display: 'flex', gap: '0.25rem', border: '1px solid var(--border-color)', padding: '0.2rem', borderRadius: '8px', background: '#f8fafc' }}>
          <button
            onClick={() => setActiveTab('signature')}
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: '0.72rem',
              border: 'none',
              background: activeTab === 'signature' ? '#ffffff' : 'transparent',
              color: activeTab === 'signature' ? 'var(--primary)' : 'var(--text-dim)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === 'signature' ? 600 : 400,
              boxShadow: activeTab === 'signature' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Defect Signature
          </button>

          <button
            onClick={() => setActiveTab('radar')}
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: '0.72rem',
              border: 'none',
              background: activeTab === 'radar' ? '#ffffff' : 'transparent',
              color: activeTab === 'radar' ? 'var(--primary)' : 'var(--text-dim)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === 'radar' ? 600 : 400,
              boxShadow: activeTab === 'radar' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Stress Radar
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: '0.72rem',
              border: 'none',
              background: activeTab === 'checklist' ? '#ffffff' : 'transparent',
              color: activeTab === 'checklist' ? 'var(--primary)' : 'var(--text-dim)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === 'checklist' ? 600 : 400,
              boxShadow: activeTab === 'checklist' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Lockout Checklist
          </button>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 0 1rem 0' }} />

      {/* Tab Contents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'center' }}>

        {/* Left Side: Dynamic Visualizations */}
        <div style={{ minHeight: '220px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>

          {activeTab === 'signature' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-main)' }}>
                  <Activity size={14} color="var(--primary)" />
                  Frequency Spectrum Analyzer (FFT Magnitude)
                </span>
                <span className="code-font" style={{ fontSize: '0.68rem', color: isFaulty ? 'var(--crimson)' : 'var(--text-dim)' }}>
                  Target: {defectData.harmonicFreq}
                </span>
              </div>

              {/* ROTATIONAL FREQUENCY CHART */}
              <div style={{ position: 'relative', width: '100%', height: '140px', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden', padding: '0.5rem 1rem' }}>

                {/* Horizontal gridlines */}
                <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, borderTop: '1px dashed #f1f5f9' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed #f1f5f9' }} />
                <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, borderTop: '1px dashed #f1f5f9' }} />

                {/* Healthy baseline line */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {/* Healthy Waveform (Smooth ripples) */}
                  <path d="M 0,110 Q 40,115 80,105 T 160,110 T 240,108 T 320,112 T 400,107 T 480,110"
                    fill="none" stroke="var(--emerald)" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

                  {/* Defect Waveform */}
                  {isFaulty ? (
                    <path d="M 0,110 Q 30,112 60,115 T 120,40 T 180,112 T 240,110 T 300,25 T 360,115 T 420,108 T 480,110"
                      fill="none" stroke="var(--crimson)" strokeWidth="2.2" />
                  ) : (
                    <path d="M 0,110 Q 40,110 80,105 T 160,107 T 240,110 T 320,108 T 400,110 T 480,105"
                      fill="none" stroke="var(--primary)" strokeWidth="2" />
                  )}

                  {/* Annotations */}
                  {isFaulty && (
                    <>
                      <circle cx="120" cy="40" r="4" fill="var(--crimson)" />
                      <circle cx="300" cy="25" r="4" fill="var(--crimson)" />

                      <text x="130" y="45" fill="var(--crimson)" fontSize="9" fontWeight="bold">BPFI Harmonic Peak (Friction Spike)</text>
                      <text x="310" y="30" fill="var(--crimson)" fontSize="9" fontWeight="bold">Structural Jitter Sidebands</text>
                    </>
                  )}
                </svg>

                {/* Y Axis Legend */}
                <div style={{ position: 'absolute', left: '0.4rem', top: '0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '80%', fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                  <span>5.0g RMS</span>
                  <span>2.5g RMS</span>
                  <span>0.0g RMS</span>
                </div>

                {/* X Axis Legend */}
                <div style={{ position: 'absolute', bottom: '0.3rem', left: '2rem', right: '2rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                  <span>0 Hz</span>
                  <span>150 Hz</span>
                  <span>300 Hz (Harmonics)</span>
                  <span>450 Hz</span>
                  <span>600 Hz</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div style={{ display: 'flex', gap: '1rem', width: '100%', height: '100%', alignItems: 'center', padding: '0 0.5rem' }}>

              {/* Radar Chart Drawing */}
              <svg width="200" height="200" style={{ background: '#ffffff', borderRadius: '50%', border: '1px solid var(--border-color)' }}>
                {/* Concentric grid rings */}
                <circle cx="100" cy="100" r="70" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                <circle cx="100" cy="100" r="50" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                <circle cx="100" cy="100" r="30" fill="none" stroke="#f1f5f9" strokeWidth="1" />

                {/* Axis lines */}
                {Array.from({ length: 5 }).map((_, idx) => {
                  const angle = (idx * 72 * Math.PI) / 180 - Math.PI / 2;
                  const x = 100 + 70 * Math.cos(angle);
                  const y = 100 + 70 * Math.sin(angle);
                  return <line key={idx} x1="100" y1="100" x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1.2" />;
                })}

                {/* Polygon Plot */}
                <polygon
                  points={computeRadarPoints()}
                  fill={isFaulty ? 'rgba(239, 68, 68, 0.25)' : 'rgba(14, 116, 144, 0.2)'}
                  stroke={isFaulty ? 'var(--crimson)' : 'var(--primary)'}
                  strokeWidth="2"
                />

                {/* Outer Labels */}
                {['Friction', 'Thermal', 'Load', 'Power', 'Fatigue'].map((label, idx) => {
                  const angle = (idx * 72 * Math.PI) / 180 - Math.PI / 2;
                  const x = 100 + 82 * Math.cos(angle);
                  const y = 100 + 82 * Math.sin(angle);

                  // Alignment shifts based on angle quadrant
                  const anchor = Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle';
                  const dy = Math.sin(angle) > 0.5 ? '0.6em' : Math.sin(angle) < -0.5 ? '-0.2em' : '0.2em';

                  return (
                    <text
                      key={idx}
                      x={x}
                      y={y}
                      textAnchor={anchor}
                      dy={dy}
                      fontSize="9"
                      fontWeight="600"
                      fill="var(--text-main)"
                    >
                      {label}
                    </text>
                  );
                })}
              </svg>

              {/* Stress Legend values */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>Component Stress Matrix</span>
                {Object.entries(defectData.wearFactors).map(([factor, val], i) => {
                  const colors = ['#0e7490', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981'];
                  return (
                    <div key={factor} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-dim)' }}>{factor}</span>
                        <span className="code-font" style={{ fontWeight: 700 }}>{val}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${val}%`, height: '100%', background: colors[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Interactive Maintenance Lockout Checklist</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {defectData.checklistItems.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggleCheck(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.6rem',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      background: checklist[item.key] ? '#ecfeff' : '#ffffff',
                      border: `1px solid ${checklist[item.key] ? 'var(--primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={() => { }}
                      style={{ marginTop: '0.15rem', accentColor: 'var(--primary)' }}
                    />
                    <span style={{
                      fontSize: '0.72rem',
                      color: checklist[item.key] ? 'var(--text-main)' : 'var(--text-muted)',
                      textDecoration: checklist[item.key] ? 'line-through' : 'none'
                    }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Evidence Matrix & Diagnosis Explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.8rem' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
              AI Diagnostic Reason & Evidence
            </span>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
              {defectData.evidenceText}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assigned Part:</span>
              <span className="code-font" style={{ fontWeight: 700, color: 'var(--primary)' }}>{defectData.partNumber}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Repair Complexity:</span>
              <span style={{ fontWeight: 600, color: isFaulty ? 'var(--crimson)' : 'var(--emerald)' }}>
                {isFaulty ? 'Medium (Requires LOTO)' : 'Low (Standard Calibration)'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.3rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Estimated Effort:</span>
              <span style={{ fontWeight: 600 }}>{isFaulty ? '45 minutes' : '10 minutes'}</span>
            </div>
          </div>

          {isFaulty && (
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', background: 'var(--primary-glow)', border: '1px solid rgba(14, 116, 144, 0.2)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.68rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
              <AlertOctagon size={13} />
              <span>Repair safety window: 60 min limit</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
