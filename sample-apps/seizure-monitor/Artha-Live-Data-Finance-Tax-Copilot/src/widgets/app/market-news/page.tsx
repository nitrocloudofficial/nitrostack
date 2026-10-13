'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { palette, Panel, Badge, SectionTitle, Loading, type Palette } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { MarketNewsOutput, MarketEvent } from '../../lib/types';

function sentimentTone(s: string, p: Palette) {
    const k = (s || '').toLowerCase();
    if (k === 'positive') return { c: p.good, b: p.goodSoft };
    if (k === 'negative') return { c: p.danger, b: p.dangerSoft };
    return { c: p.textMuted, b: p.surfaceAlt };
}

function impactTone(s: string, p: Palette) {
    const k = (s || '').toLowerCase();
    if (k === 'high') return { c: p.danger, b: p.dangerSoft };
    if (k === 'medium') return { c: p.warn, b: p.warnSoft };
    return { c: p.textMuted, b: p.surfaceAlt };
}

export default function MarketNewsWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput, openExternal } = useWidgetSDK();
    const data = getToolOutput<MarketNewsOutput>();

    if (!data || !Array.isArray(data.events)) {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for market news…' : 'Loading…'} />;
    }

    const net = data.summary?.netSentiment ?? 'neutral';
    const NetIcon = net === 'bullish' ? TrendingUp : net === 'bearish' ? TrendingDown : Minus;
    const netColor = net === 'bullish' ? p.good : net === 'bearish' ? p.danger : p.textMuted;

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Newspaper size={22} color={p.accent} />
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Market News</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>
                        {data.count} of {data.totalMatched} events ·{' '}
                        <span style={{ color: netColor, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
                            <NetIcon size={13} /> {net}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sentiment summary chips */}
            {data.summary && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {Object.entries(data.summary.bySentiment).map(([k, v]) => {
                        const t = sentimentTone(k, p);
                        return <Badge key={k} color={t.c} bg={t.b}>{k}: {v}</Badge>;
                    })}
                </div>
            )}

            {data.events.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: p.textMuted }}>No events match those filters.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.events.map((e: MarketEvent, i) => {
                    const st = sentimentTone(e.sentiment, p);
                    const it = impactTone(e.impact, p);
                    const up = e.indexChangePercent >= 0;
                    return (
                        <div
                            key={i}
                            onClick={() => e.url && openExternal(e.url)}
                            style={{
                                background: p.surface, border: `1px solid ${p.border}`, borderLeft: `4px solid ${st.c}`,
                                borderRadius: 12, padding: '12px 14px', cursor: e.url ? 'pointer' : 'default',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{e.headline}</div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: up ? p.good : p.danger, whiteSpace: 'nowrap' }}>
                                    {up ? '▲' : '▼'} {Math.abs(e.indexChangePercent).toFixed(2)}%
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                                <Badge color={st.c} bg={st.b}>{e.sentiment}</Badge>
                                <Badge color={it.c} bg={it.b}>{e.impact} impact</Badge>
                                {e.sector && <Badge color={p.accent} bg={p.accentSoft}>{e.sector}</Badge>}
                                <span style={{ fontSize: 11.5, color: p.textMuted }}>
                                    {e.index} · {formatDate(e.date)} · {e.source}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Market news & events dataset · sentiment/impact are dataset-labeled
            </div>
        </div>
    );
}
