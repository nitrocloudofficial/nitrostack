'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { RadioTower } from 'lucide-react';
import { palette, Badge, Loading, type Palette } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import type { DataFreshness, DataSourceStatus } from '../../lib/types';

function dot(s: DataSourceStatus, p: Palette): { c: string; b: string; label: string } {
    if (s.status === 'unreachable') return { c: p.danger, b: p.dangerSoft, label: 'Unreachable' };
    if (s.kind === 'live') return { c: p.good, b: p.goodSoft, label: 'Live' };
    return { c: p.warn, b: p.warnSoft, label: 'Reference' };
}

export default function DataFreshnessWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<DataFreshness>();

    if (!data || !Array.isArray(data.sources)) {
        return <Loading isDark={isDark} label={isReady ? 'Checking data sources…' : 'Loading…'} />;
    }

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <RadioTower size={22} color={p.good} />
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Data Freshness</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>Checked {formatDateTime(data.generatedAt)}</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.sources.map((s, i) => {
                    const d = dot(s, p);
                    return (
                        <div key={i} style={{ background: p.surface, border: `1px solid ${p.border}`, borderLeft: `4px solid ${d.c}`, borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{s.source}</span>
                                <Badge color={d.c} bg={d.b}>
                                    <span style={{ width: 7, height: 7, borderRadius: 999, background: d.c, display: 'inline-block' }} /> {d.label}
                                </Badge>
                            </div>
                            <div style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{s.note}</div>
                            <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: p.textMuted, marginTop: 6 }}>
                                <span>fetched {formatDateTime(s.fetchedAt)}</span>
                                {s.latestDataDate && <span>· data date {s.latestDataDate}</span>}
                                {s.asOf && <span>· as of {s.asOf}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                🟢 live = fetched per request · 🟡 reference = authoritative dated value
            </div>
        </div>
    );
}
