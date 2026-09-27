'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface TimePoint {
    capacity?: number;
    voltage?: number;
    time?: number;
    temperature?: number;
    cycle?: number;
    capacityRetentionPct?: number;
}

interface SimulationData {
    voltageProfile: TimePoint[];
    thermalProfile: TimePoint[];
    degradationCurve: TimePoint[];
}

interface WidgetData {
    materialId: string;
    materialName: string;
    chemistryFamily: string;
    componentType: string;
    simulation: SimulationData;
    summary: {
        peakCapacityMahG: number;
        peakTemperatureC: number;
        thermalRunawayRisk: string;
        projectedCycleLife: number;
        volumeExpansionPct: number;
        overallSimConfidence: number;
    };
    hasData: boolean;
}

type TabType = 'voltage' | 'thermal' | 'degradation';

function MiniChart({ data, xKey, yKey, color, isDark, yLabel, xLabel }: {
    data: TimePoint[];
    xKey: string;
    yKey: string;
    color: string;
    isDark: boolean;
    yLabel: string;
    xLabel: string;
}) {
    const W = 280;
    const H = 120;
    const padL = 42;
    const padR = 10;
    const padT = 10;
    const padB = 28;
    const cW = W - padL - padR;
    const cH = H - padT - padB;

    const xs = data.map(d => (d as Record<string, number>)[xKey] ?? 0);
    const ys = data.map(d => (d as Record<string, number>)[yKey] ?? 0);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const toX = (v: number) => padL + ((v - xMin) / (xMax - xMin || 1)) * cW;
    const toY = (v: number) => padT + cH - ((v - yMin) / (yMax - yMin || 1)) * cH;

    const points = data.map(d => `${toX((d as Record<string, number>)[xKey] ?? 0)},${toY((d as Record<string, number>)[yKey] ?? 0)}`).join(' ');
    const areaPoints = `${padL},${padT + cH} ${points} ${toX(xs[xs.length - 1])},${padT + cH}`;

    const gridLines = 4;

    return (
        <svg width={W} height={H}>
            {/* Grid */}
            {Array.from({ length: gridLines + 1 }, (_, i) => {
                const gy = padT + (i / gridLines) * cH;
                const val = yMax - (i / gridLines) * (yMax - yMin);
                return (
                    <g key={i}>
                        <line x1={padL} y1={gy} x2={padL + cW} y2={gy} stroke={isDark ? '#1f2937' : '#f3f4f6'} strokeWidth="1" />
                        <text x={padL - 4} y={gy} textAnchor="end" dominantBaseline="middle" fontSize="8" fill={isDark ? '#6b7280' : '#9ca3af'}>
                            {Math.round(val)}
                        </text>
                    </g>
                );
            })}
            {/* Axes */}
            <line x1={padL} y1={padT} x2={padL} y2={padT + cH} stroke={isDark ? '#374151' : '#d1d5db'} strokeWidth="1" />
            <line x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} stroke={isDark ? '#374151' : '#d1d5db'} strokeWidth="1" />
            {/* Area fill */}
            <polygon points={areaPoints} fill={color} fillOpacity="0.1" />
            {/* Line */}
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Labels */}
            <text x={padL + cW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill={isDark ? '#6b7280' : '#9ca3af'}>{xLabel}</text>
            <text x={8} y={padT + cH / 2} textAnchor="middle" fontSize="9" fill={isDark ? '#6b7280' : '#9ca3af'} transform={`rotate(-90, 8, ${padT + cH / 2})`}>{yLabel}</text>
        </svg>
    );
}

export default function DigitalTwinTimelineWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const [activeTab, setActiveTab] = useState<TabType>('voltage');
    const [isRunning, setIsRunning] = useState(false);
    const [cRate, setCRate] = useState(1.0);

    const bg = isDark ? '#0a0a0a' : '#f8fafc';
    const card = isDark ? '#111827' : '#ffffff';
    const border = isDark ? '#1f2937' : '#e5e7eb';
    const text = isDark ? '#f9fafb' : '#111827';
    const muted = isDark ? '#9ca3af' : '#6b7280';

    if (!data || !data.hasData) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: isDark ? '#fff' : '#000', background: bg, minHeight: '300px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔬</div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Digital Twin Simulation</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: muted }}>
                    {isReady ? 'Call show_digital_twin_timeline to render simulation data.' : 'Connecting...'}
                </p>
            </div>
        );
    }

    const riskColor: Record<string, string> = {
        low: '#22c55e',
        moderate: '#f59e0b',
        high: '#ef4444',
        critical: '#dc2626',
    };

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: 'voltage', label: 'Voltage', icon: '⚡' },
        { id: 'thermal', label: 'Thermal', icon: '🌡️' },
        { id: 'degradation', label: 'Degradation', icon: '📉' },
    ];

    const runSim = async () => {
        if (isRunning || !data.materialId) return;
        setIsRunning(true);
        try {
            await callTool('simulate_electrochemical_performance', { materialId: data.materialId, cRate });
        } catch { /* ignore */ } finally {
            setIsRunning(false);
        }
    };

    return (
        <div style={{ background: bg, minHeight: '400px', maxHeight: maxHeight || '650px', overflow: 'auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: text }}>🔬 {data.materialName}</h1>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: muted }}>{data.chemistryFamily} • {data.componentType} • Digital Twin</p>
                    </div>
                    <div style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: riskColor[data.summary.thermalRunawayRisk] + '22',
                        color: riskColor[data.summary.thermalRunawayRisk],
                        fontWeight: 700,
                        border: `1px solid ${riskColor[data.summary.thermalRunawayRisk]}44`,
                    }}>
                        🌡️ {data.summary.thermalRunawayRisk?.toUpperCase()} RISK
                    </div>
                </div>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                        { label: 'Capacity', value: data.summary.peakCapacityMahG?.toFixed(0), unit: 'mAh/g', color: '#6366f1' },
                        { label: 'Peak Temp', value: data.summary.peakTemperatureC?.toFixed(1), unit: '°C', color: '#ef4444' },
                        { label: 'Cycle Life', value: data.summary.projectedCycleLife?.toLocaleString(), unit: 'cycles', color: '#22c55e' },
                        { label: 'Vol. Expansion', value: data.summary.volumeExpansionPct, unit: '%', color: '#f59e0b' },
                        { label: 'Sim Confidence', value: Math.round(data.summary.overallSimConfidence * 100), unit: '%', color: '#3b82f6' },
                        { label: 'Chemistry', value: data.chemistryFamily, unit: '', color: '#8b5cf6' },
                    ].map(s => (
                        <div key={s.label} style={{ background: card, borderRadius: '8px', border: `1px solid ${border}`, padding: '10px 12px' }}>
                            <div style={{ fontSize: '10px', color: muted, marginBottom: '4px' }}>{s.label}</div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '10px', color: muted }}>{s.unit}</div>
                        </div>
                    ))}
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '4px', background: isDark ? '#1f2937' : '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                flex: 1,
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                background: activeTab === t.id ? (isDark ? '#374151' : '#ffffff') : 'transparent',
                                color: activeTab === t.id ? text : muted,
                                fontSize: '11px',
                                fontWeight: activeTab === t.id ? 700 : 400,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Charts */}
                <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '16px', overflowX: 'auto' }}>
                    {activeTab === 'voltage' && data.simulation.voltageProfile?.length > 0 && (
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '12px' }}>⚡ Discharge Voltage Curve (P2D-DFN)</div>
                            <MiniChart
                                data={data.simulation.voltageProfile}
                                xKey="capacity"
                                yKey="voltage"
                                color="#6366f1"
                                isDark={isDark}
                                xLabel="Capacity (mAh/g)"
                                yLabel="Voltage (V)"
                            />
                        </div>
                    )}
                    {activeTab === 'thermal' && data.simulation.thermalProfile?.length > 0 && (
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '12px' }}>🌡️ Thermal Response (FEM Model)</div>
                            <MiniChart
                                data={data.simulation.thermalProfile}
                                xKey="time"
                                yKey="temperature"
                                color="#ef4444"
                                isDark={isDark}
                                xLabel="Time (s)"
                                yLabel="Temp (°C)"
                            />
                        </div>
                    )}
                    {activeTab === 'degradation' && data.simulation.degradationCurve?.length > 0 && (
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '12px' }}>📉 Capacity Retention vs Cycles (SEI Growth)</div>
                            <MiniChart
                                data={data.simulation.degradationCurve}
                                xKey="cycle"
                                yKey="capacityRetentionPct"
                                color="#22c55e"
                                isDark={isDark}
                                xLabel="Cycle (#)"
                                yLabel="SOH (%)"
                            />
                            <div style={{ marginTop: '8px', padding: '6px 10px', background: isDark ? '#1f2937' : '#f0fdf4', borderRadius: '6px', fontSize: '11px', color: isDark ? '#86efac' : '#166534' }}>
                                📍 80% SOH threshold: ~{data.summary.projectedCycleLife?.toLocaleString()} cycles
                            </div>
                        </div>
                    )}
                </div>

                {/* Re-run controls */}
                <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '10px' }}>🔄 Re-run Simulation</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '12px', color: muted, whiteSpace: 'nowrap' }}>C-Rate:</label>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.5"
                            value={cRate}
                            onChange={e => setCRate(parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: '#6366f1' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', minWidth: '30px' }}>{cRate}C</span>
                    </div>
                    <button
                        onClick={runSim}
                        disabled={isRunning}
                        style={{
                            marginTop: '10px',
                            width: '100%',
                            padding: '8px',
                            background: isRunning ? (isDark ? '#374151' : '#e5e7eb') : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: isRunning ? muted : '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isRunning ? '⏳ Simulating...' : `▶ Run at ${cRate}C`}
                    </button>
                </div>
            </div>

            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: muted, borderTop: `1px solid ${border}` }}>
                EV Battery Material Advisor • Digital Twin (PyBaMM + FEM) • Confidence: {Math.round(data.summary.overallSimConfidence * 100)}%
            </div>
        </div>
    );
}
