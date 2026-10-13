'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Percent, Landmark } from 'lucide-react';
import { palette, Panel, SectionTitle, Loading, type Palette } from '../../components/ui';
import { formatPct, formatDateTime } from '../../lib/format';
import type { BenchmarkRates } from '../../lib/types';

export default function BenchmarkRatesWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<BenchmarkRates>();

    if (!data || typeof data.repoRate !== 'number' || !Array.isArray(data.fdRates)) {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for rates…' : 'Loading…'} />;
    }

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Percent size={22} color={p.accent} />
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Benchmark Rates</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>as of {data.asOf}</div>
                </div>
            </div>

            {/* Repo rate + equity assumption */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <Panel p={p} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: p.textMuted }}>RBI Repo Rate</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: p.accent }}>{formatPct(data.repoRate, 2)}</div>
                </Panel>
                <Panel p={p} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: p.textMuted }}>Equity (assumed)</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: p.good }}>{formatPct(data.equityAssumption, 1)}</div>
                </Panel>
            </div>

            {/* FD table */}
            <SectionTitle p={p}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Landmark size={13} /> Fixed deposit rates</span></SectionTitle>
            <Panel p={p} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', fontSize: 11, color: p.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingBottom: 6, borderBottom: `1px solid ${p.border}` }}>
                    <span style={{ flex: 1 }}>Tenure</span>
                    <span style={{ width: 80, textAlign: 'right' }}>General</span>
                    <span style={{ width: 80, textAlign: 'right' }}>Senior</span>
                </div>
                {data.fdRates.map((b) => (
                    <div key={b.tenure} style={{ display: 'flex', fontSize: 13, padding: '7px 0', borderBottom: `1px solid ${p.border}` }}>
                        <span style={{ flex: 1 }}>{b.tenure}</span>
                        <span style={{ width: 80, textAlign: 'right', fontWeight: 600 }}>{formatPct(b.general, 2)}</span>
                        <span style={{ width: 80, textAlign: 'right', fontWeight: 600, color: p.good }}>{formatPct(b.senior, 2)}</span>
                    </div>
                ))}
            </Panel>

            <div style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
                {data.disclaimer}
                <div style={{ marginTop: 4 }}>Checked {formatDateTime(data.fetchedAt)}.</div>
            </div>
        </div>
    );
}
