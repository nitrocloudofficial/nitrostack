'use client';

import React from 'react';

/**
 * Shared visual language for the gateway widgets.
 *
 * Direction: a customs/inspection slip. These widgets document goods passing a
 * checkpoint, so they borrow that vernacular — pale stock, hairline rules,
 * monospace data fields, uppercase micro-labels, and a pressed verdict stamp.
 * Figures, SKUs, hashes and addresses are all monospace so columns align and a
 * tampered digit is visible at a glance.
 */

export const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
export const SANS =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export interface Tokens {
  stock: string;
  card: string;
  ink: string;
  inkSoft: string;
  rule: string;
  ruleSoft: string;
  clear: string;
  hold: string;
  danger: string;
  clearWash: string;
  holdWash: string;
  dangerWash: string;
}

export function tokens(isDark: boolean): Tokens {
  return isDark
    ? {
        stock: '#12151A',
        card: '#181C23',
        ink: '#E8EBF0',
        inkSoft: '#96A0AF',
        rule: '#2B313B',
        ruleSoft: '#212730',
        clear: '#57B586',
        hold: '#D6A247',
        danger: '#E4736A',
        clearWash: 'rgba(87,181,134,0.12)',
        holdWash: 'rgba(214,162,71,0.12)',
        dangerWash: 'rgba(228,115,106,0.12)',
      }
    : {
        stock: '#EDF0F4',
        card: '#FFFFFF',
        ink: '#1A1F2B',
        inkSoft: '#5D6779',
        rule: '#C7CEDA',
        ruleSoft: '#E1E5EC',
        clear: '#1F6F4A',
        hold: '#8F5D0C',
        danger: '#B3261E',
        clearWash: 'rgba(31,111,74,0.08)',
        holdWash: 'rgba(143,93,12,0.08)',
        dangerWash: 'rgba(179,38,30,0.08)',
      };
}

/** Verdict / status -> stamp colour. */
export function toneFor(t: Tokens, value: string): string {
  const v = value.toLowerCase();
  if (['approve', 'approved', 'ok', 'pass', 'low-risk', 'verified', 'clear'].includes(v)) return t.clear;
  if (['hold', 'held', 'warn', 'elevated', 'pending', 'review'].includes(v)) return t.hold;
  return t.danger;
}

/** Tiny uppercase field label, as printed on a declaration form. */
export function Micro({
  children,
  t,
  style,
}: {
  children: React.ReactNode;
  t: Tokens;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: t.inkSoft,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The signature element: a verdict pressed onto the document. */
export function Stamp({ label, tone, t }: { label: string; tone: string; t: Tokens }) {
  return (
    <div
      style={{
        transform: 'rotate(-3deg)',
        border: `2px solid ${tone}`,
        boxShadow: `0 0 0 1px ${t.card}, 0 0 0 3px ${tone}`,
        color: tone,
        padding: '5px 12px 4px',
        fontFamily: MONO,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1.1,
        flexShrink: 0,
      }}
    >
      {label}
    </div>
  );
}

/** Perforated reference strip that heads every document. */
export function RefStrip({
  t,
  left,
  right,
}: {
  t: Tokens;
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 16px',
        borderBottom: `1px dashed ${t.rule}`,
        background: t.stock,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.08em', color: t.ink }}>
        {left}
      </div>
      {right ? (
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', color: t.inkSoft }}>
          {right}
        </div>
      ) : null}
    </div>
  );
}

/** Segmented instrument readout — reads as a gauge, not a progress bar. */
export function TickMeter({
  value,
  max,
  tone,
  t,
  segments = 25,
}: {
  value: number;
  max: number;
  tone: string;
  t: Tokens;
  segments?: number;
}) {
  const filled = Math.round((Math.max(0, Math.min(value, max)) / max) * segments);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: i % 5 === 0 ? 14 : 10,
            background: i < filled ? tone : t.ruleSoft,
          }}
        />
      ))}
    </div>
  );
}

/** Label/value row in the form-field grid. */
export function Field({
  label,
  value,
  t,
  mono = true,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  t: Tokens;
  mono?: boolean;
  tone?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <Micro t={t}>{label}</Micro>
      <div
        style={{
          fontFamily: mono ? MONO : SANS,
          fontSize: 13,
          color: tone ?? t.ink,
          wordBreak: 'break-word',
          lineHeight: 1.35,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function Section({
  title,
  t,
  children,
  note,
}: {
  title: string;
  t: Tokens;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <section style={{ borderTop: `1px solid ${t.rule}`, padding: '14px 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Micro t={t}>{title}</Micro>
        {note ? (
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: t.inkSoft }}>{note}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Document shell shared by all three widgets. */
export function Slip({
  t,
  children,
  maxWidth = 560,
}: {
  t: Tokens;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        background: t.stock,
        padding: 12,
        fontFamily: SANS,
        color: t.ink,
        minHeight: '100%',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .gw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
        .gw-diff { display: grid; grid-template-columns: 1fr 30px 1fr; align-items: center; gap: 0; }
        .gw-diff-stack { display: none; }
        .gw-cell-label { display: none; }
        button:focus-visible, [tabindex]:focus-visible {
          outline: 2px solid currentColor; outline-offset: 2px;
        }
        @media (max-width: 430px) {
          .gw-grid-2 { grid-template-columns: 1fr; }
          .gw-diff { grid-template-columns: 1fr; }
          .gw-diff-gutter { display: none; }
          .gw-diff-stack { display: block; }
          .gw-cell-label { display: block; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
      <article
        style={{
          maxWidth,
          margin: '0 auto',
          background: t.card,
          border: `1px solid ${t.rule}`,
          boxShadow: '0 1px 2px rgba(16,22,34,0.08), 0 8px 24px -12px rgba(16,22,34,0.25)',
        }}
      >
        {children}
      </article>
    </div>
  );
}

export function Empty({ t, message }: { t: Tokens; message: string }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 12,
        color: t.inkSoft,
        padding: 24,
        textAlign: 'center',
        background: t.stock,
        letterSpacing: '0.06em',
      }}
    >
      {message}
    </div>
  );
}
