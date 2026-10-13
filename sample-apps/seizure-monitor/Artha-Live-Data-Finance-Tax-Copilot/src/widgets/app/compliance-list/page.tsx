'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { CalendarDays } from 'lucide-react';
import { palette, Badge, Loading } from '../../components/ui';
import { formatDate } from '../../lib/format';
import type { CalendarOutput, ComplianceEvent } from '../../lib/types';

const CATEGORY_TONE: Record<string, 'accent' | 'good' | 'warn'> = {
    ITR: 'accent',
    'Advance Tax': 'warn',
    Investment: 'good',
    Audit: 'warn',
    TDS: 'accent',
    GST: 'accent',
};

export default function ComplianceListWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<CalendarOutput>();

    if (!data || !Array.isArray(data.events)) {
        return <Loading isDark={isDark} label={isReady ? 'Waiting for calendar…' : 'Loading…'} />;
    }

    const toneColor = (cat: string) => {
        const t = CATEGORY_TONE[cat] ?? 'accent';
        return t === 'good' ? { c: p.good, b: p.goodSoft } : t === 'warn' ? { c: p.warn, b: p.warnSoft } : { c: p.accent, b: p.accentSoft };
    };

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <CalendarDays size={22} color={p.accent} />
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Compliance Calendar</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>{data.count} statutory dates</div>
                </div>
            </div>

            {data.events.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: p.textMuted }}>No events for this filter.</div>
            )}

            <div style={{ position: 'relative', paddingLeft: 8 }}>
                {data.events.map((e: ComplianceEvent, i) => {
                    const tone = toneColor(e.category);
                    return (
                        <div key={e.id} style={{ display: 'flex', gap: 12, paddingBottom: i < data.events.length - 1 ? 14 : 0 }}>
                            {/* Timeline dot + line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 999, background: tone.c, marginTop: 4 }} />
                                {i < data.events.length - 1 && <div style={{ flex: 1, width: 2, background: p.border, marginTop: 2 }} />}
                            </div>
                            <div style={{ flex: 1, background: p.surface, border: `1px solid ${p.border}`, borderRadius: 12, padding: '11px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{e.title}</div>
                                    <Badge color={tone.c} bg={tone.b}>{e.category}</Badge>
                                </div>
                                <div style={{ fontSize: 12, color: p.textMuted, marginTop: 3 }}>
                                    {formatDate(e.dueDate)} · {e.appliesTo}
                                </div>
                                <div style={{ fontSize: 12, color: p.textMuted, marginTop: 6, lineHeight: 1.45 }}>{e.description}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
