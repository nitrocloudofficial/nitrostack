'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { CalendarClock } from 'lucide-react';
import { palette, Badge, Loading, type Palette } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { DeadlinesOutput, UpcomingEvent } from '../../lib/types';

function urgency(days: number, p: Palette): { color: string; bg: string; label: string } {
    if (days <= 7) return { color: p.danger, bg: p.dangerSoft, label: days === 0 ? 'Due today' : `${days}d left` };
    if (days <= 30) return { color: p.warn, bg: p.warnSoft, label: `${days}d left` };
    return { color: p.good, bg: p.goodSoft, label: `${days}d left` };
}

export default function ComplianceCalendarWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<DeadlinesOutput>();

    if (!data || !Array.isArray(data.deadlines)) return <Loading isDark={isDark} label={isReady ? 'Waiting for deadline data…' : 'Loading…'} />;

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <CalendarClock size={22} color={p.accent} />
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Upcoming Deadlines</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>
                        {data.count} due · as of {formatDate(data.asOf)}
                    </div>
                </div>
            </div>

            {data.deadlines.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: p.textMuted }}>No deadlines in this window. 🎉</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.deadlines.map((e: UpcomingEvent) => {
                    const u = urgency(e.daysRemaining, p);
                    return (
                        <div
                            key={e.id}
                            style={{
                                background: p.surface,
                                border: `1px solid ${p.border}`,
                                borderLeft: `4px solid ${u.color}`,
                                borderRadius: 12,
                                padding: '12px 14px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{e.title}</div>
                                    <div style={{ fontSize: 12, color: p.textMuted, marginTop: 2 }}>
                                        {formatDate(e.dueDate)} · {e.appliesTo}
                                    </div>
                                </div>
                                <Badge color={u.color} bg={u.bg}>{u.label}</Badge>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                                <Badge color={p.textMuted} bg={p.surfaceAlt}>{e.category}</Badge>
                                <span style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.4 }}>{e.description}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
