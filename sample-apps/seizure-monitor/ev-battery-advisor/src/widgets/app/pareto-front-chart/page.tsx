'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface ChartPoint {
    id: string;
    name: string;
    chemistryFamily: string;
    x: number;
    y: number;
    compositeScore: number;
    isPareto: boolean;
    rank: number;
}

interface WidgetData {
    componentType: string;
    xAxis: string;
    yAxis: string;
    xAxisLabel: string;
    yAxisLabel: string;
    chartData: ChartPoint[];
    paretoFrontIds: string[];
    totalPoints: number;
    paretoFrontSize: number;
    generatedAt: string;
}

const MATERIAL_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6'];

export default function ParetoFrontChartWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput, sendFollowUpMessage } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();
    const [tooltip, setTooltip] = useState<{ point: ChartPoint; px: number; py: number } | null>(null);

    const bg = isDark ? '#0a0a0a' : '#f8fafc';
    const card = isDark ? '#111827' : '#ffffff';
    const border = isDark ? '#1f2937' : '#e5e7eb';
    const text = isDark ? '#f9fafb' : '#111827';
    const muted = isDark ? '#9ca3af' : '#6b7280';

    if (!data || !data.chartData?.length) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: isDark ? '#fff' : '#000', background: bg, minHeight: '300px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Pareto Front Chart</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: muted }}>
                    {isReady ? 'Call show_pareto_front_chart to render.' : 'Connecting to host...'}
                </p>
            </div>
        );
    }

    const svgW = 340;
    const svgH = 240;
    const padL = 48;
    const padR = 16;
    const padT = 16;
    const padB = 40;
    const chartW = svgW - padL - padR;
    const chartH = svgH - padT - padB;

    const xs = data.chartData.map(d => d.x);
    const ys = data.chartData.map(d => d.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const toSvgX = (v: number) => padL + ((v - xMin) / (xMax - xMin || 1)) * chartW;
    const toSvgY = (v: number) => padT + chartH - ((v - yMin) / (yMax - yMin || 1)) * chartH;

    return (
        <div style={{ background: bg, minHeight: '400px', maxHeight: maxHeight || '600px', overflow: 'auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: text }}>📊 Pareto Front</h1>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: muted }}>
                            {data.componentType} • {data.totalPoints} candidates • {data.paretoFrontSize} on Pareto front
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#6366f1', color: '#fff' }}>⬟ Pareto</span>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: isDark ? '#374151' : '#f3f4f6', color: muted }}>● Dominated</span>
                    </div>
                </div>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* SVG Chart */}
                <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '16px', overflowX: 'auto' }}>
                    <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
                        {/* Grid lines */}
                        {[0.25, 0.5, 0.75, 1.0].map(t => {
                            const gx = padL + t * chartW;
                            const gy = padT + (1 - t) * chartH;
                            return (
                                <g key={t}>
                                    <line x1={gx} y1={padT} x2={gx} y2={padT + chartH} stroke={isDark ? '#1f2937' : '#f3f4f6'} strokeWidth="1" />
                                    <line x1={padL} y1={gy} x2={padL + chartW} y2={gy} stroke={isDark ? '#1f2937' : '#f3f4f6'} strokeWidth="1" />
                                </g>
                            );
                        })}

                        {/* Axes */}
                        <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke={isDark ? '#374151' : '#d1d5db'} strokeWidth="1.5" />
                        <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke={isDark ? '#374151' : '#d1d5db'} strokeWidth="1.5" />

                        {/* Axis labels */}
                        <text x={padL + chartW / 2} y={svgH - 4} textAnchor="middle" fontSize="10" fill={muted}>{data.xAxisLabel}</text>
                        <text x={10} y={padT + chartH / 2} textAnchor="middle" fontSize="10" fill={muted} transform={`rotate(-90, 10, ${padT + chartH / 2})`}>{data.yAxisLabel}</text>

                        {/* Pareto front line */}
                        {(() => {
                            const paretoPoints = data.chartData
                                .filter(d => d.isPareto)
                                .sort((a, b) => a.x - b.x);
                            if (paretoPoints.length < 2) return null;
                            const points = paretoPoints.map(d => `${toSvgX(d.x)},${toSvgY(d.y)}`).join(' ');
                            return <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />;
                        })()}

                        {/* Data points */}
                        {data.chartData.map((d, i) => {
                            const px = toSvgX(d.x);
                            const py = toSvgY(d.y);
                            const isPareto = d.isPareto;
                            const color = MATERIAL_COLORS[i % MATERIAL_COLORS.length];

                            return (
                                <g
                                    key={d.id}
                                    onMouseEnter={() => setTooltip({ point: d, px, py })}
                                    onMouseLeave={() => setTooltip(null)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {isPareto && (
                                        <circle cx={px} cy={py} r={12} fill={color} opacity="0.15" />
                                    )}
                                    <circle
                                        cx={px}
                                        cy={py}
                                        r={isPareto ? 7 : 5}
                                        fill={isPareto ? color : (isDark ? '#374151' : '#9ca3af')}
                                        stroke={isPareto ? '#fff' : 'none'}
                                        strokeWidth={isPareto ? 1.5 : 0}
                                    />
                                    {isPareto && (
                                        <text x={px} y={py - 11} textAnchor="middle" fontSize="8" fill={color} fontWeight="600">
                                            {d.name.split(' ').slice(0, 2).join(' ')}
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {/* Tooltip */}
                        {tooltip && (
                            <g>
                                <rect
                                    x={Math.min(tooltip.px - 60, svgW - 130)}
                                    y={tooltip.py - 56}
                                    width={125}
                                    height={50}
                                    rx="6"
                                    fill={isDark ? '#1f2937' : '#ffffff'}
                                    stroke={isDark ? '#374151' : '#e5e7eb'}
                                    strokeWidth="1"
                                />
                                <text x={Math.min(tooltip.px - 60, svgW - 130) + 8} y={tooltip.py - 40} fontSize="10" fill={text} fontWeight="700">{tooltip.point.name}</text>
                                <text x={Math.min(tooltip.px - 60, svgW - 130) + 8} y={tooltip.py - 26} fontSize="9" fill={muted}>X: {tooltip.point.x} {data.xAxisLabel}</text>
                                <text x={Math.min(tooltip.px - 60, svgW - 130) + 8} y={tooltip.py - 14} fontSize="9" fill={muted}>Y: {tooltip.point.y} {data.yAxisLabel}</text>
                            </g>
                        )}
                    </svg>
                </div>

                {/* Pareto Front Summary */}
                <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>⬟ Pareto-Optimal Candidates</span>
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.chartData.filter(d => d.isPareto).map((d, i) => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: isDark ? '#1f2937' : '#f9fafb' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: MATERIAL_COLORS[i % MATERIAL_COLORS.length], flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: text }}>{d.name}</div>
                                    <div style={{ fontSize: '11px', color: muted }}>{data.xAxisLabel}: {d.x} | {data.yAxisLabel}: {d.y}</div>
                                </div>
                                <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>Rank #{d.rank}</div>
                            </div>
                        ))}
                        {data.chartData.filter(d => d.isPareto).length === 0 && (
                            <p style={{ margin: 0, fontSize: '13px', color: muted }}>No Pareto-optimal candidates identified.</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => sendFollowUpMessage(`Explain the trade-offs between the Pareto-optimal ${data.componentType} candidates and recommend the best option for a cost-sensitive passenger EV.`)}
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
                    💬 Explain Trade-offs Between Pareto Candidates
                </button>
            </div>

            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: muted, borderTop: `1px solid ${border}` }}>
                EV Battery Material Advisor • Hover data points for details
            </div>
        </div>
    );
}
