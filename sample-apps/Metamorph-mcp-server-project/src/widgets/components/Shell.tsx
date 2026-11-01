import React, { useEffect, useState } from 'react';
import { nextPref, resolveTheme, tokensFor, type ThemeName, type ThemePref } from '../lib/theme';
import { Logo } from './Logo';
import { EvidenceLegend } from './Evidence';

// Zeigarnik + goal gradient: the journey is always visible, with what is done, where we are and what comes next.
export const STEPS = ['Assess', 'Plan', 'Preview', 'Apply / Verify', 'Report'] as const;
export type StepIndex = 0 | 1 | 2 | 3 | 4;

export type Layout = 'full' | 'inline';

const STORE_KEY = 'metamorph-theme-pref';
let memoryPref: ThemePref = 'auto'; // last resort when storage is blocked

function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(STORE_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* storage blocked: use memory */
  }
  return memoryPref;
}

// The theme to paint (see resolveTheme) plus the user's switch. ?theme=dark|light stands in for a host theme in
// screenshots and local checks; a real host never sends it. The user's choice is kept in localStorage when allowed,
// else in memory only (not verified whether the host persists widget state; useWidgetState is not used).
export function useTheme(host: string | null | undefined): { theme: ThemeName | null; pref: ThemePref; cycle: () => void } {
  const [system, setSystem] = useState<ThemeName | null>(null);
  const [pref, setPref] = useState<ThemePref>('auto');
  const [injected, setInjected] = useState<string | null>(null);
  useEffect(() => {
    setPref(readPref());
    try {
      setInjected(new URLSearchParams(window.location.search).get('theme'));
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const on = () => setSystem(mq.matches ? 'dark' : 'light');
      on();
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch {
      return undefined;
    }
  }, []);
  const cycle = () => {
    const n = nextPref(pref);
    memoryPref = n;
    try {
      window.localStorage.setItem(STORE_KEY, n);
    } catch {
      /* memory only */
    }
    setPref(n);
  };
  return { theme: resolveTheme({ host: host ?? injected, pref, system }), pref, cycle };
}

// A labelled three-state switch: auto (follow the host) -> light -> dark. 1-bit pixel glyphs, no icon library.
const GLYPH: Record<ThemePref, string> = {
  auto: 'M2 2h5v1h1v5h-1v1h-5v-1h-1v-5h1zM9 7h5v1h1v5h-1v1h-5v-1h-1v-5h1z',
  light: 'M7 1h2v2h-2zM7 13h2v2h-2zM1 7h2v2h-2zM13 7h2v2h-2zM4 4h8v8h-8zM2 2h2v2h-2zM12 2h2v2h-2zM2 12h2v2h-2zM12 12h2v2h-2z',
  dark: 'M6 1h4v1h-2v1h-1v3h1v2h2v1h2v1h-1v2h-2v1h-4v-1h-2v-2h-1v-4h1v-2h2v-1h1z'
};
export function ThemeSwitch({ pref, onCycle, theme }: { pref: ThemePref; onCycle: () => void; theme: ThemeName | null }) {
  const label = pref === 'auto' ? 'Auto' : pref === 'light' ? 'Light' : 'Dark';
  return (
    <button type="button" className="tswitch" onClick={onCycle} aria-pressed={pref !== 'auto'} aria-label={`Theme: ${label}. Click to change (Auto, Light, Dark)`} title="Light / Dark">
      <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false">
        <path d={GLYPH[pref]} />
      </svg>
      <span className="tswitch-label">{label}</span>
      <span className="tswitch-tip" aria-hidden="true">
        Light / Dark{theme ? ` (now ${theme})` : ''}
      </span>
    </button>
  );
}

// ?mode=inline|fullscreen overrides the host display mode for screenshots and local checks.
export function useLayout(displayMode: string | null | undefined): Layout {
  const [forced, setForced] = useState<string | null>(null);
  useEffect(() => {
    try {
      setForced(new URLSearchParams(window.location.search).get('mode'));
    } catch {
      setForced(null);
    }
  }, []);
  const m = forced ?? displayMode;
  return m === 'inline' ? 'inline' : 'full';
}

export function Wordmark() {
  return <span className="wordmark">metamorph</span>;
}

export function StepIndicator({ current }: { current: StepIndex | null }) {
  // Monitoring views (watch, cloud) are not part of the assess to report flow: no step is highlighted.
  if (current === null) {
    return (
      <nav className="steps" aria-label="Progress">
        <p className="eyebrow steps-monitor">Monitor · not a step of assess, plan, apply and report</p>
      </nav>
    );
  }
  return (
    <nav className="steps" aria-label="Progress">
      <ol>
        {STEPS.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'now' : i === current + 1 ? 'next' : 'later';
          return (
            <li key={label} className={`step-${state}`} aria-current={state === 'now' ? 'step' : undefined}>
              <span className="step-mark" aria-hidden="true">
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className="step-label">{label}</span>
              {state === 'next' && <span className="step-tag">next</span>}
              {state === 'now' && <span className="step-tag">you are here</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface ShellMeta {
  repo?: string;
  sha?: string;
  time?: string;
}

export function Header({ meta, small, sw }: { meta: ShellMeta; small?: boolean; sw?: React.ReactNode }) {
  return (
    <header className="hd">
      <div className="brand">
        <Logo size={small ? 24 : 64} title="Metamorph" />
        <Wordmark />
      </div>
      <dl className="hd-meta">
        {meta.repo && (
          <div>
            <dt>Repository</dt>
            <dd className="mono">{meta.repo}</dd>
          </div>
        )}
        {meta.sha && (
          <div>
            <dt>Commit</dt>
            <dd className="mono">{meta.sha}</dd>
          </div>
        )}
        {meta.time && (
          <div>
            <dt>Received</dt>
            <dd>{meta.time}</dd>
          </div>
        )}
      </dl>
      {sw}
    </header>
  );
}

export function Shell({ theme, layout, step, meta, sw, children }: { theme: ThemeName | null; layout: Layout; step: StepIndex | null; meta: ShellMeta; sw?: React.ReactNode; children: React.ReactNode }) {
  // Inline style variables: the colour tokens survive even when the host blocks tokens.css.
  const vars = theme ? (tokensFor(theme) as React.CSSProperties) : undefined;
  return (
    <div className={`mm mm-${layout}`} data-theme={theme ?? undefined} style={vars}>
      {layout === 'full' ? (
        <div className="frame">
          <Header meta={meta} sw={sw} />
          <StepIndicator current={step} />
          <main className="content">{children}</main>
          <footer className="ft">
            <EvidenceLegend />
          </footer>
        </div>
      ) : (
        <div className="frame frame-inline">
          <div className="inline-tools">{sw}</div>
          {children}
        </div>
      )}
    </div>
  );
}
