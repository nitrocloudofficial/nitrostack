'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Coins } from 'lucide-react';
import { palette, Panel, StatCard, SectionTitle, Badge, Loading, type Palette } from '../../components/ui';
import { formatINR, formatPct, formatDateTime } from '../../lib/format';
import type { CapitalGainsEstimate } from '../../lib/types';

export default function CapitalGainsWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<CapitalGainsEstimate>();

    if (!data || typeof data.capitalGain !== 'number') {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for gains estimate…' : 'Loading…'} />;
    }

    const gain = data.capitalGain >= 0;
    const gainTone = gain ? p.good : p.danger;

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: p.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={20} color={p.accent} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Capital Gains Estimate</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>
                        {data.scheme?.schemeName ?? data.fundType} · held {data.holdingMonths} months
                    </div>
                </div>
            </div>

            {/* Gain + classification */}
            <Panel p={p} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontSize: 12, color: p.textMuted }}>Capital gain</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: gainTone }}>{formatINR(data.capitalGain)}</div>
                        <div style={{ fontSize: 12, color: p.textMuted }}>{formatINR(data.investedAmount)} → {formatINR(data.currentValue)}</div>
                    </div>
                    <Badge color={p.accent} bg={p.accentSoft}>{data.gainType}</Badge>
                </div>
            </Panel>

            {/* Tax breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
                <StatCard p={p} label="Estimated tax" value={formatINR(data.totalTax)} tone="danger" sub={`${formatPct(data.effectiveTaxRate, 1)} of gain`} />
                <StatCard p={p} label="Net proceeds" value={formatINR(data.netProceeds)} tone="good" />
                <StatCard p={p} label="Headline rate" value={formatPct(data.headlineRate, 1)} />
            </div>

            <Panel p={p} style={{ marginBottom: 12 }}>
                <SectionTitle p={p}>Computation</SectionTitle>
                <Row p={p} label="Taxable gain" value={formatINR(data.taxableGain)} />
                {data.exemptionApplied > 0 && <Row p={p} label="LTCG exemption applied" value={`− ${formatINR(data.exemptionApplied)}`} />}
                <Row p={p} label={`Tax @ ${formatPct(data.headlineRate, 1)}`} value={formatINR(data.taxBeforeCess)} />
                <Row p={p} label="Health & Education cess (4%)" value={formatINR(data.cess)} />
                <Row p={p} label="Total tax" value={formatINR(data.totalTax)} bold />
            </Panel>

            <Panel p={p}>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{data.reasoning}</div>
                <div style={{ fontSize: 11.5, color: p.textMuted, marginTop: 8 }}>{data.note}</div>
            </Panel>

            {data.source && data.fetchedAt && (
                <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                    Valued from live {data.source} · fetched {formatDateTime(data.fetchedAt)}
                </div>
            )}
        </div>
    );
}

function Row({ p, label, value, bold }: { p: Palette; label: string; value: string; bold?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
            <span style={{ color: p.textMuted }}>{label}</span>
            <span style={{ fontWeight: bold ? 700 : 600, color: bold ? p.text : undefined }}>{value}</span>
        </div>
    );
}
