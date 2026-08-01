'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Sparkles, CheckCircle2, Landmark, TrendingUp, CalendarClock } from 'lucide-react';
import { palette, Panel, StatCard, SectionTitle, Badge, Loading, type Palette } from '../../components/ui';
import { formatINR, formatPct, formatDate } from '../../lib/format';
import type { FinancePlan } from '../../lib/types';

export default function FinancePlanWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const plan = getToolOutput<FinancePlan>();

    if (!plan || !plan.tax || !plan.tax.recommendation) {
        return <Loading isDark={isDark} label={isReady ? 'Building your plan…' : 'Loading…'} />;
    }

    const rec = plan.tax.recommendation;
    const deadlines = plan.deadlines ?? [];
    const actionItems = plan.actionItems ?? [];

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 360 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: p.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={20} color={p.accent} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Your Finance Plan</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>
                        {plan.tax.financialYear} · gross {formatINR(plan.request.grossIncome)}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <Panel p={p} style={{ marginBottom: 14, background: p.accentSoft, border: `1px solid ${p.accent}` }}>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{plan.summary}</div>
            </Panel>

            {/* Top stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
                <StatCard
                    p={p}
                    label={`Best regime`}
                    value={rec.regime.toUpperCase()}
                    sub={rec.savesVsOther > 0 ? `saves ${formatINR(rec.savesVsOther)}` : 'simpler filing'}
                    tone="good"
                />
                <StatCard p={p} label="Tax payable" value={formatINR(rec.totalTax)} tone="accent" />
                <StatCard
                    p={p}
                    label="Old vs New"
                    value={`${formatINR(plan.tax.old.totalTax)} / ${formatINR(plan.tax.new.totalTax)}`}
                />
            </div>

            {/* Fund */}
            {plan.fund && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle p={p}><IconLabel icon={<TrendingUp size={13} />}>Mutual fund</IconLabel></SectionTitle>
                    {plan.fund.ok ? (
                        <Panel p={p}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{plan.fund.data.scheme.schemeName}</div>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                                <Metric p={p} label="Invested" value={formatINR(plan.fund.data.investedAmount)} />
                                <Metric p={p} label="Now worth" value={formatINR(plan.fund.data.currentValue)} tone={p.good} />
                                <Metric p={p} label="XIRR" value={formatPct(plan.fund.data.xirr)} tone={p.good} />
                                <Metric p={p} label="Absolute" value={formatPct(plan.fund.data.absoluteReturn)} />
                            </div>
                        </Panel>
                    ) : (
                        <Panel p={p}><span style={{ fontSize: 13, color: p.danger }}>{plan.fund.error}</span></Panel>
                    )}
                </div>
            )}

            {/* Bank */}
            {plan.bank && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle p={p}><IconLabel icon={<Landmark size={13} />}>Refund account</IconLabel></SectionTitle>
                    {plan.bank.ok ? (
                        <Panel p={p}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                <CheckCircle2 size={16} color={p.good} />
                                <span><strong>{plan.bank.data.bank}</strong> · {plan.bank.data.branch}, {plan.bank.data.city}</span>
                            </div>
                            <div style={{ fontSize: 12, color: p.textMuted, marginTop: 4, letterSpacing: 0.5 }}>IFSC {plan.bank.data.ifsc}</div>
                        </Panel>
                    ) : (
                        <Panel p={p}><span style={{ fontSize: 13, color: p.danger }}>{plan.bank.error}</span></Panel>
                    )}
                </div>
            )}

            {/* Deadlines */}
            {deadlines.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle p={p}><IconLabel icon={<CalendarClock size={13} />}>Upcoming deadlines</IconLabel></SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {deadlines.slice(0, 4).map((d) => {
                            const urgent = d.daysRemaining <= 7 ? p.danger : d.daysRemaining <= 30 ? p.warn : p.good;
                            const soft = d.daysRemaining <= 7 ? p.dangerSoft : d.daysRemaining <= 30 ? p.warnSoft : p.goodSoft;
                            return (
                                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: p.surface, border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                                        <div style={{ fontSize: 11, color: p.textMuted }}>{formatDate(d.dueDate)}</div>
                                    </div>
                                    <Badge color={urgent} bg={soft}>{d.daysRemaining === 0 ? 'today' : `${d.daysRemaining}d`}</Badge>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action items */}
            {actionItems.length > 0 && (
                <Panel p={p}>
                    <SectionTitle p={p}>Action items</SectionTitle>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                        {actionItems.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                </Panel>
            )}

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Generated {formatDate(plan.generatedAt.slice(0, 10))} · not investment/tax advice — consult a SEBI-registered adviser or CA
            </div>
        </div>
    );
}

function IconLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{icon}{children}</span>;
}

function Metric({ p, label, value, tone }: { p: Palette; label: string; value: string; tone?: string }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: p.textMuted }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: tone ?? p.text }}>{value}</div>
        </div>
    );
}
