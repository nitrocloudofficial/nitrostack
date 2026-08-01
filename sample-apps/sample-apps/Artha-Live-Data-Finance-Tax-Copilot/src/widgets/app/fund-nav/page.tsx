'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { LineChart } from 'lucide-react';
import { palette, Panel, Loading } from '../../components/ui';
import { formatDate, formatDateTime } from '../../lib/format';
import type { FundNav } from '../../lib/types';

export default function FundNavWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<FundNav>();

    if (!data || typeof data.nav !== 'number') {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for NAV…' : 'Loading…'} />;
    }

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: p.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LineChart size={20} color={p.accent} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{data.schemeName}</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>
                        {data.fundHouse}{data.category ? ` · ${data.category}` : ''}
                    </div>
                </div>
            </div>

            <Panel p={p} style={{ textAlign: 'center', padding: '24px 18px' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: p.textMuted }}>Latest NAV</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: p.accent, margin: '6px 0 2px' }}>₹{data.nav}</div>
                <div style={{ fontSize: 12, color: p.textMuted }}>as of {formatDate(data.date)}</div>
            </Panel>

            <div style={{ fontSize: 12, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Scheme code {data.schemeCode} · live via {data.source ?? 'MFAPI.in'}
                {data.fetchedAt ? ` · fetched ${formatDateTime(data.fetchedAt)}` : ''}
            </div>
        </div>
    );
}
