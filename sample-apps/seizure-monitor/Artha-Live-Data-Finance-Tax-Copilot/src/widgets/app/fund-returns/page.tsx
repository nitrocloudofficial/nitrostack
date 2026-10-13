'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { palette, Panel, StatCard, SectionTitle, Loading } from '../../components/ui';
import { formatINR, formatPct, formatDate, formatDateTime } from '../../lib/format';
import type { FundReturns } from '../../lib/types';

export default function FundReturnsWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<FundReturns>();

    if (!data || !data.scheme) return <Loading isDark={isDark} label={isReady ? 'Waiting for fund data…' : 'Loading…'} />;

    const gain = data.absoluteGain >= 0;
    const tone = gain ? 'good' : 'danger';
    const TrendIcon = gain ? TrendingUp : TrendingDown;

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 320 }}>
            {/* Header */}
            <div style={{ marginBottom: 14 }}>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>📈 {data.scheme.schemeName}</h1>
                <div style={{ fontSize: 12, color: p.textMuted, marginTop: 2 }}>
                    {data.scheme.fundHouse}{data.scheme.category ? ` · ${data.scheme.category}` : ''}
                </div>
            </div>

            {/* Invested -> current */}
            <Panel p={p} style={{ marginBottom: 14, background: gain ? p.goodSoft : p.dangerSoft, border: `1px solid ${gain ? p.good : p.danger}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontSize: 12, color: p.textMuted }}>Invested {formatDate(data.investedDate)}</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{formatINR(data.investedAmount)}</div>
                    </div>
                    <div style={{ fontSize: 22, color: gain ? p.good : p.danger }}>→</div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: p.textMuted }}>Current value</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: gain ? p.good : p.danger }}>{formatINR(data.currentValue)}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, fontWeight: 600, color: gain ? p.good : p.danger }}>
                    <TrendIcon size={16} />
                    {gain ? '+' : ''}{formatINR(data.absoluteGain)} ({formatPct(data.absoluteReturn)})
                </div>
            </Panel>

            {/* Return metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 14 }}>
                <StatCard p={p} label="XIRR (annualized)" value={formatPct(data.xirr)} tone={tone} />
                <StatCard p={p} label="CAGR" value={formatPct(data.cagr)} tone={tone} />
                <StatCard p={p} label="Holding period" value={`${data.holdingYears} yrs`} />
            </div>

            {/* NAV detail */}
            <Panel p={p}>
                <SectionTitle p={p}>Details</SectionTitle>
                <Row p={p} label={`NAV on ${formatDate(data.navAtInvestmentDate)}`} value={`₹${data.navAtInvestment}`} />
                <Row p={p} label={`Latest NAV (${formatDate(data.latestNavDate)})`} value={`₹${data.latestNav}`} />
                <Row p={p} label="Units allotted" value={String(data.unitsAllotted)} />
                <Row p={p} label="Scheme code" value={String(data.scheme.schemeCode)} />
            </Panel>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Live via {data.source ?? 'MFAPI.in'}{data.fetchedAt ? ` · fetched ${formatDateTime(data.fetchedAt)}` : ''}
                <div>Past performance is not indicative of future returns</div>
            </div>
        </div>
    );
}

function Row({ p, label, value }: { p: ReturnType<typeof palette>; label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0' }}>
            <span style={{ color: p.textMuted }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
    );
}
