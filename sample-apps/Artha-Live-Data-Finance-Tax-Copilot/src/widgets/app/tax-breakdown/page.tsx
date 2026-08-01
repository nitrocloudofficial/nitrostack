'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';
import { CheckCircle2 } from 'lucide-react';
import { palette, Panel, StatCard, SectionTitle, Loading } from '../../components/ui';
import { formatINR, formatPct } from '../../lib/format';
import type { TaxComparison, RegimeResult, Regime } from '../../lib/types';

export default function TaxBreakdownWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<TaxComparison>();

    const [state, setState] = useWidgetState<{ regime: Regime | null }>(() => ({ regime: null }));

    if (!data || !data.old || !data.new || !data.recommendation) {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for tax data…' : 'Loading…'} />;
    }

    const selected: Regime = state?.regime ?? data.recommendation.regime;
    const active: RegimeResult = selected === 'new' ? data.new : data.old;
    const slabs = active.slabBreakdown ?? [];

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 320 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🧮 Income Tax</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>
                        {data.financialYear} · {data.assessmentYear} · Gross {formatINR(data.grossIncome)}
                    </div>
                </div>
            </div>

            {/* Recommendation banner */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: p.goodSoft, border: `1px solid ${p.good}`, borderRadius: 12,
                    padding: '12px 14px', marginBottom: 16,
                }}
            >
                <CheckCircle2 size={20} color={p.good} />
                <div style={{ fontSize: 13, color: p.text }}>
                    <strong style={{ textTransform: 'uppercase' }}>{data.recommendation.regime} regime</strong> recommended —{' '}
                    {data.recommendation.savesVsOther > 0
                        ? <>saves <strong>{formatINR(data.recommendation.savesVsOther)}</strong></>
                        : 'same tax, simpler filing'}
                </div>
            </div>

            {/* Regime toggle */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {(['old', 'new'] as Regime[]).map((r) => {
                    const res = r === 'new' ? data.new : data.old;
                    const isSel = selected === r;
                    return (
                        <button
                            key={r}
                            onClick={() => setState({ regime: r })}
                            style={{
                                flex: 1, cursor: 'pointer', textAlign: 'left',
                                background: isSel ? p.accentSoft : p.surface,
                                border: `1.5px solid ${isSel ? p.accent : p.border}`,
                                borderRadius: 12, padding: '12px 14px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: p.textMuted }}>
                                    {r} regime
                                </span>
                                {r === data.recommendation.regime && (
                                    <span style={{ fontSize: 10, color: p.good, fontWeight: 700 }}>BEST</span>
                                )}
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: isSel ? p.accent : p.text, marginTop: 4 }}>
                                {formatINR(res.totalTax)}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Selected regime stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
                <StatCard p={p} label="Taxable income" value={formatINR(active.taxableIncome)} />
                <StatCard p={p} label="Total deductions" value={formatINR(active.totalDeductions)} />
                <StatCard p={p} label="Total tax" value={formatINR(active.totalTax)} tone="accent" />
                <StatCard p={p} label="Effective rate" value={formatPct(active.effectiveRate)} />
            </div>

            {/* Slab breakdown */}
            <Panel p={p} style={{ marginBottom: 12 }}>
                <SectionTitle p={p}>Slab breakdown · {selected} regime</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {slabs.map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: i < slabs.length - 1 ? `1px solid ${p.border}` : 'none' }}>
                            <span style={{ color: p.textMuted }}>{row.band}</span>
                            <span style={{ color: p.textMuted, width: 44, textAlign: 'right' }}>{formatPct(row.rate, 0)}</span>
                            <span style={{ fontWeight: 600, width: 90, textAlign: 'right' }}>{formatINR(row.taxForBand)}</span>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${p.border}`, fontSize: 13, color: p.textMuted }}>
                    {active.rebate87A > 0 && <Row label="Section 87A rebate" value={`− ${formatINR(active.rebate87A)}`} p={p} />}
                    {active.surcharge > 0 && <Row label="Surcharge" value={formatINR(active.surcharge)} p={p} />}
                    <Row label="Health & Education cess (4%)" value={formatINR(active.cess)} p={p} />
                    <Row label="Total tax payable" value={formatINR(active.totalTax)} p={p} bold />
                </div>
            </Panel>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center' }}>
                Informational & educational only — not investment/tax advice; verify with a SEBI-registered adviser or CA.
            </div>
        </div>
    );
}

function Row({ label, value, p, bold }: { label: string; value: string; p: ReturnType<typeof palette>; bold?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span>{label}</span>
            <span style={{ fontWeight: bold ? 700 : 500, color: bold ? p.text : undefined }}>{value}</span>
        </div>
    );
}
