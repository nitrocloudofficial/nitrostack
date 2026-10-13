'use client';

/**
 * Shared widget kit for the Enterprise Agentic Bridge admin surface.
 *
 * Every widget renders inside a host iframe (NitroStudio, ChatGPT, or the MCP
 * Apps runtime) that controls its own theme, so styling is scoped here and
 * driven by a single `data-bridge-theme` attribute rather than a global
 * stylesheet we do not control.
 *
 * `useBridgeTool` is the important piece: it seeds state from the tool output
 * the host injected, then lets a widget call MCP tools back through the Widget
 * SDK and fold the response into the same state. That round trip is what turns
 * a passive result card into an actual control panel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/* ------------------------------------------------------------------ *
 * Tokens
 * ------------------------------------------------------------------ */

export const CSS = `
.bx {
  --bx-bg: #ffffff;
  --bx-panel: #f7f8fa;
  --bx-panel-2: #eef0f4;
  --bx-line: #dfe3ea;
  --bx-line-strong: #c6ccd8;
  --bx-fg: #10141c;
  --bx-fg-mute: #5b6474;
  --bx-fg-faint: #8b94a5;
  --bx-accent: #0f7d8c;
  --bx-accent-bg: #e2f4f6;
  --bx-warn: #a1610a;
  --bx-warn-bg: #fdf1dc;
  --bx-danger: #a52c40;
  --bx-danger-bg: #fce9ec;
  --bx-ok: #17694f;
  --bx-ok-bg: #e2f4ec;
  --bx-radius: 10px;
  --bx-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --bx-sans: system-ui, -apple-system, "Segoe UI", Inter, sans-serif;

  font-family: var(--bx-sans);
  color: var(--bx-fg);
  background: var(--bx-bg);
  border-radius: var(--bx-radius);
  container-type: inline-size;
  font-size: 13.5px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.bx[data-bridge-theme="dark"] {
  --bx-bg: #0d1017;
  --bx-panel: #141922;
  --bx-panel-2: #1b212c;
  --bx-line: #262d3a;
  --bx-line-strong: #38414f;
  --bx-fg: #e8ecf3;
  --bx-fg-mute: #98a2b3;
  --bx-fg-faint: #6b7688;
  --bx-accent: #4fd1c5;
  --bx-accent-bg: #10302f;
  --bx-warn: #e8b558;
  --bx-warn-bg: #33280f;
  --bx-danger: #f28b9b;
  --bx-danger-bg: #351a20;
  --bx-ok: #5fd3a4;
  --bx-ok-bg: #102c22;
}

.bx *, .bx *::before, .bx *::after { box-sizing: border-box; }
.bx h1,.bx h2,.bx h3,.bx h4,.bx p,.bx ul,.bx ol,.bx figure { margin: 0; }
.bx ul, .bx ol { padding-left: 1.15em; }
.bx code, .bx pre { font-family: var(--bx-mono); font-size: 12px; }

.bx-shell { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

/* header */
.bx-head { display: flex; align-items: flex-start; gap: 12px; justify-content: space-between; flex-wrap: wrap; }
.bx-head-l { display: flex; align-items: center; gap: 10px; min-width: 0; }
.bx-mark {
  width: 30px; height: 30px; flex: none; border-radius: 8px;
  background: var(--bx-accent-bg); color: var(--bx-accent);
  display: grid; place-items: center; font-size: 15px;
  border: 1px solid color-mix(in srgb, var(--bx-accent) 30%, transparent);
}
.bx-title { font-size: 14.5px; font-weight: 650; letter-spacing: -0.01em; }
.bx-sub { font-size: 11.5px; color: var(--bx-fg-mute); margin-top: 1px; }

/* surfaces */
.bx-card {
  background: var(--bx-panel); border: 1px solid var(--bx-line);
  border-radius: var(--bx-radius); padding: 13px;
}
.bx-card-tight { padding: 10px 12px; }
.bx-card-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
.bx-card-t { font-size: 11px; font-weight: 650; letter-spacing: .07em; text-transform: uppercase; color: var(--bx-fg-mute); }

.bx-grid { display: grid; gap: 10px; }
.bx-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
.bx-stat { background: var(--bx-panel); border: 1px solid var(--bx-line); border-radius: 8px; padding: 9px 10px; }
.bx-stat-v { font-size: 19px; font-weight: 660; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.bx-stat-l { font-size: 10.5px; color: var(--bx-fg-mute); text-transform: uppercase; letter-spacing: .05em; margin-top: 1px; }

/* badges */
.bx-badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px;
  border-radius: 999px; font-size: 10.5px; font-weight: 600; white-space: nowrap;
  border: 1px solid transparent; letter-spacing: .02em;
}
.bx-badge[data-tone="neutral"] { background: var(--bx-panel-2); color: var(--bx-fg-mute); border-color: var(--bx-line); }
.bx-badge[data-tone="accent"]  { background: var(--bx-accent-bg); color: var(--bx-accent); }
.bx-badge[data-tone="ok"]      { background: var(--bx-ok-bg); color: var(--bx-ok); }
.bx-badge[data-tone="warn"]    { background: var(--bx-warn-bg); color: var(--bx-warn); }
.bx-badge[data-tone="danger"]  { background: var(--bx-danger-bg); color: var(--bx-danger); }

/* buttons */
.bx-btn {
  appearance: none; border: 1px solid var(--bx-line-strong); background: var(--bx-panel-2);
  color: var(--bx-fg); border-radius: 8px; padding: 7px 12px; font-size: 12.5px;
  font-weight: 560; cursor: pointer; font-family: inherit;
  transition: background .12s ease, border-color .12s ease, transform .08s ease;
}
.bx-btn:hover:not(:disabled) { border-color: var(--bx-accent); }
.bx-btn:active:not(:disabled) { transform: translateY(1px); }
.bx-btn:disabled { opacity: .5; cursor: not-allowed; }
.bx-btn[data-variant="primary"] {
  background: var(--bx-accent); border-color: var(--bx-accent);
  color: #04191c;
}
.bx[data-bridge-theme="light"] .bx-btn[data-variant="primary"] { color: #ffffff; }
.bx-btn[data-variant="ghost"] { background: transparent; border-color: var(--bx-line); color: var(--bx-fg-mute); }
.bx-btn[data-size="sm"] { padding: 4px 9px; font-size: 11.5px; }
.bx-btn-row { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }

/* inputs */
.bx-input, .bx-textarea, .bx-select {
  width: 100%; background: var(--bx-bg); color: var(--bx-fg);
  border: 1px solid var(--bx-line-strong); border-radius: 8px;
  padding: 7px 9px; font-size: 12.5px; font-family: inherit;
}
.bx-textarea { font-family: var(--bx-mono); font-size: 11.5px; resize: vertical; min-height: 76px; }
.bx-input:focus, .bx-textarea:focus, .bx-select:focus { outline: 2px solid var(--bx-accent); outline-offset: -1px; }
.bx-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--bx-fg-mute); font-weight: 600; display: block; margin-bottom: 4px; }
.bx-field { margin-bottom: 9px; }

/* code */
.bx-pre {
  background: var(--bx-bg); border: 1px solid var(--bx-line); border-radius: 8px;
  padding: 10px; overflow-x: auto; white-space: pre; max-height: 320px; overflow-y: auto;
  color: var(--bx-fg-mute); line-height: 1.55;
}
.bx-scroll { overflow-x: auto; }

/* lists */
.bx-list { display: flex; flex-direction: column; gap: 7px; }
.bx-item {
  display: flex; align-items: flex-start; gap: 9px; padding: 9px 10px;
  background: var(--bx-bg); border: 1px solid var(--bx-line); border-radius: 8px;
}
.bx-item-main { min-width: 0; flex: 1; }
.bx-item-t { font-size: 12.5px; font-weight: 580; word-break: break-word; }
.bx-item-d { font-size: 11.5px; color: var(--bx-fg-mute); margin-top: 2px; word-break: break-word; }

.bx-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; margin-top: 6px; }
.bx-dot[data-tone="ok"] { background: var(--bx-ok); }
.bx-dot[data-tone="warn"] { background: var(--bx-warn); }
.bx-dot[data-tone="danger"] { background: var(--bx-danger); }
.bx-dot[data-tone="neutral"] { background: var(--bx-fg-faint); }
.bx-dot[data-tone="accent"] { background: var(--bx-accent); }

/* meter */
.bx-meter { height: 5px; background: var(--bx-panel-2); border-radius: 999px; overflow: hidden; }
.bx-meter > i { display: block; height: 100%; border-radius: 999px; background: var(--bx-accent); transition: width .3s ease; }
.bx-meter[data-tone="danger"] > i { background: var(--bx-danger); }
.bx-meter[data-tone="warn"] > i { background: var(--bx-warn); }
.bx-meter[data-tone="ok"] > i { background: var(--bx-ok); }

/* split */
.bx-split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@container (max-width: 560px) { .bx-split { grid-template-columns: 1fr; } }

.bx-empty { text-align: center; padding: 26px 14px; color: var(--bx-fg-mute); font-size: 12.5px; }
.bx-empty-i { font-size: 22px; opacity: .55; margin-bottom: 7px; }

.bx-note {
  font-size: 11.5px; color: var(--bx-fg-mute); padding: 8px 10px;
  border-left: 2px solid var(--bx-line-strong); background: var(--bx-panel);
  border-radius: 0 6px 6px 0;
}
.bx-note[data-tone="warn"] { border-left-color: var(--bx-warn); background: var(--bx-warn-bg); color: var(--bx-warn); }
.bx-note[data-tone="danger"] { border-left-color: var(--bx-danger); background: var(--bx-danger-bg); color: var(--bx-danger); }
.bx-note[data-tone="ok"] { border-left-color: var(--bx-ok); background: var(--bx-ok-bg); color: var(--bx-ok); }

.bx-kv { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; font-size: 11.5px; }
.bx-kv dt { color: var(--bx-fg-mute); }
.bx-kv dd { margin: 0; font-family: var(--bx-mono); font-size: 11px; word-break: break-all; }

.bx-swatch { width: 100%; height: 26px; border-radius: 5px; border: 1px solid var(--bx-line); }

.bx-spin { display: inline-block; width: 11px; height: 11px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: bx-rot .6s linear infinite; }
@keyframes bx-rot { to { transform: rotate(360deg); } }
`;

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';

/* ------------------------------------------------------------------ *
 * Tool plumbing
 * ------------------------------------------------------------------ */

/** Unwrap whatever shape the host handed back from a callTool round trip. */
function unwrap<T>(response: { result?: string; structuredContent?: unknown }): T | null {
  if (response.structuredContent) return response.structuredContent as T;
  if (typeof response.result === 'string') {
    const trimmed = response.result.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export interface BridgeTool<T> {
  data: T | null;
  busy: string | null;
  error: string | null;
  /** Call an MCP tool and merge its structured result into local state. */
  run: (name: string, args?: Record<string, unknown>) => Promise<T | null>;
  /** Patch local state without a round trip (optimistic UI). */
  patch: (next: Partial<T>) => void;
  clearError: () => void;
  ready: boolean;
}

export function useBridgeTool<T extends object>(): BridgeTool<T> {
  const { getToolOutput, callTool, toolOutput, isReady } = useWidgetSDK();
  const [override, setOverride] = useState<T | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset the override whenever the host pushes a fresh tool result, otherwise
  // a stale local response would mask the new output.
  useEffect(() => {
    setOverride(null);
  }, [toolOutput]);

  const hostData = useMemo(() => getToolOutput<T>(), [getToolOutput, toolOutput]);
  const data = override ?? hostData;

  const run = useCallback(
    async (name: string, args: Record<string, unknown> = {}) => {
      setBusy(name);
      setError(null);
      try {
        const response = await callTool(name, args);
        if (response.isError) {
          setError(response.result || `${name} failed.`);
          return null;
        }
        const next = unwrap<T>(response);
        if (next) setOverride(next);
        return next;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setBusy(null);
      }
    },
    [callTool]
  );

  const patch = useCallback((next: Partial<T>) => {
    setOverride((prev) => ({ ...(prev ?? ({} as T)), ...next }) as T);
  }, []);

  return { data, busy, error, run, patch, clearError: () => setError(null), ready: isReady };
}

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export function Shell({
  icon,
  title,
  subtitle,
  actions,
  error,
  onDismissError,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  error?: string | null;
  onDismissError?: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <div className="bx" data-bridge-theme={theme === 'dark' ? 'dark' : 'light'}>
      {/* Safe: CSS is a module-level constant authored here. No user, tool or
          network input ever reaches this string, so there is no injection path.
          A <style> tag is used instead of a global stylesheet because each
          widget renders in a host-controlled iframe we do not own. */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bx-shell">
        <header className="bx-head">
          <div className="bx-head-l">
            <div className="bx-mark" aria-hidden>{icon}</div>
            <div style={{ minWidth: 0 }}>
              <div className="bx-title">{title}</div>
              {subtitle ? <div className="bx-sub">{subtitle}</div> : null}
            </div>
          </div>
          {actions ? <div className="bx-btn-row">{actions}</div> : null}
        </header>

        {error ? (
          <div className="bx-note" data-tone="danger" role="alert">
            <strong>Tool call failed.</strong> {error}
            {onDismissError ? (
              <>
                {' '}
                <button className="bx-btn" data-size="sm" data-variant="ghost" onClick={onDismissError}>
                  Dismiss
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}

export function Card({
  title,
  aside,
  tight,
  children,
  style,
}: {
  title?: string;
  aside?: ReactNode;
  tight?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section className={`bx-card${tight ? ' bx-card-tight' : ''}`} style={style}>
      {title || aside ? (
        <div className="bx-card-h">
          {title ? <h3 className="bx-card-t">{title}</h3> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="bx-badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function Button({
  onClick,
  disabled,
  loading,
  variant,
  size,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  size?: 'sm';
  children: ReactNode;
}) {
  return (
    <button
      className="bx-btn"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="bx-spin" style={{ marginRight: 6 }} /> : null}
      {children}
    </button>
  );
}

export function Stats({ items }: { items: { label: string; value: ReactNode; tone?: Tone }[] }) {
  return (
    <div className="bx-stats">
      {items.map((item) => (
        <div className="bx-stat" key={item.label}>
          <div
            className="bx-stat-v"
            style={item.tone && item.tone !== 'neutral' ? { color: `var(--bx-${toneVar(item.tone)})` } : undefined}
          >
            {item.value}
          </div>
          <div className="bx-stat-l">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function toneVar(tone: Tone): string {
  return tone === 'ok' ? 'ok' : tone === 'warn' ? 'warn' : tone === 'danger' ? 'danger' : 'accent';
}

export function Meter({ value, tone = 'accent' }: { value: number; tone?: Tone }) {
  return (
    <div className="bx-meter" data-tone={tone}>
      <i style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Empty({ icon, title, hint }: { icon: string; title: string; hint?: ReactNode }) {
  return (
    <div className="bx-empty">
      <div className="bx-empty-i">{icon}</div>
      <div style={{ fontWeight: 580, color: 'var(--bx-fg)' }}>{title}</div>
      {hint ? <div style={{ marginTop: 5 }}>{hint}</div> : null}
    </div>
  );
}

export function Note({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className="bx-note" data-tone={tone}>
      {children}
    </div>
  );
}

export function Pre({ children }: { children: ReactNode }) {
  return <pre className="bx-pre">{children}</pre>;
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="bx" data-bridge-theme="dark">
      {/* Safe: CSS is a module-level constant authored here. No user, tool or
          network input ever reaches this string, so there is no injection path.
          A <style> tag is used instead of a global stylesheet because each
          widget renders in a host-controlled iframe we do not own. */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bx-shell">
        <Empty icon="◌" title={label} hint="Waiting for tool output from the host." />
      </div>
    </div>
  );
}
