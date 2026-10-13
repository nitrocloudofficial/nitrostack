'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

import {
    Chip,
    Disclaimer,
    Empty,
    daysInWords,
    hasFields,
    rupees,
    theme,
} from '../../lib/widget';

export const dynamic = 'force-dynamic';

/**
 * Runway, and how far the income swings.
 *
 * Runway is shown in days rather than as a ratio, because days are something a
 * person can act on. The swing bar exists to make variation visible: a single
 * average figure hides the exact thing that decides whether a fixed payment is
 * survivable.
 */

interface Data {
    runwayDays: number;
    weakMonth: number;
    averageMonth: number;
    strongestMonth: number;
    swing: number;
    incomeStability: 'stable' | 'variable' | 'highly_variable';
    monthsObserved: number;
    savings: number;
    essentials: number;
    emergencyFundTarget: number;
    stillNeeded: number;
    bufferMonths: number;
    safeMonthlyAmount: number;
    disclaimer: string;
}

const REQUIRED = ['runwayDays', 'weakMonth', 'emergencyFundTarget'];

export default function MoneyPositionWidget() {
    const { isReady, getToolOutput, theme: mode, sendFollowUpMessage } = useWidgetSDK();
    const data = getToolOutput<Data>();
    const dark = mode === 'dark';
    const t = theme(dark);

    if (!hasFields(data, REQUIRED)) {
        return <Empty isReady={isReady} dark={dark} expected={REQUIRED} />;
    }

    const d = data!;
    const days = Number(d.runwayDays) || 0;

    // Measured against 90 days, the point at which a household stops being one
    // bad month from trouble.
    const pct = Math.min(100, (days / 90) * 100);
    const colour = days >= 60 ? '#10b981' : days >= 30 ? '#f59e0b' : '#f43f5e';

    const target = Number(d.emergencyFundTarget) || 0;
    const saved = Number(d.savings) || 0;
    const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

    return (
        <div style={{ background: t.card, borderRadius: 12, overflow: 'hidden', color: t.fg }}>
            <div style={{ height: 8, background: colour }} />

            <div style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: t.muted }}>Essentials covered</div>
                <h2 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700 }}>
                    {daysInWords(days)}
                </h2>
                <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>
                    {days} days without any income
                </div>

                <div
                    style={{
                        height: 8,
                        background: t.line,
                        borderRadius: 999,
                        marginTop: 14,
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ width: `${pct}%`, height: '100%', background: colour }} />
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        color: t.muted,
                        marginTop: 4,
                    }}
                >
                    <span>0</span>
                    <span>30 days</span>
                    <span>90 days</span>
                </div>

                {/* Income swing — the point of the whole product */}
                {d.incomeStability && d.incomeStability !== 'stable' && (
                    <div style={{ background: t.panel, borderRadius: 8, padding: 14, marginTop: 18 }}>
                        <div style={{ fontSize: 12, color: t.muted }}>
                            Your income between worst and best month
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                            <strong style={{ fontSize: 16 }}>{rupees(d.weakMonth)}</strong>
                            <span style={{ flex: 1, height: 2, background: t.line }} />
                            <strong style={{ fontSize: 16 }}>{rupees(d.strongestMonth)}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: t.muted, marginTop: 6 }}>
                            A swing of {rupees(d.swing)}, so plans are built on{' '}
                            {rupees(d.weakMonth)} — not the average of {rupees(d.averageMonth)}.
                        </div>
                    </div>
                )}

                <div style={{ background: t.panel, borderRadius: 8, padding: 14, marginTop: 12 }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            color: t.muted,
                        }}
                    >
                        <span>Aim for {d.bufferMonths ?? 3} months of essentials</span>
                        <span>{rupees(target)}</span>
                    </div>
                    <div
                        style={{
                            height: 6,
                            background: t.line,
                            borderRadius: 999,
                            marginTop: 8,
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ width: `${progress}%`, height: '100%', background: '#10b981' }} />
                    </div>
                    <div style={{ fontSize: 12, marginTop: 8, color: t.fg }}>
                        {Number(d.stillNeeded) > 0
                            ? `${rupees(saved)} saved · ${rupees(d.stillNeeded)} still needed`
                            : `${rupees(saved)} saved — target reached`}
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                    <Chip dark={dark} onClick={() => sendFollowUpMessage('How do I build up my savings?')}>
                        How do I build this up?
                    </Chip>
                    <Chip
                        dark={dark}
                        onClick={() => sendFollowUpMessage('What if my income drops by 30% next month?')}
                    >
                        What if my income drops?
                    </Chip>
                    <Chip
                        dark={dark}
                        onClick={() =>
                            sendFollowUpMessage(`Can I afford ${rupees(d.safeMonthlyAmount)} a month?`)
                        }
                    >
                        Can I afford a monthly payment?
                    </Chip>
                </div>

                <Disclaimer text={d.disclaimer} dark={dark} />
            </div>
        </div>
    );
}
