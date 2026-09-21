'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface MaterialData {
    id: string;
    name: string;
    chemistryFamily: string;
    rank: number;
    compositeScore: number;
    dataConfidence: number;
    metrics: {
        gravimetricEnergyDensity: number;
        materialCostPerKWh: number;
        cycleLifeTo80SOH: number;
        thermalRunawayOnsetTemp: number;
        cRateCapability: number;
        criticalMineralDependency: number;
        recyclability: number;
        carbonFootprint: number;
    };
    strengths: string[];
    weaknesses: string[];
    regulatoryCompliance: {
        un383: boolean;
        reach: boolean;
        rohs: boolean;
        euBatteryRegulation: boolean;
    };
}

interface WidgetData {
    componentType: string;
    materials: MaterialData[];
    totalShown: number;
    generatedAt: string;
}

const METRIC_CONFIG = [
    { key: 'gravimetricEnergyDensity', label: 'Energy Density', unit: 'Wh/kg', max: 400, higherBetter: true, color: '#6366f1' },
    { key: 'materialCostPerKWh', label: 'Cost', unit: '$/kWh', max: 120, higherBetter: false, color: '#f59e0b' },
    { key: 'cycleLifeTo80SOH', label: 'Cycle Life', unit: 'cycles', max: 4000, higherBetter: true, color: '#22c55e' },
    { key: 'thermalRunawayOnsetTemp', label: 'Thermal Safety', unit: '°C', max: 900, higherBetter: true, color: '#ef4444' },
    { key: 'cRateCapability', label: 'C-Rate', unit: 'C', max: 6, higherBetter: true, color: '#3b82f6' },
    { key: 'criticalMineralDependency', label: 'Supply Risk', unit: '/10', max: 10, higherBetter: false, color: '#ec4899' },
    { key: 'recyclability', label: 'Recyclability', unit: '%', max: 100, higherBetter: true, color: '#10b981' },
    { key: 'carbonFootprint', label: 'Carbon', unit: 'kg CO₂/kWh', max: 100, higherBetter: false, color: '#8b5cf6' },
];

const MATERIAL_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6'];

function getScore(val: number, max: number, higherBetter: boolean): number {
    const ratio = Math.min(val / max, 1);
    return higherBetter ? ratio : 1 - ratio;
}

function RadarChart({ materials, isDark }: { materials: MaterialData[]; isDark: boolean }) {
    const size = 220;
    const cx = size / 2;
    const cy = size / 2;
    const r = 80;
    const n = METRIC_CONFIG.length;

    const angleOffset = -Math.PI / 2;
    const angles = METRIC_CONFIG.map((_, i) => angleOffset + (2 * Math.PI * i) / n);

    const getPoint = (angle: number, radius: number) => ({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
    });

    const gridLevels = [0.25, 0.5, 0.75, 1.0];

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Grid */}
            {gridLevels.map(level => (
                <polygon
                    key={level}
                    points={angles.map(a => {
                        const p = getPoint(a, r * level);
                        return `${p.x},${p.y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={isDark ? '#333' : '#e5e7eb'}
                    strokeWidth="1"
                />
            ))}
            {/* Axes */}
            {angles.map((a, i) => {
                const p = getPoint(a, r);
                const lp = getPoint(a, r + 18);
                return (
                    <g key={i}>
                        <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={isDark ? '#444' : '#d1d5db'} strokeWidth="1" />
                        <text
                            x={lp.x}
                            y={lp.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="7"
                            fill={isDark ? '#999' : '#666'}
                        >
                            {METRIC_CONFIG[i].label}
                        </text>
                    </g>
                );
            })}
            {/* Material polygons */}
            {materials.slice(0, 4).map((mat, mi) => {
                const points = METRIC_CONFIG.map((cfg, i) => {
                    const val = (mat.metrics as Record<string, number>)[cfg.key] ?? 0;
                    const score = getScore(val, cfg.max, cfg.higherBetter);
                    const p = getPoint(angles[i], r * score);
                    return `${p.x},${p.y}`;
                }).join(' ');

                return (
                    <polygon
                        key={mat.id}
                        points={points}
                        fill={MATERIAL_COLORS[mi % MATERIAL_COLORS.length]}
                        fillOpacity="0.15"
                        stroke={MATERIAL_COLORS[mi % MATERIAL_COLORS.length]}
                        strokeWidth="1.5"
                    />
                );
            })}
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={2} fill={isDark ? '#666' : '#999'} />
        </svg>
    );
}

export default function MaterialComparisonRadarWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput, sendFollowUpMessage } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const [selectedMetric, setSelectedMetric] = useState<string>('compositeScore');
    const [hoveredMaterial, setHoveredMaterial] = useState<string | null>(null);

    const bg = isDark ? '#0a0a0a' : '#f8fafc';
    const card = isDark ? '#111827' : '#ffffff';
    const border = isDark ? '#1f2937' : '#e5e7eb';
    const text = isDark ? '#f9fafb' : '#111827';
    const muted = isDark ? '#9ca3af' : '#6b7280';

    if (!data || !data.materials?.length) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: isDark ? '#fff' : '#000', background: bg, minHeight: '300px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>EV Battery Material Advisor</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: muted }}>
                    {isReady ? 'Call show_material_comparison to render the radar chart.' : 'Connecting to host...'}
                </p>
            </div>
        );
    }

    const compType = data.componentType.charAt(0).toUpperCase() + data.componentType.slice(1);

    return (
        <div style={{ background: bg, minHeight: '400px', maxHeight: maxHeight || '600px', overflow: 'auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: text }}>⚡ {compType} Comparison</h1>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: muted }}>{data.totalShown} candidates • Radar + Scorecard</p>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                    }}>
                        EV Advisor
                    </div>
                </div>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Radar Chart + Legend */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '16px', flexShrink: 0 }}>
                        <RadarChart materials={data.materials} isDark={isDark} />
                    </div>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                        {data.materials.slice(0, 4).map((m, i) => (
                            <div
                                key={m.id}
                                onMouseEnter={() => setHoveredMaterial(m.id)}
                                onMouseLeave={() => setHoveredMaterial(null)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    marginBottom: '6px',
                                    background: hoveredMaterial === m.id ? (isDark ? '#1f2937' : '#f3f4f6') : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: MATERIAL_COLORS[i % MATERIAL_COLORS.length], flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: text }}>{m.name}</div>
                                    <div style={{ fontSize: '11px', color: muted }}>Rank #{m.rank} • Score: {m.compositeScore}/100</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scorecard Table */}
                <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>📊 Metric Scorecard</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: isDark ? '#1f2937' : '#f9fafb' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: muted, fontWeight: 600 }}>Metric</th>
                                    {data.materials.map((m, i) => (
                                        <th key={m.id} style={{ padding: '8px 12px', textAlign: 'center', color: MATERIAL_COLORS[i % MATERIAL_COLORS.length], fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {m.name.split(' ').slice(0, 2).join(' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {METRIC_CONFIG.map((cfg, ri) => (
                                    <tr key={cfg.key} style={{ borderTop: `1px solid ${border}`, background: ri % 2 === 0 ? 'transparent' : (isDark ? '#0d1117' : '#f9fafb') }}>
                                        <td style={{ padding: '7px 12px', color: text, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: cfg.color, marginRight: '6px', verticalAlign: 'middle' }} />
                                            {cfg.label}
                                            <span style={{ color: muted, fontWeight: 400, fontSize: '10px', marginLeft: '4px' }}>{cfg.unit}</span>
                                        </td>
                                        {data.materials.map((m) => {
                                            const val = (m.metrics as Record<string, number>)[cfg.key] ?? 0;
                                            const score = getScore(val, cfg.max, cfg.higherBetter);
                                            const isGood = score >= 0.65;
                                            const isBad = score < 0.35;
                                            return (
                                                <td key={m.id} style={{ padding: '7px 12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 600,
                                                        background: isGood ? '#dcfce7' : isBad ? '#fee2e2' : '#fef9c3',
                                                        color: isGood ? '#166534' : isBad ? '#991b1b' : '#854d0e',
                                                        fontSize: '11px',
                                                    }}>
                                                        {cfg.key === 'cycleLifeTo80SOH' ? val.toLocaleString() : val}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                <tr style={{ borderTop: `2px solid ${border}`, background: isDark ? '#1f2937' : '#f3f4f6' }}>
                                    <td style={{ padding: '8px 12px', color: text, fontWeight: 700 }}>🏆 Composite Score</td>
                                    {data.materials.map((m) => (
                                        <td key={m.id} style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                background: m.rank === 1 ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (isDark ? '#374151' : '#e5e7eb'),
                                                color: m.rank === 1 ? '#fff' : text,
                                                fontSize: '13px',
                                            }}>
                                                {m.compositeScore}
                                                {m.rank === 1 && ' 👑'}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Regulatory Compliance */}
                <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>📋 Regulatory Compliance</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', overflowX: 'auto' }}>
                        {data.materials.map((m, i) => (
                            <div key={m.id} style={{ minWidth: '120px', flex: 1 }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: MATERIAL_COLORS[i % MATERIAL_COLORS.length], marginBottom: '6px', whiteSpace: 'nowrap' }}>{m.name.split(' ').slice(0, 2).join(' ')}</div>
                                {Object.entries(m.regulatoryCompliance).map(([cert, passed]) => (
                                    <div key={cert} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '12px' }}>{passed ? '✅' : '❌'}</span>
                                        <span style={{ fontSize: '11px', color: muted }}>{cert.toUpperCase()}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ask agent button */}
                <button
                    onClick={() => sendFollowUpMessage(`Run a full EV battery material analysis for the ${data.componentType} candidates shown in the comparison. Start with parse_requirement_spec.`)}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                    }}
                >
                    🚀 Run Full Analysis Pipeline
                </button>
            </div>

            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: muted, borderTop: `1px solid ${border}` }}>
                EV Battery Material Advisor • Powered by NitroStack • {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : ''}
            </div>
        </div>
    );
}
