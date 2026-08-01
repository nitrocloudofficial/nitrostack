'use client';

import React from 'react';

/** Theme palette derived from the host light/dark mode. */
export function palette(isDark: boolean) {
    return {
        bg: isDark ? '#0a0a0a' : '#f6f7f9',
        surface: isDark ? '#161616' : '#ffffff',
        surfaceAlt: isDark ? '#1e1e1e' : '#f3f4f6',
        border: isDark ? '#2a2a2a' : '#e5e7eb',
        text: isDark ? '#f5f5f5' : '#111827',
        textMuted: isDark ? '#9ca3af' : '#6b7280',
        accent: '#2563eb',
        accentSoft: isDark ? 'rgba(37,99,235,0.18)' : '#eff6ff',
        good: '#10b981',
        goodSoft: isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5',
        warn: '#f59e0b',
        warnSoft: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb',
        danger: '#ef4444',
        dangerSoft: isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2',
    };
}

export type Palette = ReturnType<typeof palette>;

export function Panel({
    p,
    children,
    style,
}: {
    p: Palette;
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <div
            style={{
                background: p.surface,
                border: `1px solid ${p.border}`,
                borderRadius: 14,
                padding: 18,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export function StatCard({
    p,
    label,
    value,
    sub,
    tone = 'default',
}: {
    p: Palette;
    label: string;
    value: string;
    sub?: string;
    tone?: 'default' | 'good' | 'warn' | 'danger' | 'accent';
}) {
    const toneColor =
        tone === 'good' ? p.good :
        tone === 'warn' ? p.warn :
        tone === 'danger' ? p.danger :
        tone === 'accent' ? p.accent :
        p.text;
    return (
        <div
            style={{
                background: p.surface,
                border: `1px solid ${p.border}`,
                borderRadius: 14,
                padding: '14px 16px',
                minWidth: 0,
            }}
        >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: p.textMuted, marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: toneColor, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: p.textMuted, marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

export function Badge({
    children,
    color,
    bg,
}: {
    children: React.ReactNode;
    color: string;
    bg: string;
}) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color,
                background: bg,
            }}
        >
            {children}
        </span>
    );
}

export function SectionTitle({ p, children }: { p: Palette; children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: p.textMuted,
                margin: '4px 0 10px',
            }}
        >
            {children}
        </div>
    );
}

export function Loading({ isDark, label }: { isDark: boolean; label: string }) {
    const p = palette(isDark);
    return (
        <div style={{ padding: 40, textAlign: 'center', color: p.textMuted, background: p.bg, minHeight: 200 }}>
            {label}
        </div>
    );
}
