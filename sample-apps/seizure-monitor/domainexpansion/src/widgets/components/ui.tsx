'use client';

import React from 'react';

/**
 * Shared visual language for all four widgets: dark, high-contrast,
 * security-tool aesthetic. Deliberately NOT theme-reactive (light/dark) —
 * a fixed dark palette is the intended look here, the same way most real
 * security dashboards (SIEMs, log viewers) default to dark regardless of
 * host chrome theme.
 */
export const palette = {
  bg: '#0a0e14',
  panel: '#11161d',
  panelAlt: '#161c25',
  border: '#232b36',
  borderStrong: '#333e4d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  textFaint: '#5b6472',
  accent: '#58a6ff',
  severity: {
    CRITICAL: '#f85149',
    HIGH: '#ffa657',
    MEDIUM: '#d29922',
    LOW: '#8b949e',
  } as Record<string, string>,
  shadow: '#e3b341',
  success: '#3fb950',
  mono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
};

export function SeverityPill({ severity }: { severity: string }) {
  const color = palette.severity[severity] ?? palette.textMuted;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: palette.bg,
        background: color,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {severity}
    </span>
  );
}

export function ShadowChip() {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        color: palette.shadow,
        border: `1px solid ${palette.shadow}`,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      SHADOW
    </span>
  );
}

export function StatTile({
  label,
  value,
  accent,
  caption,
  captionColor,
}: {
  label: string;
  value: string | number;
  accent?: string;
  /** Small line under the label — used for e.g. "call failed, retrying" so a failure never looks identical to a real 0. */
  caption?: string;
  captionColor?: string;
}) {
  return (
    <div
      style={{
        background: palette.panel,
        border: `1px solid ${caption ? palette.severity.HIGH : palette.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        flex: '1 1 120px',
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? palette.text, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      {caption && (
        <div style={{ fontSize: 10, color: captionColor ?? palette.severity.HIGH, marginTop: 3 }}>{caption}</div>
      )}
    </div>
  );
}

export function ErrorBanner({ message, nextAction }: { message: string; nextAction?: string }) {
  return (
    <div
      style={{
        background: '#2d1214',
        border: `1px solid ${palette.severity.CRITICAL}`,
        borderRadius: 8,
        padding: '14px 16px',
        color: palette.text,
        margin: 16,
      }}
    >
      <div style={{ fontWeight: 700, color: palette.severity.CRITICAL, marginBottom: 4 }}>Not available</div>
      <div style={{ fontSize: 13 }}>{message}</div>
      {nextAction && <div style={{ fontSize: 12, color: palette.textMuted, marginTop: 6 }}>Next: {nextAction}</div>}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: palette.textMuted, fontSize: 13 }}>{label}</div>
  );
}

export function statusColor(status: number): string {
  if (status >= 500) return palette.severity.CRITICAL;
  if (status >= 400) return palette.severity.HIGH;
  if (status >= 300) return palette.severity.MEDIUM;
  return palette.success;
}

/**
 * Renders a neutralise()-wrapped field as literal, inert text — never via
 * dangerouslySetInnerHTML. React already escapes string children by default,
 * so the "<untrusted field=...>" markup the engine produced is visibly
 * printed as text, not interpreted as HTML. That's the actual security
 * property: even a payload that evaded every pattern still reads on screen
 * as quarantined data, not as a live tag.
 */
export function UntrustedField({ value }: { value: string | null }) {
  if (value === null) return <span style={{ color: palette.textFaint }}>—</span>;
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: palette.mono,
        fontSize: 11,
        color: palette.shadow,
        background: '#1a1408',
        border: `1px dashed ${palette.shadow}`,
        borderRadius: 4,
        padding: '2px 6px',
        maxWidth: '100%',
        overflowWrap: 'anywhere',
      }}
    >
      {value}
    </div>
  );
}

export function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: palette.bg, color: palette.text, minHeight: 200, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {children}
    </div>
  );
}
