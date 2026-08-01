'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

import {
    Chip,
    Disclaimer,
    Empty,
    Stat,
    hasFields,
    rupees,
    theme,
} from '../../lib/widget';

export const dynamic = 'force-dynamic';

/**
 * The affordability verdict.
 *
 * Colour comes first, deliberately. The verdict has to be legible without
 * reading anything, because reading fluency is not something this product
 * assumes. Only then do the numbers and the reasoning appear.
 *
 * Every figure here was computed by FinlyService, not written by a model — and
 * if a figure is missing, the widget says so rather than inventing a verdict.
 */

interface Data {
    verdict: 'affordable' | 'tight' | 'not_affordable';
    monthlyAmount: number;
    weakMonth: number;
    averageMonth: number;
    strongestMonth: number;
    swing: number;
    safeMonthlyAmount: number;
    shortfall: number;
    incomeStability: 'stable' | 'variable' | 'highly_variable';
    monthsObserved: number;
    essentials: number;
    reason: string;
    disclaimer: string;
}

const REQUIRED = ['verdict', 'monthlyAmount', 'weakMonth'];

const VERDICTS: Record<string, { label: string; colour: string; tint: string }> = {
    affordable: { label: 'Yes', colour: '#10b981', tint: '#ecfdf5' },
    tight: { label: 'Tight', colour: '#f59e0b', tint: '#fffbeb' },
    not_affordable: { label: 'Not yet', colour: '#f43f5e', tint: '#fff1f2' },
};

export default function AffordabilityWidget() {
    const { isReady, getToolOutput, theme: mode, sendFollowUpMessage } = useWidgetSDK();
    const data = getToolOutput<Data>();
    const dark = mode === 'dark';
    const t = theme(dark);

    // Checks for the fields it needs, not merely that something arrived. An
    // empty object is truthy, and that is what produced a screen of ₹NaN.
    if (!hasFields(data, REQUIRED)) {
        return <Empty isReady={isReady} dark={dark} expected={REQUIRED} />;
    }

    // No fallback verdict. An unrecognised value is a bug worth seeing, not
    // something to paper over with a colour.
    const v = VERDICTS[data!.verdict];
    if (!v) {
        return <Empty isReady={isReady} dark={dark} expected={REQUIRED} />;
    }

    const d = data!;

    return (
        <div style={{ background: t.card, borderRadius: 12, overflow: 'hidden', color: t.fg }}>
            <div style={{ height: 8, background: v.colour }} />

            <div style={{ padding: 20 }}>
                <span
                    style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: dark ? 'rgba(255,255,255,0.08)' : v.tint,
                        color: dark ? '#fff' : v.colour,
                        fontSize: 12,
                        fontWeight: 700,
                    }}
                >
                    {v.label}
                </span>

                <h2 style={{ margin: '12px 0 0', fontSize: 20, lineHeight: 1.3 }}>
                    {rupees(d.monthlyAmount)} a month
                </h2>

                {d.reason && (
                    <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.6 }}>
                        {d.reason}
                    </p>
                )}

                {/* The weak month against the average — the whole argument, in one row */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 10,
                        marginTop: 18,
                    }}
                >
                    <Stat
                        label="Weakest month"
                        value={rupees(d.weakMonth)}
                        hint="what this is judged against"
                        highlight={v.colour}
                        dark={dark}
                    />
                    <Stat label="Average month" value={rupees(d.averageMonth)} dark={dark} />
                    <Stat
                        label="Safe each month"
                        value={rupees(d.safeMonthlyAmount)}
                        dark={dark}
                    />
                    {Number(d.shortfall) > 0 && (
                        <Stat label="Short by" value={rupees(d.shortfall)} dark={dark} />
                    )}
                </div>

                {d.incomeStability && d.incomeStability !== 'stable' && (
                    <p style={{ marginTop: 14, fontSize: 13, color: t.muted }}>
                        Your income moves by about {rupees(d.swing)} between your best and
                        worst month
                        {Number.isFinite(Number(d.monthsObserved))
                            ? `, across ${d.monthsObserved} months`
                            : ''}
                        . That is why the weak month decides this, not the average.
                    </p>
                )}

                {/* Follow-ups go back through the host, so the conversation continues
                    in whatever language the user is using. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                    <Chip
                        dark={dark}
                        onClick={() =>
                            sendFollowUpMessage(
                                `What would it take for me to afford ${rupees(d.monthlyAmount)} a month?`,
                            )
                        }
                    >
                        When could I afford this?
                    </Chip>
                    <Chip dark={dark} onClick={() => sendFollowUpMessage('How do I build up my savings?')}>
                        How do I build this up?
                    </Chip>
                    <Chip
                        dark={dark}
                        onClick={() => sendFollowUpMessage('What if my income drops by 30% next month?')}
                    >
                        What if my income drops?
                    </Chip>
                </div>

                <Disclaimer text={d.disclaimer} dark={dark} />
            </div>
        </div>
    );
}
