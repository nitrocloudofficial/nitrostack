'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface TradeOff {
    materialAId: string;
    materialAName: string;
    materialBId: string;
    materialBName: string;
    dimension: string;
    narrative: string;
    aAdvantagePercent: number;
}

interface Candidate {
    id: string;
    name: string;
    compositeScore: number;
    rank: number;
}

interface WidgetData {
    componentType: string;
    tradeOffs: TradeOff[];
    totalTradeOffs: number;
    topCandidates: Candidate[];
    generatedAt: string;
}

export default function TradeOffTableWidget() {
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
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚖️</div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Trade-off Analysis</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: muted }}>
                    {isReady ? 'Call show_trade_off_table to render.' : 'Connecting...'}
                </p>
            </div>
        );
    }

    const compType = data.componentType?.charAt(0)?.toUpperCase() + data.componentType?.slice(1);

    return (
        <div style={{ background: bg, minHeight: '380px', maxHeight: maxHeight || '580px', overflow: 'auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: text }}>⚖️ {compType} Trade-off Analysis</h1>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: muted }}>
                    {data.totalTradeOffs} trade-off{data.totalTradeOffs !== 1 ? 's' : ''} identified between top {data.topCandidates?.length ?? 0} candidates
                </p>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Top Candidates */}
                {data.topCandidates?.length > 0 && (
                    <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '10px' }}>🏆 Top Candidates</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {data.topCandidates.map((c, i) => {
                                const rankColors = ['#6366f1', '#f59e0b', '#22c55e'];
                                return (
                                    <div key={c.id} style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        background: rankColors[i] + '22',
                                        border: `1px solid ${rankColors[i]}44`,
                                        fontSize: '12px',
                                    }}>
                                        <span style={{ fontWeight: 700, color: rankColors[i] }}>#{c.rank} {c.name}</span>
                                        <span style={{ color: muted, marginLeft: '6px' }}>{c.compositeScore}/100</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Trade-off Cards */}
                {data.tradeOffs?.length === 0 ? (
                    <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: text }}>No significant trade-offs identified</div>
                        <div style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>Candidates are closely matched — TOPSIS ranking determines the best pick.</div>
                    </div>
                ) : (
                    data.tradeOffs.map((t, i) => {
                        const isAAdvantage = t.aAdvantagePercent > 0;
                        const pct = Math.abs(t.aAdvantagePercent);

                        return (
                            <div key={i} style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
                                {/* Dimension Header */}
                                <div style={{ padding: '10px 14px', background: isDark ? '#1f2937' : '#f9fafb', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: text }}>📌 {t.dimension}</span>
                                    <span style={{ fontSize: '11px', color: muted }}>{pct.toFixed(0)}% difference</span>
                                </div>

                                {/* Bar comparison */}
                                <div style={{ padding: '14px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ flex: 1, textAlign: 'right', fontSize: '11px', fontWeight: 600, color: isAAdvantage ? '#6366f1' : muted }}>
                                            {t.materialAName}
                                            {isAAdvantage && <span style={{ marginLeft: '4px' }}>✓</span>}
                                        </div>
                                        <div style={{ width: '120px', height: '8px', borderRadius: '4px', background: isDark ? '#374151' : '#e5e7eb', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(pct * 0.7 + 30, 100)}%`, background: isAAdvantage ? '#6366f1' : '#f59e0b', borderRadius: '4px' }} />
                                        </div>
                                        <div style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: !isAAdvantage ? '#f59e0b' : muted }}>
                                            {t.materialBName}
                                            {!isAAdvantage && <span style={{ marginLeft: '4px' }}>✓</span>}
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '12px', color: text, lineHeight: '1.5' }}>{t.narrative}</p>
                                </div>
                            </div>
                        );
                    })
                )}

                <button
                    onClick={() => sendFollowUpMessage(`Generate a plain-English trade-off narrative for the ${data.componentType} candidates and provide a final recommendation for a cost-optimized EV program.`)}
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
                    📝 Generate Full Trade-off Narrative
                </button>
            </div>

            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: muted, borderTop: `1px solid ${border}` }}>
                EV Battery Material Advisor • Trade-off Analysis
            </div>
        </div>
    );
}
