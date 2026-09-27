'use client';

import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared visual language for the InstantPulse dashboards.
 *
 * Underscore-prefixed so Next's app router treats it as a private folder rather
 * than a route. Colours are resolved from a theme flag rather than CSS media
 * queries because the widget host tells us the theme directly.
 */

export type Band = 'GREEN' | 'YELLOW' | 'RED';

export interface Palette {
  bg: string;
  panel: string;
  panelAlt: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
  green: string;
  yellow: string;
  red: string;
  blue: string;
}

export function palette(isDark: boolean): Palette {
  return isDark
    ? {
        bg: '#0f1116',
        panel: '#171a21',
        panelAlt: '#1e222b',
        border: '#2a2f3a',
        text: '#e8eaed',
        muted: '#9aa3b2',
        faint: '#6b7383',
        green: '#3fb950',
        yellow: '#d29922',
        red: '#f85149',
        blue: '#58a6ff',
      }
    : {
        bg: '#ffffff',
        panel: '#f7f8fa',
        panelAlt: '#eef0f4',
        border: '#dfe3e9',
        text: '#14171c',
        muted: '#5b6472',
        faint: '#868e9c',
        green: '#1a7f37',
        yellow: '#9a6700',
        red: '#cf222e',
        blue: '#0969da',
      };
}

export function bandColor(band: Band | string | undefined, p: Palette): string {
  if (band === 'GREEN') return p.green;
  if (band === 'YELLOW') return p.yellow;
  if (band === 'RED') return p.red;
  return p.muted;
}

export function bandLabel(band: Band | string | undefined): string {
  if (band === 'GREEN') return 'Ready to proceed';
  if (band === 'YELLOW') return 'Human review required';
  if (band === 'RED') return 'High risk or missing information';
  return 'Not yet scored';
}

export function money(n: number | undefined | null, compact = false): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  if (compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(Math.abs(n) >= 10_000 ? 0 : 1)}k`;
  }
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function pct(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return '—';
  return `${Math.round(n * 100)}%`;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function Panel({
  p,
  children,
  style,
}: {
  p: Palette;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: p.panel,
        border: `1px solid ${p.border}`,
        borderRadius: 12,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ p, children }: { p: Palette; children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: p.faint,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

export function Stat({
  p,
  label,
  value,
  sub,
  tone,
}: {
  p: Palette;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: p.faint, marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 650,
          color: tone ?? p.text,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: p.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Pill({ p, color, children }: { p: Palette; color: string; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: `${color}1f`,
        border: `1px solid ${color}55`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function Empty({ p, message }: { p: Palette; message: string }) {
  return (
    <div
      style={{
        padding: 28,
        textAlign: 'center',
        color: p.muted,
        fontSize: 13,
        background: p.panel,
        border: `1px dashed ${p.border}`,
        borderRadius: 12,
      }}
    >
      {message}
    </div>
  );
}

/** Semicircular score gauge. Colour tracks the band, not the number. */
export function ScoreGauge({
  score,
  band,
  p,
  size = 168,
}: {
  score: number;
  band: string;
  p: Palette;
  size?: number;
}) {
  const color = bandColor(band, p);
  const radius = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const filled = (clamped / 100) * circumference;

  const arc = (r: number) => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <svg
      width={size}
      height={size / 2 + 26}
      viewBox={`0 0 ${size} ${size / 2 + 26}`}
      role="img"
      aria-label={`Risk score ${clamped} out of 100, band ${band}`}
    >
      <path d={arc(radius)} fill="none" stroke={p.panelAlt} strokeWidth={12} strokeLinecap="round" />
      <path
        d={arc(radius)}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill={p.text}
        fontSize={34}
        fontWeight={700}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {clamped}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={p.faint} fontSize={11}>
        out of 100
      </text>
    </svg>
  );
}
