'use client';

/**
 * Shared UI kit for every Auditor Zero widget.
 * One design system — palette, cards, badges, tables, skeletons, empty states —
 * so all widget pages read as a single product. Inline styles only: widget pages
 * are bundled standalone by `nitrostack-cli build` (esbuild -> one HTML file),
 * so there is no global stylesheet to rely on.
 */

import React from 'react';
import { useTheme } from '@nitrostack/widgets';
import type { Severity } from '../lib/types';

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export interface Palette {
  isDark: boolean;
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  text: string;
  sub: string;
  faint: string;
  accent: string;
  accentSoft: string;
  green: string;
  greenBg: string;
  red: string;
  redBg: string;
  amber: string;
  amberBg: string;
  blue: string;
  blueBg: string;
}

export function usePalette(): Palette {
  const theme = useTheme();
  const isDark = theme === 'dark';
  return {
    isDark,
    bg: isDark ? '#0b0e14' : '#f6f7f9',
    panel: isDark ? '#12161f' : '#ffffff',
    panel2: isDark ? '#0e131c' : '#f9fafb',
    border: isDark ? '#232b39' : '#e5e7eb',
    text: isDark ? '#e7ebf2' : '#0f172a',
    sub: isDark ? '#97a3b4' : '#566072',
    faint: isDark ? '#5d6a7b' : '#93a0b2',
    accent: isDark ? '#818cf8' : '#4f46e5',
    accentSoft: isDark ? '#1e2140' : '#eef2ff',
    green: isDark ? '#34d399' : '#15803d',
    greenBg: isDark ? '#0c2c22' : '#dcfce7',
    red: isDark ? '#f87171' : '#b91c1c',
    redBg: isDark ? '#331616' : '#fee2e2',
    amber: isDark ? '#fbbf24' : '#b45309',
    amberBg: isDark ? '#33250c' : '#fef3c7',
    blue: isDark ? '#60a5fa' : '#1d4ed8',
    blueBg: isDark ? '#12233d' : '#dbeafe',
  };
}

/**
 * Severity fills from the validated status palette (critical/warning/good).
 * Medium gets dark text — white on amber fails contrast.
 */
export const SEVERITY_SOLID: Record<Severity, string> = {
  high: '#d03b3b',
  medium: '#fab219',
  low: '#0ca30c',
};
export const SEVERITY_INK: Record<Severity, string> = {
  high: '#ffffff',
  medium: '#231a02',
  low: '#ffffff',
};

export const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// ---------------------------------------------------------------------------
// Payload unwrapping — callTool / getToolOutput may return the object directly,
// an MCP content envelope, or { result }.
// ---------------------------------------------------------------------------

export function unwrap<T = any>(res: any): T {
  if (res == null) return res;
  if (typeof res === 'string') {
    try { return JSON.parse(res); } catch { return res as any; }
  }
  if (Array.isArray(res?.content)) {
    const text = res.content.filter((c: any) => c?.type === 'text').map((c: any) => c.text).join('\n');
    try { return JSON.parse(text); } catch { return text as any; }
  }
  if (res?.structuredContent) return res.structuredContent as T;
  if (res?.result !== undefined) return unwrap<T>(res.result);
  return res as T;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export const shortId = (id?: string | null) => (id ? id.slice(0, 8) : '—');
export const shortHash = (h?: string | null) =>
  !h ? '—' : h === 'GENESIS' ? 'GENESIS' : h.slice(0, 12) + '…';

export function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function fmtAgo(iso?: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function summarize(v: unknown, max = 110): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (!s) return '—';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ---------------------------------------------------------------------------
// Shell — the outer frame every widget renders inside
// ---------------------------------------------------------------------------

const KEYFRAMES = `
@keyframes az-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
@keyframes az-spin { to { transform: rotate(360deg); } }
@keyframes az-fade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
@keyframes az-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001s !important; transition-duration: 0.001s !important; }
}
`;

export function Shell({ children, maxWidth = 680 }: { children: React.ReactNode; maxWidth?: number }) {
  const c = usePalette();
  return (
    <div style={{ fontFamily: FONT, background: c.bg, color: c.text, padding: 18, borderRadius: 14, maxWidth, animation: 'az-fade .25s ease' }}>
      <style>{KEYFRAMES}</style>
      {children}
    </div>
  );
}

export function Footer({ text = 'Auditor Zero — every finding sealed in a tamper-proof, HMAC-keyed decision ledger' }: { text?: string }) {
  const c = usePalette();
  return <div style={{ fontSize: 11, color: c.faint, textAlign: 'center', marginTop: 12 }}>{text}</div>;
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  const c = usePalette();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 750, letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: c.faint, fontFamily: MONO, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const c = usePalette();
  return (
    <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, ...style }}>
      {children}
    </div>
  );
}

export function Chip({ bg, color, children, title }: { bg: string; color: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Chip bg={SEVERITY_SOLID[severity]} color={SEVERITY_INK[severity]}>{severity.toUpperCase()}</Chip>;
}

export function StatusBadge({ status }: { status: string }) {
  const c = usePalette();
  const map: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
    complete: { bg: c.greenBg, fg: c.green, dot: c.green, label: 'Complete' },
    running: { bg: c.blueBg, fg: c.blue, dot: c.blue, label: 'Running' },
    pending: { bg: c.panel2, fg: c.sub, dot: c.faint, label: 'Pending' },
    failed: { bg: c.redBg, fg: c.red, dot: c.red, label: 'Failed' },
  };
  const s = map[status] ?? { bg: c.panel2, fg: c.sub, dot: c.faint, label: status };
  return (
    <Chip bg={s.bg} color={s.fg}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, animation: status === 'running' ? 'az-pulse 1.2s ease infinite' : undefined }} />
      {s.label}
    </Chip>
  );
}

export function StatTile({ label, value, color, hint }: { label: string; value: React.ReactNode; color?: string; hint?: string }) {
  const c = usePalette();
  return (
    <div title={hint} style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: c.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 750, color: color ?? c.text, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function StatGrid({ children, cols }: { children: React.ReactNode; cols?: number }) {
  const n = cols ?? React.Children.count(children);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${n >= 4 ? 110 : 130}px, 1fr))`, gap: 10, marginBottom: 16 }}>
      {children}
    </div>
  );
}

type BtnKind = 'primary' | 'ghost' | 'danger' | 'success';
export function Btn({ kind = 'ghost', onClick, disabled, children, small, active }: {
  kind?: BtnKind; onClick?: () => void; disabled?: boolean; children: React.ReactNode; small?: boolean; active?: boolean;
}) {
  const c = usePalette();
  const base: React.CSSProperties = {
    padding: small ? '5px 11px' : '9px 15px',
    borderRadius: small ? 8 : 10,
    cursor: disabled ? 'default' : 'pointer',
    fontWeight: 700,
    fontSize: small ? 12 : 13,
    fontFamily: FONT,
    border: `1px solid transparent`,
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity .15s ease',
  };
  const kinds: Record<BtnKind, React.CSSProperties> = {
    primary: { background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', border: 'none' },
    success: { background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none' },
    danger: { background: 'transparent', color: '#ef4444', border: '1px solid #ef4444' },
    ghost: {
      background: active ? c.accent : 'transparent',
      color: active ? '#fff' : c.text,
      border: `1px solid ${active ? c.accent : c.border}`,
    },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind] }}>
      {children}
    </button>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  const c = usePalette();
  return (
    <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 999, border: `2px solid ${c.border}`, borderTopColor: c.accent, animation: 'az-spin .8s linear infinite', verticalAlign: 'middle' }} />
  );
}

export function ProgressBar({ done, total, color }: { done: number; total: number; color?: string }) {
  const c = usePalette();
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div>
      <div style={{ height: 8, borderRadius: 999, background: c.panel2, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color ?? 'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius: 999, transition: 'width .4s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: c.faint, marginTop: 4 }}>{done} / {total} steps · {pct}%</div>
    </div>
  );
}

export function HashChip({ hash, broken }: { hash: string; broken?: boolean }) {
  const c = usePalette();
  return (
    <span style={{ fontSize: 11, color: broken ? '#ef4444' : c.faint, fontFamily: MONO, fontWeight: broken ? 700 : 400 }} title={hash}>
      {shortHash(hash)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeletons / empty / error states
// ---------------------------------------------------------------------------

export function Skeleton({ height = 14, width = '100%', style }: { height?: number; width?: number | string; style?: React.CSSProperties }) {
  const c = usePalette();
  const base = c.isDark ? '#1a2130' : '#e9edf2';
  const hi = c.isDark ? '#232b3d' : '#f6f8fa';
  return (
    <div style={{
      height, width, borderRadius: 8,
      background: `linear-gradient(90deg, ${base} 25%, ${hi} 50%, ${base} 75%)`,
      backgroundSize: '800px 100%',
      animation: 'az-shimmer 1.4s linear infinite',
      ...style,
    }} />
  );
}

export function LoadingCard({ lines = 3, label }: { lines?: number; label?: string }) {
  const c = usePalette();
  return (
    <Shell>
      {label && <div style={{ fontSize: 12.5, color: c.sub, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Spinner /> {label}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton height={22} width="45%" />
        {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} height={52} />)}
      </div>
    </Shell>
  );
}

export function EmptyState({ icon = '📄', title, body, action }: { icon?: string; title: string; body?: string; action?: React.ReactNode }) {
  const c = usePalette();
  return (
    <div style={{ textAlign: 'center', padding: '34px 20px', border: `1px dashed ${c.border}`, borderRadius: 12, background: c.panel2 }}>
      <div style={{ fontSize: 30, marginBottom: 8 }} aria-hidden>{icon}</div>
      <div style={{ fontSize: 14.5, fontWeight: 750 }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: c.sub, marginTop: 5, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>{body}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Banner({ tone, children }: { tone: 'good' | 'bad' | 'warn' | 'info'; children: React.ReactNode }) {
  const c = usePalette();
  const map = {
    good: { bg: c.greenBg, fg: c.green },
    bad: { bg: c.redBg, fg: c.red },
    warn: { bg: c.amberBg, fg: c.amber },
    info: { bg: c.accentSoft, fg: c.accent },
  } as const;
  const t = map[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, marginBottom: 14, fontWeight: 700, fontSize: 13, background: t.bg, color: t.fg }}>
      {children}
    </div>
  );
}

export function ErrorBanner({ title, detail, hint }: { title: string; detail?: string; hint?: string }) {
  const c = usePalette();
  return (
    <div>
      <div style={{ padding: '12px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: c.redBg, color: c.red }}>
        ✕ {title}
      </div>
      {detail && <div style={{ fontSize: 12.5, color: c.sub, marginTop: 10, wordBreak: 'break-word' }}>{String(detail).slice(0, 500)}</div>}
      {hint && <div style={{ fontSize: 12, color: c.faint, marginTop: 8 }}>{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search + table
// ---------------------------------------------------------------------------

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const c = usePalette();
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Search…'}
      aria-label={placeholder ?? 'Search'}
      style={{
        flex: 1, minWidth: 140, padding: '8px 12px', borderRadius: 10, fontSize: 13, fontFamily: FONT,
        border: `1px solid ${c.border}`, background: c.panel, color: c.text, outline: 'none',
      }}
    />
  );
}

export function Th({ children, onClick, active, dir, align }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: 'asc' | 'desc'; align?: 'left' | 'right';
}) {
  const c = usePalette();
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: align ?? 'left', padding: '9px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
        textTransform: 'uppercase', color: active ? c.accent : c.faint, cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none', whiteSpace: 'nowrap', borderBottom: `1px solid ${c.border}`,
      }}
    >
      {children}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

export function Td({ children, mono, align, colSpan }: { children: React.ReactNode; mono?: boolean; align?: 'left' | 'right'; colSpan?: number }) {
  const c = usePalette();
  return (
    <td colSpan={colSpan} style={{ padding: '10px 12px', fontSize: 12.5, textAlign: align ?? 'left', fontFamily: mono ? MONO : FONT, color: c.text, borderBottom: `1px solid ${c.border}`, verticalAlign: 'middle' }}>
      {children}
    </td>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${c.border}`, borderRadius: 12, background: c.panel }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 460 }}>{children}</table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON viewer (for evidence / ledger payloads)
// ---------------------------------------------------------------------------

export function JsonView({ value, maxHeight = 180 }: { value: unknown; maxHeight?: number }) {
  const c = usePalette();
  let text: string;
  try { text = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
  catch { text = String(value); }
  return (
    <pre style={{
      margin: 0, padding: '10px 12px', borderRadius: 10, fontSize: 11.5, fontFamily: MONO, lineHeight: 1.55,
      background: c.panel2, border: `1px solid ${c.border}`, color: c.sub,
      overflow: 'auto', maxHeight, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>{text}</pre>
  );
}
