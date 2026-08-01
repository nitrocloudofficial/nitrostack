'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { palette, Panel, StatCard, SectionTitle, Badge, Loading, type Palette } from '../../components/ui';
import { formatINR, formatPercent } from '../../lib/format';
import type { DeductionOptimizerResult, DeductionLine } from '../../lib/types';

function toneFor(status: DeductionLine['status'], p: Palette) {
    if (status === 'over') return { c: p.danger, b: p.dangerSoft, label: 'Over cap' };
    if (status === 'under') return { c: p.warn, b: p.warnSoft, label: 'Headroom left' };
    return { c: p.good, b: p.goodSoft, label: 'Optimal' };
}

export default function DeductionOptimizerWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<DeductionOptimizerResult>();

    if (!data || !Array.isArray(data.lines)) {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for deduction data…' : 'Loading…'} />;
    }

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 300 }}>
            <div style={{ marginBottom: 14 }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🧮 Deduction Optimizer</h1>
                <div style={{ fontSize: 12, color: p.textMuted }}>Chapter VI-A · {data.regime} regime · gross {formatINR(data.grossIncome)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                <StatCard p={p} label="Wasted (over cap)" value={formatINR(data.totalWasted)} tone={data.totalWasted > 0 ? 'danger' : 'good'} sub="earns no deduction" />
                <StatCard p={p} label="Unclaimed tax saving" value={formatINR(data.totalUnclaimedSaving)} tone={data.totalUnclaimedSaving > 0 ? 'warn' : 'good'} sub="if headroom filled" />
            </div>

            <SectionTitle p={p}>Per-deduction breakdown</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {data.lines.map((l) => {
                    const tone = toneFor(l.status, p);
                    const usedPct = l.cap > 0 ? Math.min(100, (l.used / l.cap) * 100) : 0;
                    const overPct = l.cap > 0 ? Math.min(100, (Math.max(0, l.used - l.cap) / l.cap) * 100) : 0;
                    return (
                        <div key={l.section} style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div>
                                    <span style={{ fontSize: 14, fontWeight: 700 }}>{l.section}</span>
                                    <span style={{ fontSize: 12, color: p.textMuted, marginLeft: 8 }}>{l.name}</span>
                                </div>
                                <Badge color={tone.c} bg={tone.b}>{tone.label}</Badge>
                            </div>
                            <div style={{ height: 8, borderRadius: 999, background: p.surfaceAlt, overflow: 'hidden', display: 'flex' }}>
                                <div style={{ width: `${usedPct}%`, height: '100%', background: tone.c }} />
                                {overPct > 0 && <div style={{ width: `${overPct}%`, height: '100%', background: p.danger, opacity: 0.5 }} />}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: p.textMuted, marginTop: 6 }}>
                                <span>Used {formatINR(l.used)} / cap {formatINR(l.cap)}</span>
                                {l.status === 'over' && <span style={{ color: p.danger }}>−{formatINR(l.wasted)} wasted</span>}
                                {l.status === 'under' && l.potentialTaxSaving > 0 && <span style={{ color: p.warn }}>save {formatINR(l.potentialTaxSaving)}</span>}
                                {l.status === 'optimal' && <span style={{ color: p.good }}>maxed ✓</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {data.flags.length > 0 && (
                <Panel p={p} style={{ marginBottom: 12 }}>
                    <SectionTitle p={p}>Flags</SectionTitle>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                        {data.flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                </Panel>
            )}

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center' }}>{data.note}</div>
        </div>
    );
}
