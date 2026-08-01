'use client';

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export interface ToolEnvelope<T> {
  ok: boolean;
  correlation_id: string;
  data: T;
  warnings?: Array<{ code: string; message: string }>;
  policy_gate?: {
    status: string;
    evaluation_session_id?: string;
    violations?: unknown[];
  };
}

interface WidgetShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  status?: string;
  freshness?: string;
  variant?: 'default' | 'dashboard';
  children: ReactNode;
}

export function useWidgetData<T>(fallback: ToolEnvelope<T>): ToolEnvelope<T> {
  const { getToolOutput } = useWidgetSDK();
  return projectWidgetData(
    getToolOutput<ToolEnvelope<T & { widget?: T }>>() ?? fallback,
  );
}

function projectWidgetData<T>(
  output: ToolEnvelope<T>,
): ToolEnvelope<T> {
  const widgetProjection = (output.data as T & { widget?: T }).widget;
  return widgetProjection
    ? { ...output, data: widgetProjection }
    : (output as ToolEnvelope<T>);
}

export function findToolEnvelope<T>(value: unknown): ToolEnvelope<T> | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  if (typeof record.ok === 'boolean' && record.data && typeof record.data === 'object') {
    return projectWidgetData(record as unknown as ToolEnvelope<T>);
  }

  for (const key of ['structuredContent', 'result', 'data']) {
    const nested = findToolEnvelope<T>(record[key]);
    if (nested) return nested;
  }

  if (Array.isArray(record.content)) {
    for (const item of record.content) {
      if (!item || typeof item !== 'object') continue;
      const text = (item as Record<string, unknown>).text;
      if (typeof text !== 'string') continue;
      try {
        const nested = findToolEnvelope<T>(JSON.parse(text));
        if (nested) return nested;
      } catch {
        // Non-JSON tool content is not a live widget payload.
      }
    }
  }

  return null;
}

export function useLiveWidgetData<T>(
  fallback: ToolEnvelope<T>,
  view: string,
  options: Record<string, unknown> = {},
): ToolEnvelope<T> {
  const {
    callTool,
    getToolOutput,
    isReady,
    toolOutput,
  } = useWidgetSDK();
  const initial = findToolEnvelope<T>(getToolOutput()) ?? fallback;
  const [output, setOutput] = useState<ToolEnvelope<T>>(initial);
  const refreshInFlight = useRef(false);
  const refreshCallTool = useRef(callTool);
  refreshCallTool.current = callTool;
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    const next = findToolEnvelope<T>(toolOutput);
    if (next) setOutput(next);
  }, [toolOutput]);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const refresh = async () => {
      if (refreshInFlight.current || document.visibilityState === 'hidden') return;
      refreshInFlight.current = true;
      try {
        const result = await refreshCallTool.current('refresh_surgeguard_view', {
          view,
          ...JSON.parse(optionsKey),
        });
        const next = findToolEnvelope<T>(result);
        if (!cancelled && next) setOutput(next);
      } catch {
        // Keep the last good snapshot if a single refresh is interrupted.
      } finally {
        refreshInFlight.current = false;
      }
    };

    const timer = window.setInterval(refresh, 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isReady, optionsKey, view]);

  return output;
}

export function statusClass(status?: string): string {
  const normalized = (status ?? 'watch').toLowerCase().replaceAll('_', '-');
  return `sg-badge sg-badge--${normalized}`;
}

export function progressStyle(value: number): CSSProperties {
  return { '--progress': `${Math.max(0, Math.min(100, value))}%` } as CSSProperties;
}

function requestDisplayModeSafely(action: () => Promise<unknown>) {
  void action().catch((error: unknown) => {
    // The host bridge can be unavailable while a widget preview is reloading.
    // Display-mode failures should never surface as an application crash.
    console.warn('The widget host did not accept the display-mode request.', error);
  });
}

export function WidgetShell({
  eyebrow,
  title,
  subtitle,
  status,
  freshness = 'Synthetic demo snapshot',
  variant = 'default',
  children,
}: WidgetShellProps) {
  useTheme();
  const {
    displayMode,
    isReady,
    requestFullscreen,
    requestInline,
  } = useWidgetSDK();

  if (variant === 'dashboard') {
    return (
      <main className="sg-shell sg-shell--dashboard" data-theme="light">
        <header className="sg-topbar sg-dashboard-topbar">
          <div className="sg-brand-lockup">
            <span className="sg-brand-mark" aria-hidden="true" />
            <div>
              <p className="sg-brand-name">SurgeGuard</p>
              <p className="sg-brand-subtitle">Care360 Surge Command</p>
            </div>
          </div>
          <strong className="sg-command-title">Surge Command Center</strong>
          <div className="sg-actions">
              <span className="sg-system-status">Simulation operational</span>
            {!isReady ? null : displayMode === 'fullscreen' ? (
              <button className="sg-icon-button" onClick={() => requestDisplayModeSafely(requestInline)} aria-label="Return to inline view" title="Inline view">
                <CollapseIcon />
              </button>
            ) : (
              <button className="sg-icon-button" onClick={() => requestDisplayModeSafely(requestFullscreen)} aria-label="Open fullscreen view" title="Fullscreen">
                <ExpandIcon />
              </button>
            )}
          </div>
        </header>
        <div className="sg-dashboard-layout">
          <div className="sg-dashboard-main">
            <header className="sg-dashboard-header">
              <div>
                <p className="sg-eyebrow">{eyebrow}</p>
                <h1 className="sg-title">{title}</h1>
                <p className="sg-subtitle">{subtitle}</p>
              </div>
              <div className="sg-actions">
                {status ? <span className={statusClass(status)}>{status.replaceAll('_', ' ')}</span> : null}
                {!isReady ? null : displayMode === 'fullscreen' ? (
                  <button className="sg-icon-button" onClick={() => requestDisplayModeSafely(requestInline)} aria-label="Return to inline view" title="Inline view">
                    <CollapseIcon />
                  </button>
                ) : (
                  <button className="sg-icon-button" onClick={() => requestDisplayModeSafely(requestFullscreen)} aria-label="Open fullscreen view" title="Fullscreen">
                    <ExpandIcon />
                  </button>
                )}
              </div>
            </header>
            <section className="sg-dashboard-content">{children}</section>
            <footer className="sg-footer">
              <span className="sg-freshness">{freshness}</span>
                    <span>Shared simulation state · policy-controlled execution</span>
            </footer>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="sg-shell" data-theme="light">
      <header className="sg-topbar">
        <div className="sg-brand-lockup">
          <span className="sg-brand-mark" aria-hidden="true" />
          <div>
            <p className="sg-brand-name">SurgeGuard</p>
            <p className="sg-brand-subtitle">Care360 Surge Command</p>
          </div>
        </div>
        <div className="sg-actions">
            <span className="sg-system-status">Simulation operational</span>
          {!isReady ? null : displayMode === 'fullscreen' ? (
            <button className="sg-icon-button" onClick={() => requestDisplayModeSafely(requestInline)} aria-label="Return to inline view" title="Inline view">
              <CollapseIcon />
            </button>
          ) : (
            <button className="sg-icon-button" onClick={() => requestDisplayModeSafely(requestFullscreen)} aria-label="Open fullscreen view" title="Fullscreen">
              <ExpandIcon />
            </button>
          )}
        </div>
      </header>
      <section className="sg-content">
        <div className="sg-hero">
          <div>
            <p className="sg-eyebrow">{eyebrow}</p>
            <h1 className="sg-title">{title}</h1>
            <p className="sg-subtitle">{subtitle}</p>
          </div>
          {status ? <span className={statusClass(status)}>{status.replaceAll('_', ' ')}</span> : null}
        </div>
        {children}
      </section>
      <footer className="sg-footer">
        <span className="sg-freshness">{freshness}</span>
          <span>Simulation evidence shown separately from projected benefit</span>
      </footer>
    </main>
  );
}

export function Kpi({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <article className="sg-kpi">
      <span className="sg-kpi-icon" aria-hidden="true"><span /></span>
      <div className="sg-kpi-copy">
        <p className="sg-kpi-value">{value}</p>
        <p className="sg-kpi-label">{label}</p>
        {note ? <p className="sg-kpi-note">{note}</p> : null}
      </div>
    </article>
  );
}

export function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="sg-panel">
      <header className="sg-panel-header">
        <h2 className="sg-panel-title">{title}</h2>
        {meta ? <span className="sg-panel-meta">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

function ExpandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
