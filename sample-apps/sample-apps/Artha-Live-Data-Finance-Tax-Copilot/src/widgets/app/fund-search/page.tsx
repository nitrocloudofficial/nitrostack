'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Search, ChevronRight } from 'lucide-react';
import { palette, Loading } from '../../components/ui';
import type { FundSearchOutput } from '../../lib/types';

export default function FundSearchWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput, callTool } = useWidgetSDK();
    const data = getToolOutput<FundSearchOutput>();
    const [busy, setBusy] = useState<number | null>(null);

    if (!data || !Array.isArray(data.results)) {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for search results…' : 'Loading…'} />;
    }

    const openNav = async (schemeCode: number) => {
        setBusy(schemeCode);
        try {
            await callTool('get_fund_nav', { schemeCode });
        } catch {
            /* host surfaces the error */
        } finally {
            setBusy(null);
        }
    };

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Search size={20} color={p.accent} />
                <div>
                    <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Fund search</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>
                        {data.count} match{data.count === 1 ? '' : 'es'} for “{data.query}”
                    </div>
                </div>
            </div>

            {data.results.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: p.textMuted }}>No schemes found. Try a different name.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.results.map((r) => (
                    <button
                        key={r.schemeCode}
                        onClick={() => openNav(r.schemeCode)}
                        disabled={busy !== null}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                            textAlign: 'left', cursor: 'pointer',
                            background: p.surface, border: `1px solid ${p.border}`, borderRadius: 10,
                            padding: '11px 13px', color: p.text,
                            opacity: busy !== null && busy !== r.schemeCode ? 0.5 : 1,
                        }}
                    >
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.schemeName}</div>
                            <div style={{ fontSize: 11, color: p.textMuted }}>Scheme code {r.schemeCode}</div>
                        </div>
                        <span style={{ fontSize: 11, color: p.accent, display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                            {busy === r.schemeCode ? 'Loading…' : <>NAV <ChevronRight size={14} /></>}
                        </span>
                    </button>
                ))}
            </div>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Tap a scheme to fetch its latest NAV · data via MFAPI.in
            </div>
        </div>
    );
}
