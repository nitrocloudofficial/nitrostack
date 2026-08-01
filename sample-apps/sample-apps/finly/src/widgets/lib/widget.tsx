'use client';

/**
 * Shared widget pieces.
 *
 * Exists because of a real bug: every widget guarded its data with `if (!data)`,
 * and an empty object is truthy. So a widget rendered with `{}` sailed past the
 * guard and printed ₹NaN in every field, while a `?? VERDICTS.tight` fallback
 * labelled the missing verdict "Tight" — a widget confidently showing a verdict
 * it did not have.
 *
 * The rules that stops it happening again:
 *
 *   1. `hasFields` checks for the fields actually needed, not for truthiness.
 *   2. `rupees` renders a dash for anything not finite, so a missing number
 *      looks missing rather than looking like a calculation.
 */

import type { ReactNode } from 'react';

export const DASH = '—';

/** Money, in Indian digit grouping. Never renders NaN. */
export function rupees(value: unknown): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return DASH;
    return '₹' + Math.round(n).toLocaleString('en-IN');
}

/** Days as a person would say them. */
export function daysInWords(value: unknown): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return DASH;
    const days = Math.max(0, Math.round(n));
    if (days === 0) return 'no days';
    if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
    if (days < 60) return `about ${Math.round(days / 7)} weeks`;
    return `about ${Math.round(days / 30)} months`;
}

/** True only when every named field is actually present. */
export function hasFields(data: unknown, fields: string[]): boolean {
    if (!data || typeof data !== 'object') return false;
    const record = data as Record<string, unknown>;
    return fields.every((f) => record[f] !== undefined && record[f] !== null);
}

export function theme(dark: boolean) {
    return {
        fg: dark ? '#f8fafc' : '#0f172a',
        muted: dark ? '#94a3b8' : '#64748b',
        card: dark ? '#111827' : '#ffffff',
        panel: dark ? '#1f2937' : '#f8fafc',
        line: dark ? '#334155' : '#e2e8f0',
    };
}

/**
 * What to show when the tool output has not arrived, or does not carry the
 * fields this widget needs. Says which fields are missing rather than pretending
 * to have an answer.
 */
export function Empty({
    isReady,
    dark,
    expected,
}: {
    isReady: boolean;
    dark: boolean;
    expected: string[];
}) {
    const t = theme(dark);
    return (
        <div
            style={{
                background: t.card,
                borderRadius: 12,
                padding: 24,
                color: t.fg,
                textAlign: 'center',
            }}
        >
            <p style={{ margin: 0, fontSize: 15 }}>
                {isReady ? 'No figures to show yet.' : 'Loading…'}
            </p>
            {isReady && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: t.muted }}>
                    Run the tool to see a result. This widget needs:{' '}
                    {expected.join(', ')}.
                </p>
            )}
        </div>
    );
}

export function Stat({
    label,
    value,
    hint,
    highlight,
    dark,
}: {
    label: string;
    value: string;
    hint?: string;
    highlight?: string;
    dark: boolean;
}) {
    const t = theme(dark);
    return (
        <div
            style={{
                background: t.panel,
                borderRadius: 8,
                padding: 12,
                borderLeft: highlight ? `3px solid ${highlight}` : undefined,
            }}
        >
            <div style={{ fontSize: 11, color: t.muted }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: t.fg }}>
                {value}
            </div>
            {hint && <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>{hint}</div>}
        </div>
    );
}

export function Chip({
    children,
    onClick,
    dark,
}: {
    children: ReactNode;
    onClick: () => void;
    dark: boolean;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
                background: 'transparent',
                color: dark ? '#e2e8f0' : '#0f172a',
                fontSize: 12,
                cursor: 'pointer',
            }}
        >
            {children}
        </button>
    );
}

export function Disclaimer({ text, dark }: { text?: string; dark: boolean }) {
    const t = theme(dark);
    return (
        <p style={{ marginTop: 18, fontSize: 11, color: t.muted }}>
            {text || 'Educational information only. This is not regulated financial advice.'}
        </p>
    );
}
