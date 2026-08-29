import React, { useState } from 'react';
import type { Machine } from '../types';
import { AlertCircle, ShieldAlert, Cpu, Activity, Thermometer, Wrench } from 'lucide-react';

interface MachineSchematicProps {
  machine: Machine;
  onFixComponent?: () => void;
}

export const MachineSchematic: React.FC<MachineSchematicProps> = ({
  machine,
  onFixComponent,
}) => {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'shell' | 'internal' | 'sensors'>('internal');

  const getMachineTitle = () => {
    switch (machine.id) {
      case 'MAC-CNC-101':
      case 'EQ101':
        return '5-Axis Spindle Assembly (Digital Twin)';
      case 'MAC-ARM-202':
      case 'EQ103':
        return '6-Axis Articulated Actuator (Digital Twin)';
      case 'MAC-INJ-303':
        return 'Injection Press Clamping Cylinder (Digital Twin)';
      case 'MAC-STP-404':
      case 'EQ107':
        return '800-Ton Hydraulic Relief Block (Digital Twin)';
      case 'MAC-CNV-505':
        return 'Modular Conveyor Roller Assembly (Digital Twin)';
      default:
        return 'Machine Blueprint Overview';
    }
  };

  // Render the technical blueprints with dynamic layer opacities
  const renderSVGBlueprint = () => {
    const isFaulty = machine.status !== 'HEALTHY';

    // Opacity presets based on active CAD layer
    const shellOpacity = activeLayer === 'shell' ? 1.0 : activeLayer === 'internal' ? 0.25 : 0.05;
    const internalOpacity = activeLayer === 'shell' ? 0.15 : activeLayer === 'sensors' ? 0.25 : 1.0;
    const sensorOpacity = activeLayer === 'shell' ? 0.15 : 1.0;

    switch (machine.id) {
      case 'MAC-CNC-101':
      case 'EQ101': // CNC Mill
        return (
          <svg viewBox="0 0 600 320" style={{ width: '100%', height: '100%', fill: 'none', stroke: '#475569' }}>
            {/* Tech grid background */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="600" height="320" fill="url(#grid)" stroke="none" />

            {/* Enclosure Frame (Isometric) */}
            <g style={{ opacity: shellOpacity, transition: 'all 0.3s ease' }}>
              <path d="M 50 250 L 250 290 L 550 210 L 350 170 Z" stroke="#e2e8f0" strokeWidth="1.5" />
              <path d="M 50 250 L 50 100 L 350 20 L 350 170" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M 250 290 L 250 140 L 550 60 L 550 210" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M 350 20 L 550 60" stroke="#cbd5e1" strokeWidth="1.5" />
            </g>

            {/* Spindle Column Housing */}
            <rect x="250" y="80" width="80" height="150" rx="4" stroke="#94a3b8" strokeWidth="2" fill="#ffffff" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <line x1="250" y1="120" x2="330" y2="120" stroke="#cbd5e1" strokeWidth="1" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <line x1="250" y1="170" x2="330" y2="170" stroke="#cbd5e1" strokeWidth="1" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />

            {/* Spindle Motor - Core (Accent Color) */}
            <path d="M 265 100 L 315 100 L 315 130 L 265 130 Z" 
              fill={hoveredPart === 'motor' ? 'var(--primary-light)' : '#f8fafc'} 
              stroke="var(--primary)" 
              strokeWidth="2"
              onMouseEnter={() => setHoveredPart('motor')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('motor')}
              style={{ cursor: 'pointer', opacity: internalOpacity, transition: 'all 0.3s ease' }}
            />
            <text x="290" y="118" textAnchor="middle" fill="var(--primary)" fontSize="8" fontWeight="bold" fontFamily="var(--font-sans)" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }}>MOTOR</text>

            {/* Ceramic Spindle Bearings (Critical Fault Area) */}
            {/* Upper Bearing */}
            <ellipse cx="290" cy="150" rx="20" ry="8" 
              fill={isFaulty ? 'rgba(239, 68, 68, 0.1)' : hoveredPart === 'bearings' ? 'var(--primary-light)' : '#ffffff'} 
              stroke={isFaulty ? 'var(--crimson)' : 'var(--primary)'} 
              strokeWidth={isFaulty ? '3' : '2'}
              onMouseEnter={() => setHoveredPart('bearings')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('bearings')}
              style={{ cursor: 'pointer', opacity: internalOpacity, transition: 'all 0.3s ease' }}
              className={isFaulty ? 'component-hotspot active' : 'component-hotspot'}
            />
            {/* Lower Bearing */}
            <ellipse cx="290" cy="180" rx="20" ry="8" 
              fill={isFaulty ? 'rgba(239, 68, 68, 0.15)' : hoveredPart === 'bearings' ? 'var(--primary-light)' : '#ffffff'} 
              stroke={isFaulty ? 'var(--crimson)' : 'var(--primary)'} 
              strokeWidth={isFaulty ? '3' : '2'}
              onMouseEnter={() => setHoveredPart('bearings')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('bearings')}
              style={{ cursor: 'pointer', opacity: internalOpacity, transition: 'all 0.3s ease' }}
              className={isFaulty ? 'component-hotspot active' : 'component-hotspot'}
            />

            {/* Spindle Chuck/Tool Holder & Drill Tool Bit with spinning/wobbling animations */}
            <g style={{
              transformOrigin: '290px 200px',
              animation: isFaulty ? 'wobble 0.12s linear infinite' : 'rotation 0.6s linear infinite',
              opacity: internalOpacity,
              transition: 'all 0.3s ease'
            }}>
              <path d="M 280 200 L 300 200 L 295 230 L 285 230 Z" fill="#64748b" stroke="#475569" strokeWidth="1.5" />
              <path d="M 288 230 L 292 230 L 290 260 Z" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
            </g>

            {/* Vibration Sensor Hotspot */}
            <rect x="315" y="168" width="12" height="12" rx="2" 
              fill={hoveredPart === 'sensor' ? 'var(--primary-light)' : '#ffffff'} 
              stroke="var(--primary)" 
              strokeWidth="1.5"
              onMouseEnter={() => setHoveredPart('sensor')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('sensor')}
              style={{ cursor: 'pointer', opacity: sensorOpacity, transition: 'all 0.3s ease' }}
            />
            <line x1="310" y1="174" x2="315" y2="174" stroke="var(--primary)" strokeWidth="1" strokeDasharray="1 1" style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }} />
            <text x="332" y="177" fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-sans)" style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }}>VIB-SENS</text>

            {/* Fault Callouts */}
            {isFaulty && (
              <g style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }}>
                {/* Visual ripple pulse on bearing */}
                <ellipse cx="290" cy="180" rx="35" ry="14" stroke="var(--crimson)" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
                <path d="M 290 180 L 160 140" stroke="var(--crimson)" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="160" cy="140" r="4" fill="var(--crimson)" />
                
                {/* Fault Label Tag */}
                <foreignObject x="10" y="80" width="170" height="90">
                  <div style={{ background: '#ffffff', border: '1px solid var(--crimson)', borderRadius: '8px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.1)', fontSize: '0.72rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--crimson)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.2rem' }}>
                      <ShieldAlert size={12} /> SPINDLE HOTSPOT
                    </div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.68rem', lineHeight: '1.2' }}>
                      Ceramic Bearing wear detected. Friction spike: <strong>{machine.telemetry.vibration} mm/s</strong>. Temp: <strong>{machine.telemetry.temperature}°C</strong>.
                    </div>
                  </div>
                </foreignObject>
              </g>
            )}

            {/* General Labels */}
            <text x="290" y="70" textAnchor="middle" fill="var(--text-dim)" fontSize="10" fontWeight="bold">CNC SPINDLE ENCLOSURE (ALPHA)</text>
          </svg>
        );

      case 'MAC-ARM-202':
      case 'EQ103': // Robotic Arm
        return (
          <svg viewBox="0 0 600 320" style={{ width: '100%', height: '100%', fill: 'none', stroke: '#475569' }}>
            <rect width="600" height="320" fill="url(#grid)" stroke="none" />

            {/* Robotic Arm Base */}
            <path d="M 240 260 L 360 260 L 340 290 L 260 290 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <circle cx="300" cy="260" r="25" fill="#f8fafc" stroke="#475569" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />

            {/* Segment 1: Lower Joint Link */}
            <path d="M 290 260 L 240 160 L 260 150 L 310 250 Z" 
              fill={hoveredPart === 'arm1' ? 'var(--primary-light)' : '#ffffff'} 
              stroke="var(--primary)" 
              strokeWidth="2"
              onMouseEnter={() => setHoveredPart('arm1')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('arm1')}
              style={{ cursor: 'pointer', opacity: internalOpacity, transition: 'all 0.3s ease' }}
            />

            {/* Segment 2: Elbow Joint & Upper arm */}
            <circle cx="250" cy="155" r="16" 
              fill={isFaulty ? 'rgba(245, 158, 11, 0.15)' : hoveredPart === 'elbow' ? 'var(--primary-light)' : '#ffffff'} 
              stroke={isFaulty ? 'var(--amber)' : 'var(--primary)'} 
              strokeWidth={isFaulty ? '3' : '2'}
              onMouseEnter={() => setHoveredPart('elbow')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('elbow')}
              style={{ cursor: 'pointer', opacity: internalOpacity, transition: 'all 0.3s ease' }}
              className={isFaulty ? 'component-hotspot active' : 'component-hotspot'}
            />

            {/* Segment 3: Forearm Link */}
            <path d="M 250 155 L 380 110 L 390 125 L 260 170 Z" 
              fill={hoveredPart === 'arm2' ? 'var(--primary-light)' : '#ffffff'} 
              stroke="var(--primary)" 
              strokeWidth="2"
              onMouseEnter={() => setHoveredPart('arm2')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('arm2')}
              style={{ cursor: 'pointer', opacity: internalOpacity, transition: 'all 0.3s ease' }}
            />

            {/* End Effector Tooling (Welder/Chuck) */}
            <circle cx="385" cy="118" r="10" fill="#64748b" stroke="#475569" strokeWidth="1.5" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <path d="M 385 118 L 415 105 L 420 115 Z" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />

            {/* Animated Hydraulic Flow Line & Filter Element */}
            <path d="M 300 260 L 250 155 L 385 118" stroke="var(--primary)" strokeWidth="2.5" strokeDasharray="6,4" style={{ animation: 'fluidFlow 1s linear infinite', opacity: internalOpacity * 0.7 }} />
            
            {/* Heat Pulse Warning Ring on Joint */}
            {isFaulty && (
              <circle cx="250" cy="155" r="26" stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="3 3" style={{ animation: 'pulseHeat 1.5s ease-in-out infinite', transformOrigin: '250px 155px', opacity: internalOpacity }} />
            )}

            <rect x="235" y="195" width="12" height="28" rx="2" 
              fill={isFaulty ? 'rgba(245, 158, 11, 0.2)' : hoveredPart === 'filter' ? 'var(--primary-light)' : '#ffffff'} 
              stroke={isFaulty ? 'var(--amber)' : 'var(--primary)'} 
              strokeWidth="1.5"
              onMouseEnter={() => setHoveredPart('filter')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('filter')}
              style={{ cursor: 'pointer', opacity: sensorOpacity, transition: 'all 0.3s ease' }}
            />
            <text x="220" y="212" fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-sans)" style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }}>FILTER PART-FLD-12</text>

            {/* Fault Callout for Thermal Overheat */}
            {isFaulty && (
              <g style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }}>
                {/* Floating Heat Waves */}
                <path d="M 245 130 Q 248 120 245 110" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 252 132 Q 255 122 252 112" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 250 155 L 140 180" stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="140" cy="180" r="4" fill="var(--amber)" />

                {/* Overheat Details Card */}
                <foreignObject x="10" y="100" width="160" height="90">
                  <div style={{ background: '#ffffff', border: '1px solid var(--amber)', borderRadius: '8px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.1)', fontSize: '0.72rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.2rem' }}>
                      <Thermometer size={12} /> OIL RUNAWAY
                    </div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.68rem', lineHeight: '1.2' }}>
                      Viscosity breakdown in joint cylinder. Hydraulic Temp: <strong>{machine.telemetry.temperature}°C</strong>. Flush filter immediately.
                    </div>
                  </div>
                </foreignObject>
              </g>
            )}

            <text x="300" y="60" textAnchor="middle" fill="var(--text-dim)" fontSize="10" fontWeight="bold">6-AXIS WELDING JOINT ASSEMBLY (B2)</text>
          </svg>
        );

      case 'MAC-STP-404':
      case 'EQ107': // Stamping Press
        return (
          <svg viewBox="0 0 600 320" style={{ width: '100%', height: '100%', fill: 'none', stroke: '#475569' }}>
            <rect width="600" height="320" fill="url(#grid)" stroke="none" />

            {/* Heavy Frame Columns */}
            <rect x="220" y="70" width="30" height="200" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <rect x="350" y="70" width="30" height="200" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            {/* Upper Frame Beam */}
            <rect x="220" y="45" width="160" height="30" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />

            {/* Central Piston Cylinder */}
            <rect x="280" y="75" width="40" height="100" fill="#ffffff" stroke="var(--primary)" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            
            {/* Animated Piston Rod & Die Stamp Head */}
            <g style={{
              animation: isFaulty ? 'none' : 'pressStroke 3.5s ease-in-out infinite',
              transform: isFaulty ? 'translateY(55px)' : 'none',
              opacity: internalOpacity,
              transition: 'all 0.3s ease'
            }}>
              {/* Piston Rod (Starts retracted inside cylinder) */}
              <rect x="292" y="125" width="16" height="60" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
              {/* Die / Stamp Head */}
              <path d="M 270 185 L 330 185 L 340 205 L 260 205 Z" fill="#64748b" stroke="#475569" strokeWidth="2" />
            </g>

            {/* Hydraulic Solenoid Valve Block (Faulty Area) */}
            <rect x="180" y="110" width="40" height="50" rx="3" 
              fill={isFaulty ? 'rgba(239, 68, 68, 0.1)' : hoveredPart === 'valve' ? 'var(--primary-light)' : '#ffffff'} 
              stroke={isFaulty ? 'var(--crimson)' : 'var(--primary)'} 
              strokeWidth={isFaulty ? '3' : '2'}
              onMouseEnter={() => setHoveredPart('valve')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => setSelectedPart('valve')}
              style={{ cursor: 'pointer', opacity: sensorOpacity, transition: 'all 0.3s ease' }}
              className={isFaulty ? 'component-hotspot active' : 'component-hotspot'}
            />
            {/* Solenoid connectors */}
            <line x1="180" y1="125" x2="220" y2="125" stroke="#cbd5e1" strokeWidth="1.5" style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }} />
            <line x1="180" y1="145" x2="220" y2="145" stroke="#cbd5e1" strokeWidth="1.5" style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }} />
            <text x="200" y="98" textAnchor="middle" fill="var(--text-dim)" fontSize="7" fontFamily="var(--font-sans)" style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }}>VALVE PART-VLV-99</text>

            {/* Fault Callout for Relief Valve rupture */}
            {isFaulty && (
              <g style={{ opacity: sensorOpacity, transition: 'all 0.3s ease' }}>
                <ellipse cx="200" cy="135" rx="30" ry="30" stroke="var(--crimson)" strokeWidth="1" strokeDasharray="2 2" />
                <path d="M 200 135 L 110 90" stroke="var(--crimson)" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="110" cy="90" r="4" fill="var(--crimson)" />

                {/* Valve details card */}
                <foreignObject x="10" y="10" width="170" height="95">
                  <div style={{ background: '#ffffff', border: '1px solid var(--crimson)', borderRadius: '8px', padding: '0.5rem', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.1)', fontSize: '0.72rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--crimson)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.2rem' }}>
                      <AlertCircle size={12} /> VALVE RUPTURE
                    </div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.68rem', lineHeight: '1.2' }}>
                      Proportional Valve seat blowby. System pressure: <strong>110 Bar</strong> (Collapse). Replacement: <strong>OUT OF STOCK</strong>!
                    </div>
                  </div>
                </foreignObject>
              </g>
            )}

            <text x="300" y="30" textAnchor="middle" fill="var(--text-dim)" fontSize="10" fontWeight="bold">HEAVY PRESS CYLINDER & VALVES (P4)</text>
          </svg>
        );

      default:
        // Generic fallback machine diagram (looks like a pump/motor assembly)
        return (
          <svg viewBox="0 0 600 320" style={{ width: '100%', height: '100%', fill: 'none', stroke: '#475569' }}>
            <rect width="600" height="320" fill="url(#grid)" stroke="none" />

            {/* Isometric Pump Body */}
            <ellipse cx="300" cy="180" rx="60" ry="25" fill="#f8fafc" stroke="var(--primary)" strokeWidth="2.5" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <path d="M 240 180 L 240 120 L 360 120 L 360 180" stroke="var(--primary)" strokeWidth="2.5" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            {/* Motor Fin Lines */}
            <line x1="260" y1="120" x2="260" y2="180" stroke="#cbd5e1" strokeWidth="1" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <line x1="280" y1="120" x2="280" y2="180" stroke="#cbd5e1" strokeWidth="1" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <line x1="300" y1="120" x2="300" y2="180" stroke="#cbd5e1" strokeWidth="1" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <line x1="320" y1="120" x2="320" y2="180" stroke="#cbd5e1" strokeWidth="1" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <line x1="340" y1="120" x2="340" y2="180" stroke="#cbd5e1" strokeWidth="1" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />

            {/* Animated Rotational Fan Impeller */}
            <g style={{
              transformOrigin: '300px 120px',
              animation: 'rotation 1s linear infinite',
              opacity: internalOpacity,
              transition: 'all 0.3s ease'
            }}>
              <circle cx="300" cy="120" r="18" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
              <line x1="300" y1="102" x2="300" y2="138" stroke="#475569" strokeWidth="2" />
              <line x1="282" y1="120" x2="318" y2="120" stroke="#475569" strokeWidth="2" />
            </g>
            {/* Fluid Intake Pipes */}
            <path d="M 360 170 L 440 170 L 440 210" stroke="var(--primary)" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />
            <path d="M 240 170 L 160 170 L 160 210" stroke="var(--primary)" strokeWidth="2" style={{ opacity: internalOpacity, transition: 'all 0.3s ease' }} />

            {/* Interactive checkmark / state badge */}
            <g transform="translate(300, 150)">
              <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#ffffff" stroke="var(--emerald)" strokeWidth="1.5" />
              <text x="0" y="4" textAnchor="middle" fill="var(--emerald)" fontSize="8" fontWeight="bold">NOMINAL</text>
            </g>

            <text x="300" y="50" textAnchor="middle" fill="var(--text-dim)" fontSize="10" fontWeight="bold">INDUSTRIAL PUMP ROTOR BLUEPRINT</text>
          </svg>
        );
    }
  };

  const getPartDetails = () => {
    switch (selectedPart) {
      case 'motor':
        return {
          name: 'Main Drive Motor',
          spec: '15kW 3-Phase Induction',
          status: 'Operating within threshold',
          baselines: 'Cycle temp: 48°C, Power: 14.5kW',
        };
      case 'bearings':
        return {
          name: 'Angular Contact Bearing (PART-BRG-77)',
          spec: 'Ceramic Core 7014-CT (12,000 RPM rating)',
          status: machine.status !== 'HEALTHY' ? 'EXCESSIVE FRICTION BREACH (8.4 mm/s)' : 'Healthy',
          baselines: 'Vibration limit: 4.5 mm/s, Lubrication: Synthetic Grease LUB-SYN-90',
        };
      case 'sensor':
        return {
          name: 'Piezoelectric Vibration Sensor',
          spec: 'High-frequency accelerometer (10kHz sampling)',
          status: 'Online & Streaming',
          baselines: 'Output bus: Analog 4-20mA to PLC controller',
        };
      case 'elbow':
        return {
          name: 'Hydraulic Cylinder Joint',
          spec: 'Rotary Actuator (Max torque: 420 Nm)',
          status: machine.status !== 'HEALTHY' ? 'HIGH THERMAL RESISTANCE (94°C)' : 'Healthy',
          baselines: 'Fluid type: ISO-VG-46, Filter element: PART-FLD-12',
        };
      case 'valve':
        return {
          name: 'Proportional Relief Valve (PART-VLV-99)',
          spec: 'Pilot-operated relief valve (350-Bar Max)',
          status: machine.status !== 'HEALTHY' ? 'SEAT LEAKAGE / HYDRAULIC PRESSURE COLLAPSE' : 'Healthy',
          baselines: 'Baseline pressure: 210 Bar, Out-of-Stock fallback activated',
        };
      default:
        return null;
    }
  };

  const partInfo = getPartDetails();

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '390px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes rotation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wobble {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-1.5px, 1.5px) rotate(-1.5deg); }
          50% { transform: translate(1.5px, -1.5px) rotate(1.5deg); }
          75% { transform: translate(-1.5px, -1.5px) rotate(-0.8deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes fluidFlow {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pressStroke {
          0% { transform: translateY(0); }
          15% { transform: translateY(55px); }
          20% { transform: translateY(55px); }
          55% { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        @keyframes pulseHeat {
          0% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
          100% { opacity: 0.3; transform: scale(1); }
        }
      `}} />
      
      {/* Schematic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Cpu size={18} />
            {getMachineTitle()}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Digital Twin component schematic blueprint with live hotspot inspection.
          </p>
        </div>
        
        {/* Layer Controls & Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {/* CAD Layer Selector */}
          <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--bg-dark)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveLayer('shell')}
              style={{
                background: activeLayer === 'shell' ? '#ffffff' : 'transparent',
                border: 'none',
                color: activeLayer === 'shell' ? 'var(--primary)' : 'var(--text-dim)',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Inspect outer frame and cabinet shell"
            >
              Outer Shell
            </button>
            <button
              onClick={() => setActiveLayer('internal')}
              style={{
                background: activeLayer === 'internal' ? '#ffffff' : 'transparent',
                border: 'none',
                color: activeLayer === 'internal' ? 'var(--primary)' : 'var(--text-dim)',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Inspect internal mechanical core assembly"
            >
              Internal Core
            </button>
            <button
              onClick={() => setActiveLayer('sensors')}
              style={{
                background: activeLayer === 'sensors' ? '#ffffff' : 'transparent',
                border: 'none',
                color: activeLayer === 'sensors' ? 'var(--primary)' : 'var(--text-dim)',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Inspect telemetry probes and active sensors"
            >
              Sensors & Probes
            </button>
          </div>

          <span className={`status-pill ${machine.status.toLowerCase()}`}>
            <span className={`live-dot ${machine.status.toLowerCase()}`} />
            {machine.status === 'HEALTHY' ? 'ONLINE' : `FAULT: ${machine.status}`}
          </span>
        </div>
      </div>

      {/* SVG Diagram and Part Inspector */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem', position: 'relative' }}>
        
        {/* Render Blueprint */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {renderSVGBlueprint()}
        </div>

        {/* Part Inspector Sidebar */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
          {partInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>
                {partInfo.name}
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Specification</span>
                <strong>{partInfo.spec}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Operating Status</span>
                <span style={{ color: partInfo.status.includes('BREACH') || partInfo.status.includes('COLLAPSE') ? 'var(--crimson)' : 'var(--emerald)', fontWeight: 600 }}>
                  {partInfo.status}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Limits / Greasing</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{partInfo.baselines}</span>
              </div>

              {machine.status !== 'HEALTHY' && (partIdMatches(partInfo.name, machine.id)) && (
                <button 
                  onClick={onFixComponent}
                  className="btn-danger" 
                  style={{ width: '100%', padding: '0.4rem', justifyContent: 'center', fontSize: '0.72rem', marginTop: 'auto' }}
                >
                  <Wrench size={12} /> Replace Component
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-dim)', textAlign: 'center' }}>
              <Activity size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-dim)' }} />
              Hover or click elements in schematic to inspect components and sensors
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper to match faulty part names
function partIdMatches(partName: string, machineId: string): boolean {
  if ((machineId === 'MAC-CNC-101' || machineId === 'EQ101') && partName.includes('Bearing')) return true;
  if ((machineId === 'MAC-ARM-202' || machineId === 'EQ103') && partName.includes('Filter')) return true;
  if ((machineId === 'MAC-STP-404' || machineId === 'EQ107') && partName.includes('Valve')) return true;
  return false;
}
