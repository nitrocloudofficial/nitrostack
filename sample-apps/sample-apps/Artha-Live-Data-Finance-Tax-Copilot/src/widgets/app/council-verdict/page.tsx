'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Scale, Receipt, TrendingUp, ShieldCheck, Trophy } from 'lucide-react';
import { palette, Panel, Badge, SectionTitle, Loading, type Palette } from '../../components/ui';
import type { CouncilResult, CouncilBreakdownRow } from '../../lib/types';

const AGENT_META: Record<string, { label: string; icon: React.ReactNode; tone: (p: Palette) => { c: string; b: string } }> = {
    tax_saver: { label: 'Tax lens', icon: <Receipt size={16} />, tone: (p) => ({ c: p.accent, b: p.accentSoft }) },
    growth: { label: 'Growth lens', icon: <TrendingUp size={16} />, tone: (p) => ({ c: p.good, b: p.goodSoft }) },
    safety: { label: 'Safety lens', icon: <ShieldCheck size={16} />, tone: (p) => ({ c: p.warn, b: p.warnSoft }) },
};

export default function CouncilVerdictWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<CouncilResult>();

    if (!data || !Array.isArray(data.breakdown)) {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for the council verdict…' : 'Loading…'} />;
    }

    const confidencePct = Math.round((data.confidence ?? 0) * 100);

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 320 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: p.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scale size={20} color={p.accent} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Council Verdict</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>{data.agreementLevel}</div>
                </div>
            </div>

            {/* Final recommendation */}
            <Panel p={p} style={{ marginBottom: 14, background: p.goodSoft, border: `1px solid ${p.good}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Trophy size={22} color={p.good} />
                    <div>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: p.textMuted }}>Final recommendation</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{data.finalLabel}</div>
                    </div>
                </div>
                {/* Confidence bar */}
                <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: p.textMuted, marginBottom: 5 }}>
                        <span>Confidence</span>
                        <span style={{ fontWeight: 700, color: p.good }}>{confidencePct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: isDark ? '#0a0a0a' : '#ffffff', overflow: 'hidden' }}>
                        <div style={{ width: `${confidencePct}%`, height: '100%', background: p.good, borderRadius: 999 }} />
                    </div>
                </div>
            </Panel>

            {/* The three lenses */}
            <SectionTitle p={p}>How the council voted</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
                {data.breakdown.map((row: CouncilBreakdownRow) => {
                    const meta = AGENT_META[row.agent] ?? AGENT_META.tax_saver;
                    const tone = meta.tone(p);
                    const isWinner = row.verdict === data.finalRecommendation;
                    return (
                        <div
                            key={row.agent}
                            style={{
                                background: p.surface,
                                border: `1.5px solid ${isWinner ? p.good : p.border}`,
                                borderRadius: 12,
                                padding: '12px 13px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tone.c, marginBottom: 8 }}>
                                {meta.icon}
                                <span style={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</span>
                                {isWinner && <span style={{ marginLeft: 'auto', fontSize: 10, color: p.good, fontWeight: 700 }}>▲</span>}
                            </div>
                            <Badge color={tone.c} bg={tone.b}>{row.verdictLabel}</Badge>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                                <div style={{ flex: 1, height: 6, borderRadius: 999, background: p.surfaceAlt, overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.max(0, Math.min(10, row.score)) * 10}%`, height: '100%', background: tone.c }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: tone.c }}>{row.score}</span>
                            </div>
                            {row.reasoning && (
                                <div style={{ fontSize: 11.5, color: p.textMuted, marginTop: 8, lineHeight: 1.45 }}>{row.reasoning}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Rationale */}
            <Panel p={p}>
                <SectionTitle p={p}>Reconciliation</SectionTitle>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{data.rationale}</div>
            </Panel>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Deterministic scoring across 3 lenses · not investment advice — consult a SEBI-registered adviser
            </div>
        </div>
    );
}
