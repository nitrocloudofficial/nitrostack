'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { TrendingUp, Landmark, Scale } from 'lucide-react';
import { palette, Panel, SectionTitle, Loading, type Palette } from '../../components/ui';
import { formatINR, formatPct } from '../../lib/format';
import type { EmiVsInvestmentResult } from '../../lib/types';

export default function EmiVsInvestmentWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<EmiVsInvestmentResult>();

    if (!data || typeof data.investFutureValue !== 'number') {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for comparison…' : 'Loading…'} />;
    }

    const investWins = data.recommendation === 'invest';
    const prepayWins = data.recommendation === 'prepay';
    const banner =
        investWins ? { c: p.good, b: p.goodSoft, text: 'Invest the surplus' } :
        prepayWins ? { c: p.warn, b: p.warnSoft, text: 'Prepay the loan' } :
        { c: p.accent, b: p.accentSoft, text: 'Roughly a wash' };

    const Card = ({ title, icon, value, rate, highlight }: { title: string; icon: React.ReactNode; value: number; rate: number; highlight: boolean }) => (
        <div style={{ flex: 1, background: p.surface, border: `1.5px solid ${highlight ? banner.c : p.border}`, borderRadius: 12, padding: '14px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: p.textMuted, fontSize: 12, marginBottom: 6 }}>{icon}{title}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: highlight ? banner.c : p.text }}>{formatINR(value)}</div>
            <div style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>@ {formatPct(rate, 1)} · {data.horizonYears}y</div>
        </div>
    );

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Scale size={20} color={p.accent} />
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>EMI vs Investment</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>{formatINR(data.amount)} over {data.horizonYears} years</div>
                </div>
            </div>

            <div style={{ background: banner.b, border: `1px solid ${banner.c}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: p.textMuted }}>Recommendation</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: banner.c }}>{banner.text}</div>
                {data.difference !== 0 && (
                    <div style={{ fontSize: 12, color: p.textMuted, marginTop: 2 }}>
                        edge of {formatINR(Math.abs(data.difference))} · spread {formatPct(data.spread, 1)}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <Card title="Invest" icon={<TrendingUp size={14} />} value={data.investFutureValue} rate={data.investReturn} highlight={investWins} />
                <Card title="Prepay" icon={<Landmark size={14} />} value={data.prepayFutureValue} rate={data.loanRate} highlight={prepayWins} />
            </div>

            <Panel p={p}>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{data.reasoning}</div>
                <div style={{ fontSize: 11.5, color: p.textMuted, marginTop: 8 }}>{data.note}</div>
            </Panel>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Compared against {data.comparedAgainst} · rates as of {data.asOf}
            </div>
        </div>
    );
}
