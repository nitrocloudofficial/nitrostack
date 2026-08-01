'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

import { Chip, Disclaimer, Empty, hasFields, rupees, theme } from '../../lib/widget';

export const dynamic = 'force-dynamic';

/**
 * An ordered plan for a life change.
 *
 * The numbering is the content. Each step protects the one after it, so the
 * sequence carries more value than the amounts — which is why this renders as a
 * numbered spine rather than a checklist.
 */

interface Step {
    order: number;
    title: string;
    why: string;
    targetAmount: number | null;
}

interface Data {
    event: string;
    title: string;
    bufferMonths: number;
    incomeStability: 'stable' | 'variable' | 'highly_variable';
    steps: Step[];
    disclaimer: string;
}

const REQUIRED = ['title', 'steps'];

export default function RoadmapWidget() {
    const { isReady, getToolOutput, theme: mode, sendFollowUpMessage } = useWidgetSDK();
    const data = getToolOutput<Data>();
    const dark = mode === 'dark';
    const t = theme(dark);

    if (!hasFields(data, REQUIRED) || !Array.isArray(data!.steps) || data!.steps.length === 0) {
        return <Empty isReady={isReady} dark={dark} expected={REQUIRED} />;
    }

    const d = data!;
    const accent = '#0f172a';

    return (
        <div style={{ background: t.card, borderRadius: 12, overflow: 'hidden', color: t.fg }}>
            <div style={{ height: 8, background: '#10b981' }} />

            <div style={{ padding: 20 }}>
                <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.3 }}>
                    The order I would do things in for {d.title}
                </h2>
                <p style={{ margin: '8px 0 0', fontSize: 14, color: t.muted, lineHeight: 1.6 }}>
                    The order matters more than the amounts. Each step protects the one after
                    it, so doing them out of sequence is what usually goes wrong.
                </p>

                {d.incomeStability && d.incomeStability !== 'stable' && (
                    <p style={{ margin: '10px 0 0', fontSize: 13, color: t.muted }}>
                        Your income varies, so the buffer is set at {d.bufferMonths ?? 6} months
                        rather than the usual three.
                    </p>
                )}

                <ol style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
                    {d.steps.map((step, i) => (
                        <li key={step.order ?? i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                            {/* Connecting spine, so the sequence reads as a sequence */}
                            {i < d.steps.length - 1 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 13,
                                        top: 28,
                                        bottom: -4,
                                        width: 2,
                                        background: t.line,
                                    }}
                                />
                            )}
                            <span
                                style={{
                                    flexShrink: 0,
                                    width: 28,
                                    height: 28,
                                    borderRadius: 999,
                                    background: dark ? '#f8fafc' : accent,
                                    color: dark ? accent : '#fff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1,
                                }}
                            >
                                {step.order ?? i + 1}
                            </span>
                            <div style={{ paddingBottom: 18 }}>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>{step.title}</div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: t.muted,
                                        marginTop: 3,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {step.why}
                                </div>
                                {step.targetAmount ? (
                                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>
                                        Target {rupees(step.targetAmount)}
                                    </div>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ol>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Chip dark={dark} onClick={() => sendFollowUpMessage('How do I build up my savings?')}>
                        How do I build this up?
                    </Chip>
                    <Chip
                        dark={dark}
                        onClick={() => sendFollowUpMessage('What should I ask before signing anything?')}
                    >
                        What should I ask before signing?
                    </Chip>
                </div>

                <Disclaimer text={d.disclaimer} dark={dark} />
            </div>
        </div>
    );
}
