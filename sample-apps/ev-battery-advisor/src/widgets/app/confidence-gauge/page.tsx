'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface BreakdownItem {
    score: number;
    percent: number;
    label: string;
    weight: string;
}

interface WidgetData {
    materialId: string;
    materialName: string;
    componentType: string;
    chemistryFamily: string;
    overall: number;
    overallPercent: number;
    color: string;
    interpretive: string;
    breakdown: {
        kbDataRecency: BreakdownItem;
        simulationFidelity: BreakdownItem;
        historicalAccuracy: BreakdownItem;
    };
    breakdownNarrative: string;
}

function ArcGauge({ percent, color, isDark }: { percent: number; color: string; isDark: boolean }) {
    const r = 70;
    const cx = 90;
    const cy = 90;
    const strokeW = 14;
    const arcAngle = 220; // degrees of arc
    const startAngle = 160;

    const toRad = (d: number) => (d * Math.PI) / 180;

    const arcPath = (start: number, end: number, radius: number) => {
        const sa = toRad(start);
        const ea = toRad(end);
        const x1 = cx + radius * Math.cos(sa);
        const y1 = cy + radius * Math.sin(sa);
        const x2 = cx + radius * Math.cos(ea);
        const y2 = cy + radius * Math.sin(ea);
        const large = end - start > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
    };

    const filledEnd = startAngle + (arcAngle * percent) / 100;

    return (
        <svg width={180} height={120} viewBox="0 0 180 120">
            {/* Background arc */}
            <path
                d={arcPath(startAngle, startAngle + arcAngle, r)}
                fill="none"
                stroke={isDark ? '#1f2937' : '#e5e7eb'}
                strokeWidth={strokeW}
                strokeLinecap="round"
            />
            {/* Filled arc */}
            {percent > 0 && (
                <path
                    d={arcPath(startAngle, Math.min(filledEnd, startAngle + arcAngle - 1), r)}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                />
            )}
            {/* Center text */}
            <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="700" fill={color}>
                {percent}%
            </text>
            <text x={cx} y={cy + 22} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={isDark ? '#6b7280' : '#9ca3af'}>
                CONFIDENCE
            </text>
        </svg>
    );
}

function BreakdownBar({ item, isDark, text, muted }: { item: BreakdownItem; isDark: boolean; text: string; muted: string }) {
    const barColor = item.percent >= 80 ? '#22c55e' : item.percent >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: text }}>{item.label}</span>
                <span style={{ fontSize: '11px', color: muted }}>weight: {item.weight}</span>
            </div>
            <div style={{ position: 'relative', height: '8px', background: isDark ? '#1f2937' : '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    left: 0, top: 0, height: '100%',
                    width: `${item.percent}%`,
                    background: barColor,
                    borderRadius: '4px',
                    transition: 'width 0.6s ease',
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                <span style={{ fontSize: '10px', color: muted }}>0%</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: barColor }}>{item.percent}%</span>
                <span style={{ fontSize: '10px', color: muted }}>100%</span>
            </div>
        </div>
    );
}

export default function ConfidenceGaugeWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput, sendFollowUpMessage } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const bg = isDark ? '#0a0a0a' : '#f8fafc';
    const card = isDark ? '#111827' : '#ffffff';
    const border = isDark ? '#1f2937' : '#e5e7eb';
    const text = isDark ? '#f9fafb' : '#111827';
    const muted = isDark ? '#9ca3af' : '#6b7280';

    if (!data) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: isDark ? '#fff' : '#000', background: bg, minHeight: '300px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Confidence Gauge</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: muted }}>
                    {isReady ? 'Call show_confidence_gauge to render.' : 'Connecting...'}
                </p>
            </div>
        );
    }

    const compType = data.componentType?.charAt(0)?.toUpperCase() + data.componentType?.slice(1);
    const gaugeBg = data.color + '15';

    return (
        <div style={{ background: bg, minHeight: '380px', maxHeight: maxHeight || '580px', overflow: 'auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: text }}>🎯 Recommendation Confidence</h1>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: muted }}>{data.materialName} • {compType}</p>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Main Gauge */}
                <div style={{
                    background: gaugeBg,
                    border: `1px solid ${data.color}33`,
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                }}>
                    <ArcGauge percent={data.overallPercent} color={data.color} isDark={isDark} />
                    <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 700, color: data.color }}>
                        {data.interpretive}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: text, fontWeight: 600 }}>
                        {data.materialName}
                    </div>
                    <div style={{ marginTop: '2px', fontSize: '11px', color: muted }}>
                        {data.chemistryFamily} • {data.componentType}
                    </div>
                </div>

                {/* Breakdown Bars */}
                <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: text, marginBottom: '14px' }}>📊 Score Breakdown</div>
                    {data.breakdown && (
                        <>
                            <BreakdownBar item={data.breakdown.kbDataRecency} isDark={isDark} text={text} muted={muted} />
                            <BreakdownBar item={data.breakdown.simulationFidelity} isDark={isDark} text={text} muted={muted} />
                            <BreakdownBar item={data.breakdown.historicalAccuracy} isDark={isDark} text={text} muted={muted} />
                        </>
                    )}
                </div>

                {/* Narrative */}
                {data.breakdownNarrative && (
                    <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '8px' }}>📖 Confidence Breakdown</div>
                        <p style={{ margin: 0, fontSize: '12px', color: muted, lineHeight: '1.6' }}>{data.breakdownNarrative}</p>
                    </div>
                )}

                {/* Confidence guidance */}
                <div style={{
                    background: data.overallPercent >= 85 ? '#dcfce7' : data.overallPercent >= 70 ? '#fef9c3' : '#fee2e2',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '12px',
                    color: data.overallPercent >= 85 ? '#166534' : data.overallPercent >= 70 ? '#854d0e' : '#991b1b',
                    fontWeight: 500,
                    lineHeight: '1.5',
                }}>
                    {data.overallPercent >= 85
                        ? '✅ High confidence — proceed to physical coin-cell validation of the recommendation.'
                        : data.overallPercent >= 70
                        ? '⚠️ Moderate confidence — physical validation recommended before scale-up commitment.'
                        : '🔴 Low confidence — additional data collection required before committing to physical testing.'}
                </div>

                <button
                    onClick={() => sendFollowUpMessage(`What additional data would increase confidence in the ${data.materialName} recommendation? Suggest specific tests or data sources.`)}
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
                    🔎 How to Increase Confidence?
                </button>
            </div>

            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: muted, borderTop: `1px solid ${border}` }}>
                EV Battery Material Advisor • Confidence Model
            </div>
        </div>
    );
}
