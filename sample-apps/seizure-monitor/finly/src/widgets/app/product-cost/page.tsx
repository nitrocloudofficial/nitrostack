'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

import { Chip, Disclaimer, Empty, hasFields, rupees, theme } from '../../lib/widget';

export const dynamic = 'force-dynamic';

/**
 * What stopping a product early would cost.
 *
 * The two bars are the argument: what you paid in, against what you would get
 * back. That comparison is legible in one glance and needs no reading — which
 * matters, because this is the figure sellers are least likely to volunteer and
 * buyers least likely to ask for.
 *
 * Both numbers come from the user's own paperwork. Nothing is looked up, so
 * nothing is guessed.
 */

interface Data {
    year: number;
    paidInByThen: number;
    surrenderValue: number;
    loss: number;
    lossPercent: number;
    note: string;
    yearlyPayment: number;
    questionsBeforeSigning: string[];
    disclaimer: string;
}

const REQUIRED = ['paidInByThen', 'surrenderValue', 'loss'];

export default function ProductCostWidget() {
    const { isReady, getToolOutput, theme: mode, sendFollowUpMessage } = useWidgetSDK();
    const data = getToolOutput<Data>();
    const dark = mode === 'dark';
    const t = theme(dark);

    if (!hasFields(data, REQUIRED)) {
        return <Empty isReady={isReady} dark={dark} expected={REQUIRED} />;
    }

    const d = data!;
    const paid = Number(d.paidInByThen) || 0;
    const back = Number(d.surrenderValue) || 0;
    const pct = Number(d.lossPercent) || 0;

    const colour = pct >= 60 ? '#f43f5e' : pct >= 25 ? '#f59e0b' : '#10b981';
    const backPct = paid > 0 ? (back / paid) * 100 : 0;

    return (
        <div style={{ background: t.card, borderRadius: 12, overflow: 'hidden', color: t.fg }}>
            <div style={{ height: 8, background: colour }} />

            <div style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: t.muted }}>
                    If you stopped paying after year {d.year ?? '—'}
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color: colour }}>
                    You would lose {rupees(d.loss)}
                </h2>
                <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>
                    {pct}% of everything you had paid in
                </div>

                {/* Two bars: paid in, versus returned. The comparison is the message. */}
                <div style={{ marginTop: 18 }}>
                    <Bar
                        label="You would have paid in"
                        value={rupees(paid)}
                        pct={100}
                        colour={dark ? '#64748b' : '#94a3b8'}
                        dark={dark}
                    />
                    <Bar
                        label="You would get back"
                        value={rupees(back)}
                        pct={backPct}
                        colour={colour}
                        dark={dark}
                    />
                </div>

                {d.note && (
                    <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.6 }}>{d.note}</p>
                )}

                {Array.isArray(d.questionsBeforeSigning) && d.questionsBeforeSigning.length > 0 && (
                    <details style={{ marginTop: 16, background: t.panel, borderRadius: 8, padding: 14 }}>
                        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            Ask these before you sign
                        </summary>
                        <ul
                            style={{
                                margin: '10px 0 0',
                                paddingLeft: 18,
                                fontSize: 13,
                                lineHeight: 1.7,
                                color: t.fg,
                            }}
                        >
                            {d.questionsBeforeSigning.map((q) => (
                                <li key={q}>{q}</li>
                            ))}
                        </ul>
                    </details>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                    <Chip dark={dark} onClick={() => sendFollowUpMessage('What is surrender value?')}>
                        What is surrender value?
                    </Chip>
                    {Number.isFinite(Number(d.yearlyPayment)) && (
                        <Chip
                            dark={dark}
                            onClick={() =>
                                sendFollowUpMessage(
                                    `Can I afford ${rupees(Number(d.yearlyPayment) / 12)} a month?`,
                                )
                            }
                        >
                            Can I afford this at all?
                        </Chip>
                    )}
                    <Chip
                        dark={dark}
                        onClick={() =>
                            sendFollowUpMessage('How do the main types of financial product differ?')
                        }
                    >
                        How do these products differ?
                    </Chip>
                </div>

                <Disclaimer text={d.disclaimer} dark={dark} />
            </div>
        </div>
    );
}

function Bar({
    label,
    value,
    pct,
    colour,
    dark,
}: {
    label: string;
    value: string;
    pct: number;
    colour: string;
    dark: boolean;
}) {
    const t = theme(dark);
    return (
        <div style={{ marginBottom: 12 }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 4,
                }}
            >
                <span style={{ color: t.muted }}>{label}</span>
                <strong style={{ color: t.fg }}>{value}</strong>
            </div>
            <div style={{ height: 14, background: t.line, borderRadius: 4, overflow: 'hidden' }}>
                <div
                    style={{
                        width: `${Math.max(1, Math.min(100, pct))}%`,
                        height: '100%',
                        background: colour,
                        transition: 'width 300ms',
                    }}
                />
            </div>
        </div>
    );
}
