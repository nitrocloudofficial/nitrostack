/**
 * PassportIQ design system — light government console.
 *
 * WHY A STRING OF CSS AND NOT A STYLESHEET
 * ---------------------------------------
 * `nitrostack-cli build` runs esbuild over `app/<route>/page.tsx` and inlines the
 * resulting IIFE into a single self-contained HTML file. There is no CSS pipeline
 * in that path: an `import './styles.css'` either fails the build or is silently
 * dropped, and a widget that depends on an external stylesheet renders unstyled
 * inside an MCP host iframe with no network access to fetch it.
 *
 * So the entire design system is one string, injected once per document by
 * `useTheme()`. It costs a few KB in every bundle and buys the guarantee that a
 * widget looks correct in an MCP host, in a browser tab, and in an offline
 * inspector preview — the three places it actually gets viewed.
 *
 * WHY CSS CUSTOM PROPERTIES RATHER THAN INLINE STYLE OBJECTS
 * --------------------------------------------------------
 * Inline styles cannot express `:hover`, `:focus-visible`, `::-webkit-scrollbar`,
 * `@keyframes` or media queries — and the console needs all five. Variables also
 * mean one edit changes every surface, which matters because five separate
 * bundles have to look like one product.
 */

/**
 * Palette, read off the reference design.
 *
 * Government-review tooling has a hard constraint most dashboards do not: the
 * risk colours must survive being printed in greyscale and attached to a case
 * file, and they must not be the only signal for a verdict. So every risk colour
 * below is always paired with a text label in the components — the colour is
 * reinforcement, never the message.
 */
export const COLORS = {
  /** Page canvas — a faint slate tint, not pure white, so cards read as raised. */
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceSunken: '#F8FAFC',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  /** Indigo. Selection, primary actions, active navigation. */
  accent: '#4F46E5',
  accentHover: '#4338CA',
  accentSoft: '#EEF2FF',
  accentBorder: '#C7D2FE',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  high: '#EF4444',
  highSoft: '#FEE2E2',
  highBorder: '#FECACA',

  medium: '#F59E0B',
  mediumSoft: '#FEF3C7',
  mediumBorder: '#FDE68A',

  low: '#10B981',
  lowSoft: '#D1FAE5',
  lowBorder: '#A7F3D0',

  /** Machine/automation activity — distinct from risk so the two never confuse. */
  machine: '#7C3AED',
  machineSoft: '#F3E8FF',

  info: '#0EA5E9',
  infoSoft: '#E0F2FE',
} as const;

export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

/** Map any band-ish value to its solid colour. Total: unknown -> slate. */
export function riskColor(band: RiskLevel | string | null | undefined): string {
  switch (band) {
    case 'high':
      return COLORS.high;
    case 'medium':
      return COLORS.medium;
    case 'low':
      return COLORS.low;
    default:
      return COLORS.textMuted;
  }
}

/** Background wash for a risk pill. */
export function riskSoft(band: RiskLevel | string | null | undefined): string {
  switch (band) {
    case 'high':
      return COLORS.highSoft;
    case 'medium':
      return COLORS.mediumSoft;
    case 'low':
      return COLORS.lowSoft;
    default:
      return COLORS.surfaceAlt;
  }
}

export function riskBorder(band: RiskLevel | string | null | undefined): string {
  switch (band) {
    case 'high':
      return COLORS.highBorder;
    case 'medium':
      return COLORS.mediumBorder;
    case 'low':
      return COLORS.lowBorder;
    default:
      return COLORS.border;
  }
}

/** Derive a band from a 0-100 score. Mirrors the server's display thresholds. */
export function bandOf(score: number | null | undefined): RiskLevel {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'unknown';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function bandLabel(band: RiskLevel | string | null | undefined): string {
  switch (band) {
    case 'high':
      return 'High Risk';
    case 'medium':
      return 'Medium Risk';
    case 'low':
      return 'Low Risk';
    default:
      return 'Not Scored';
  }
}

export const GLOBAL_CSS = `
:root {
  --canvas: ${COLORS.canvas};
  --surface: ${COLORS.surface};
  --surface-alt: ${COLORS.surfaceAlt};
  --border: ${COLORS.border};
  --border-strong: ${COLORS.borderStrong};
  --accent: ${COLORS.accent};
  --accent-hover: ${COLORS.accentHover};
  --accent-soft: ${COLORS.accentSoft};
  --accent-border: ${COLORS.accentBorder};
  --text: ${COLORS.textPrimary};
  --text-2: ${COLORS.textSecondary};
  --text-3: ${COLORS.textMuted};
  --high: ${COLORS.high};
  --high-soft: ${COLORS.highSoft};
  --medium: ${COLORS.medium};
  --medium-soft: ${COLORS.mediumSoft};
  --low: ${COLORS.low};
  --low-soft: ${COLORS.lowSoft};
  --machine: ${COLORS.machine};
  --machine-soft: ${COLORS.machineSoft};
  --surface-sunken: ${COLORS.surfaceSunken};

  /* One monospace stack, defined once. Identifiers (application ids, hashes,
     passport numbers) must be scannable digit-by-digit, and repeating the stack
     inline in twenty components is how it silently drifts. */
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  --radius-sm: 6px;
  --radius: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Two-layer shadows: a tight contact shadow plus a soft ambient one. A single
     large blur reads as a drop shadow from 2014; this reads as elevation. */
  --shadow-sm: 0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04);
  --shadow: 0 1px 3px rgba(15,23,42,.06), 0 4px 12px rgba(15,23,42,.05);
  --shadow-lg: 0 2px 6px rgba(15,23,42,.06), 0 12px 32px rgba(15,23,42,.10);

  --sidebar-w: 240px;
  --topbar-h: 70px;
  --panel-w: 360px;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--canvas);
  color: var(--text);
  /* Inter first, then the platform UI stack. No webfont request: an MCP host
     iframe may have no network, and a fallback flash mid-review looks broken. */
  font-family: Inter, 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI',
               Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* Tabular numerals keep risk scores and counters from jittering as they tick. */
  font-variant-numeric: tabular-nums;
}

#widget-root { width: 100%; min-height: 100vh; }

::selection { background: ${COLORS.accentSoft}; color: ${COLORS.accent}; }

/* ---------------------------------------------------------------- scrollbars */
.piq-scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: ${COLORS.borderStrong} transparent; }
.piq-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.piq-scroll::-webkit-scrollbar-track { background: transparent; }
.piq-scroll::-webkit-scrollbar-thumb { background: ${COLORS.borderStrong}; border-radius: 99px; border: 2px solid transparent; background-clip: padding-box; }
.piq-scroll::-webkit-scrollbar-thumb:hover { background: ${COLORS.textMuted}; background-clip: padding-box; }

/* --------------------------------------------------------------------- shell */
.piq-app { display: flex; min-height: 100vh; background: var(--canvas); }

.piq-sidebar {
  width: var(--sidebar-w); flex: 0 0 var(--sidebar-w);
  background: var(--surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;
}
.piq-brand { height: var(--topbar-h); display: flex; align-items: center; gap: 10px; padding: 0 20px; border-bottom: 1px solid var(--border); }
.piq-brand-mark {
  width: 32px; height: 32px; border-radius: 9px; flex: 0 0 32px;
  background: linear-gradient(135deg, ${COLORS.accent} 0%, #6D5BFF 100%);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 750; font-size: 14px; letter-spacing: -.02em;
  box-shadow: 0 2px 6px rgba(79,70,229,.28);
}
.piq-brand-name { font-size: 15px; font-weight: 700; letter-spacing: -.015em; color: var(--text); }
.piq-brand-sub { font-size: 10px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: var(--text-3); margin-top: 1px; }

.piq-nav { padding: 14px 12px; display: flex; flex-direction: column; gap: 2px; }
.piq-nav-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); padding: 12px 10px 6px; }
.piq-nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px;
  border-radius: var(--radius); font-size: 13.5px; font-weight: 500; color: var(--text-2);
  cursor: pointer; border: 0; background: none; width: 100%; text-align: left;
  position: relative; transition: background .12s ease, color .12s ease;
}
.piq-nav-item:hover { background: var(--surface-alt); color: var(--text); }
.piq-nav-item.is-active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
/* Left accent bar on the active item — the reference design's signature. */
.piq-nav-item.is-active::before {
  content: ''; position: absolute; left: -12px; top: 7px; bottom: 7px;
  width: 3px; border-radius: 0 3px 3px 0; background: var(--accent);
}
.piq-nav-item .piq-nav-icon { width: 18px; height: 18px; flex: 0 0 18px; display: flex; align-items: center; justify-content: center; }
.piq-nav-count { margin-left: auto; font-size: 11px; font-weight: 700; color: var(--text-3); }
.piq-nav-item.is-active .piq-nav-count { color: var(--accent); }

.piq-sidebar-foot { margin-top: auto; padding: 12px; }

/* --------------------------------------------------------------- quick stats */
.piq-quickstats { background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; }
.piq-quickstats-title { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); margin-bottom: 10px; }
.piq-quickstat { display: flex; align-items: baseline; justify-content: space-between; padding: 5px 0; }
.piq-quickstat-label { font-size: 12px; color: var(--text-2); }
.piq-quickstat-value { font-size: 16px; font-weight: 700; letter-spacing: -.02em; }
.piq-emblem { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
.piq-emblem-text { font-size: 9.5px; line-height: 1.35; color: var(--text-3); font-weight: 500; }

/* -------------------------------------------------------------------- topbar */
.piq-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.piq-topbar {
  height: var(--topbar-h); flex: 0 0 var(--topbar-h);
  background: var(--surface); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 16px; padding: 0 24px;
  position: sticky; top: 0; z-index: 20;
}
.piq-crumbs { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-2); min-width: 0; }
.piq-crumb { white-space: nowrap; }
.piq-crumb.is-current { color: var(--text); font-weight: 600; }
.piq-crumb-sep { color: var(--text-3); }
.piq-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 14px; }

.piq-live {
  display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px 5px 9px;
  background: var(--low-soft); border: 1px solid ${COLORS.lowBorder}; border-radius: 99px;
  font-size: 11.5px; font-weight: 650; color: #047857; white-space: nowrap;
}
.piq-live-dot { width: 7px; height: 7px; border-radius: 99px; background: var(--low); animation: piq-pulse 1.9s ease-in-out infinite; }
.piq-live.is-idle { background: var(--surface-alt); border-color: var(--border); color: var(--text-2); }
.piq-live.is-idle .piq-live-dot { background: var(--text-3); animation: none; }
.piq-live.is-machine { background: var(--machine-soft); border-color: #E9D5FF; color: #6D28D9; }
.piq-live.is-machine .piq-live-dot { background: var(--machine); }
@keyframes piq-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .45; transform: scale(.82); } }

.piq-iconbtn {
  position: relative; width: 34px; height: 34px; border-radius: var(--radius);
  border: 1px solid var(--border); background: var(--surface); color: var(--text-2);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: background .12s ease, color .12s ease, border-color .12s ease;
}
.piq-iconbtn:hover { background: var(--surface-alt); color: var(--text); border-color: var(--border-strong); }
.piq-badge-dot {
  position: absolute; top: -4px; right: -4px; min-width: 17px; height: 17px; padding: 0 4px;
  border-radius: 99px; background: var(--high); color: #fff; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface);
}

.piq-officer { display: flex; align-items: center; gap: 9px; padding-left: 14px; border-left: 1px solid var(--border); }
.piq-avatar {
  width: 34px; height: 34px; border-radius: 99px; flex: 0 0 34px;
  background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12.5px; font-weight: 700; letter-spacing: -.01em;
}
.piq-officer-name { font-size: 13px; font-weight: 650; color: var(--text); line-height: 1.25; white-space: nowrap; }
.piq-officer-role { font-size: 11px; color: var(--text-2); line-height: 1.25; white-space: nowrap; }

/* --------------------------------------------------------------------- cards */
.piq-content { padding: 20px 24px 28px; display: flex; flex-direction: column; gap: 16px; }
.piq-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
.piq-card-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
.piq-card-title { font-size: 14px; font-weight: 650; color: var(--text); letter-spacing: -.01em; }
.piq-card-sub { font-size: 12px; color: var(--text-2); margin-top: 1px; }
.piq-card-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.piq-card-body { padding: 18px; }
.piq-card-body.is-flush { padding: 0; }

.piq-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); }

/* -------------------------------------------------------------------- pills */
.piq-pill {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px;
  border-radius: 99px; font-size: 10.5px; font-weight: 700;
  letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; border: 1px solid transparent;
}
.piq-pill-sq { border-radius: var(--radius-sm); text-transform: none; letter-spacing: 0; font-size: 11.5px; font-weight: 600; padding: 3px 8px; }
.piq-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px;
  background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 11.5px; font-weight: 550; color: var(--text-2);
}

/* ------------------------------------------------------------------ buttons */
.piq-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 9px 15px; border-radius: var(--radius); border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font-size: 13px; font-weight: 600;
  font-family: inherit; cursor: pointer;
  transition: background .12s ease, border-color .12s ease, box-shadow .12s ease, transform .06s ease;
}
.piq-btn:hover:not(:disabled) { background: var(--surface-alt); border-color: var(--border-strong); }
.piq-btn:active:not(:disabled) { transform: translateY(.5px); }
.piq-btn:disabled { opacity: .5; cursor: not-allowed; }
.piq-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.piq-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 1px 2px rgba(79,70,229,.24); }
.piq-btn-primary:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
.piq-btn-block { width: 100%; }
.piq-btn-sm { padding: 6px 11px; font-size: 12px; }
.piq-btn-machine { background: var(--machine); border-color: var(--machine); color: #fff; }
.piq-btn-machine:hover:not(:disabled) { background: #6D28D9; border-color: #6D28D9; }

/* --------------------------------------------------------------- field rows */
.piq-fields { display: flex; flex-direction: column; }
.piq-field { display: flex; align-items: flex-start; gap: 12px; padding: 9px 0; border-bottom: 1px dashed var(--border); }
.piq-field:last-child { border-bottom: 0; }
.piq-field-label { flex: 0 0 108px; font-size: 12px; color: var(--text-2); padding-top: 1px; }
.piq-field-value { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 550; color: var(--text); word-break: break-word; }
.piq-field-value.is-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }

/* ------------------------------------------------------------------- tables */
.piq-table { width: 100%; border-collapse: collapse; }
.piq-table th {
  text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 700;
  letter-spacing: .09em; text-transform: uppercase; color: var(--text-3);
  background: var(--surface-alt); border-bottom: 1px solid var(--border); white-space: nowrap;
}
.piq-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); font-size: 12.5px; vertical-align: middle; }
.piq-table tbody tr { cursor: pointer; transition: background .1s ease; }
.piq-table tbody tr:hover { background: var(--surface-alt); }
.piq-table tbody tr.is-selected { background: var(--accent-soft); }
.piq-table tbody tr:last-child td { border-bottom: 0; }

/* ------------------------------------------------------------------ progress */
.piq-bar { height: 6px; border-radius: 99px; background: var(--surface-alt); overflow: hidden; }
.piq-bar-fill { height: 100%; border-radius: 99px; transition: width .45s cubic-bezier(.4,0,.2,1); }

/* ------------------------------------------------------------------ timeline */
.piq-timeline { position: relative; padding-left: 26px; }
.piq-timeline::before { content: ''; position: absolute; left: 8px; top: 6px; bottom: 10px; width: 1.5px; background: var(--border); }
.piq-tl-item { position: relative; padding: 0 0 16px; }
.piq-tl-item:last-child { padding-bottom: 0; }
.piq-tl-dot {
  position: absolute; left: -26px; top: 2px; width: 17px; height: 17px; border-radius: 99px;
  background: var(--surface); border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center; font-size: 8px; color: #fff;
}
.piq-tl-dot.is-done { background: var(--low); border-color: var(--low); }
.piq-tl-dot.is-active { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.piq-tl-dot.is-flag { background: var(--high); border-color: var(--high); }
.piq-tl-title { font-size: 12.5px; font-weight: 600; color: var(--text); }
.piq-tl-meta { font-size: 11px; color: var(--text-3); margin-top: 1px; }
.piq-tl-body { font-size: 12px; color: var(--text-2); margin-top: 4px; line-height: 1.55; }

/* ---------------------------------------------------------------- note field */
.piq-textarea {
  width: 100%; min-height: 82px; resize: vertical; padding: 10px 12px;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text);
  font-family: inherit; font-size: 12.5px; line-height: 1.6;
}
.piq-textarea::placeholder { color: var(--text-3); }
.piq-textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.piq-counter { font-size: 11px; color: var(--text-3); text-align: right; margin-top: 5px; font-variant-numeric: tabular-nums; }
.piq-counter.is-over { color: var(--high); font-weight: 650; }

/* ------------------------------------------------------------ choice cards */
.piq-choices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.piq-choice {
  text-align: left; padding: 13px; border: 1.5px solid var(--border); border-radius: var(--radius);
  background: var(--surface); cursor: pointer; font-family: inherit;
  transition: border-color .12s ease, background .12s ease, box-shadow .12s ease;
}
.piq-choice:hover { border-color: var(--border-strong); background: var(--surface-alt); }
.piq-choice:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.piq-choice.is-picked { box-shadow: var(--shadow); }
.piq-choice-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.piq-choice-title { font-size: 13px; font-weight: 650; color: var(--text); }
.piq-choice-desc { font-size: 11.5px; color: var(--text-2); line-height: 1.5; }

/* -------------------------------------------------------------------- graph */
.piq-graph-wrap { position: relative; background: var(--surface); border-radius: var(--radius-lg); overflow: hidden; }
.piq-graph-svg { display: block; width: 100%; }
.piq-graph-node { cursor: pointer; }
.piq-graph-node circle, .piq-graph-node rect { transition: stroke-width .14s ease, filter .14s ease; }
.piq-graph-node:hover circle, .piq-graph-node:hover rect { filter: brightness(.97); }
.piq-zoom { position: absolute; right: 14px; bottom: 14px; display: flex; flex-direction: column; gap: 5px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }
.piq-zoom button { width: 30px; height: 29px; border: 0; background: var(--surface); color: var(--text-2); font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.piq-zoom button + button { border-top: 1px solid var(--border); }
.piq-zoom button:hover { background: var(--surface-alt); color: var(--text); }
.piq-legend { position: absolute; left: 14px; bottom: 14px; display: flex; flex-wrap: wrap; gap: 10px; background: rgba(255,255,255,.92); backdrop-filter: blur(6px); border: 1px solid var(--border); border-radius: var(--radius); padding: 7px 11px; box-shadow: var(--shadow-sm); }
.piq-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--text-2); }
.piq-legend-swatch { width: 9px; height: 9px; border-radius: 99px; }
.piq-edge-label { font-size: 9.5px; font-weight: 650; fill: ${COLORS.textSecondary}; letter-spacing: .02em; }
@keyframes piq-dash { to { stroke-dashoffset: -14; } }
.piq-edge-live { animation: piq-dash 1s linear infinite; }

/* --------------------------------------------------------------------- donut */
.piq-donut-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.piq-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.piq-donut-value { font-size: 26px; font-weight: 750; letter-spacing: -.03em; line-height: 1; }
.piq-donut-label { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-top: 4px; }
.piq-donut-ring { transition: stroke-dashoffset .8s cubic-bezier(.4,0,.2,1); }

/* --------------------------------------------------------------------- modal */
.piq-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.42); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 32px; z-index: 100; animation: piq-fade .14s ease; }
@keyframes piq-fade { from { opacity: 0; } to { opacity: 1; } }
.piq-modal { background: var(--surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); width: 100%; max-width: 780px; max-height: 86vh; display: flex; flex-direction: column; animation: piq-rise .18s cubic-bezier(.4,0,.2,1); }
@keyframes piq-rise { from { opacity: 0; transform: translateY(10px) scale(.99); } to { opacity: 1; transform: none; } }
.piq-modal-head { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.piq-modal-body { padding: 20px; overflow-y: auto; }

/* ------------------------------------------------------------------- stream */
.piq-stream { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; }
/* The stream renders both full-width (automation view) and in a ~330px sidebar
   (agent view). A fixed 130px tag column plus a nowrap message left roughly 90px
   for the text in the sidebar, clipping every line to "Agent Thin…". The tag now
   sizes to its content and the row is allowed to wrap, so a narrow column spends
   a second line on the message instead of throwing it away. */
.piq-stream-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; padding: 6px 14px; border-bottom: 1px solid var(--border); animation: piq-slide .22s ease; }
@keyframes piq-slide { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: none; } }
.piq-stream-row:last-child { border-bottom: 0; }
.piq-stream-time { flex: 0 0 58px; color: var(--text-3); }
.piq-stream-tag { flex: 0 0 auto; min-width: 56px; font-weight: 700; }
.piq-stream-text { flex: 1 1 150px; min-width: 0; color: var(--text-2); overflow: hidden; overflow-wrap: anywhere; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

/* ------------------------------------------------------- automation surface */

/* A live indicator that reads as "in progress" without a spinner stealing focus.
   Reduced-motion users get a solid dot: the colour alone still carries the state. */
.piq-pulse-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 99px;
  background: currentColor; margin-right: 5px; flex: 0 0 auto;
  animation: piq-pulse 1.5s ease-in-out infinite;
}
@keyframes piq-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.7); } }

/* Counters. min-width:0 is load-bearing: without it a grid cell refuses to go
   below its content width and the fourth tile clipped out of the side rail. */
.piq-ministat {
  min-width: 0; padding: 10px 12px; border-radius: var(--radius);
  background: var(--surface-sunken); border: 1px solid var(--border);
}
.piq-ministat-value {
  font-size: 19px; font-weight: 680; line-height: 1.1; color: var(--text);
  font-variant-numeric: tabular-nums;
}
.piq-ministat-label {
  margin-top: 4px; font-size: 10px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--text-3); font-weight: 600;
  /* Two-word labels wrap rather than overflow the tile. */
  overflow-wrap: break-word; line-height: 1.3;
}

.piq-autopilot-detail { margin: 0 0 10px; font-size: 12.5px; line-height: 1.65; color: var(--text-2); }
.piq-autopilot-meta { display: flex; flex-wrap: wrap; gap: 6px; }

.piq-autopilot-top {
  display: flex; flex-direction: column; gap: 3px; width: 100%; margin-top: 12px;
  padding: 11px 13px; text-align: left; border-radius: var(--radius);
  background: var(--machine-soft); border: 1px solid #E9D5FF; cursor: pointer;
  font: inherit; transition: border-color .12s ease, box-shadow .12s ease;
}
.piq-autopilot-top:hover:not(:disabled) { border-color: ${COLORS.machine}; box-shadow: var(--shadow-sm); }
.piq-autopilot-top-name {
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  font-size: 13.5px; font-weight: 680; color: var(--text); letter-spacing: -.01em;
}
.piq-autopilot-top-id { font-family: var(--mono); font-size: 10.5px; font-weight: 600; color: ${COLORS.machine}; }
.piq-autopilot-top-head { font-size: 12px; line-height: 1.55; color: var(--text-2); }
.piq-autopilot-top-foot { margin-top: 2px; font-size: 10.5px; font-weight: 600; color: #6D28D9; }

.piq-inline-error {
  margin: 12px 0 0; padding: 9px 11px; border-radius: 7px; font-size: 12px; line-height: 1.55;
  background: var(--high-soft); border: 1px solid ${COLORS.highBorder}; color: #991B1B;
}

/* --------------------------------------------------- workflow / mission grid */

/* The stage rail on the automation screen: the ten pipeline stages as a single
   horizontal run, so "what has this case been through" is one glance. */
.piq-rail { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.piq-rail-cell {
  flex: 1 1 0; min-width: 92px; padding: 9px 10px; border-radius: 8px;
  background: var(--surface-sunken); border: 1px solid var(--border);
  border-top: 3px solid var(--border);
}
.piq-rail-cell.is-done { border-top-color: ${COLORS.low}; background: var(--low-soft); }
.piq-rail-cell.is-active { border-top-color: ${COLORS.accent}; background: var(--accent-soft); }
.piq-rail-cell.is-optional { border-style: dashed; }
.piq-rail-name { font-size: 10.5px; font-weight: 680; color: var(--text); line-height: 1.35; }
.piq-rail-meta { margin-top: 3px; font-size: 9.5px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: .04em; }

/* Read-only tool inventory — proves the MCP surface exists rather than asserting it. */
.piq-toolgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 7px; }
.piq-tool {
  display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 7px;
  background: var(--surface-sunken); border: 1px solid var(--border);
  font-family: var(--mono); font-size: 11px; color: var(--text-2);
}
.piq-tool-dot { width: 5px; height: 5px; border-radius: 99px; background: ${COLORS.low}; flex: 0 0 auto; }

/* The human-authority notice. Deliberately loud: the one claim this product
   must never let a reviewer misread is who decides. */
.piq-authority {
  display: flex; gap: 11px; align-items: flex-start; padding: 12px 14px;
  border-radius: var(--radius); background: var(--machine-soft);
  border: 1px solid #E9D5FF; border-left: 3px solid ${COLORS.machine};
}
.piq-authority-text { font-size: 12px; line-height: 1.6; color: #5B21B6; }

/* -------------------------------------------------------------------- misc */
.piq-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.piq-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.piq-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.piq-split { display: flex; gap: 16px; align-items: flex-start; }
.piq-split-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.piq-split-side { flex: 0 0 var(--panel-w); width: var(--panel-w); display: flex; flex-direction: column; gap: 16px; position: sticky; top: calc(var(--topbar-h) + 20px); }
.piq-empty { padding: 40px 20px; text-align: center; color: var(--text-2); font-size: 13px; }
.piq-spin { width: 15px; height: 15px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 99px; animation: piq-rot .65s linear infinite; }
@keyframes piq-rot { to { transform: rotate(360deg); } }

/* A demo-data notice must be unmissable — an officer must never mistake sample
   figures for a live queue. */
.piq-demo-banner {
  display: flex; align-items: center; gap: 9px; padding: 8px 16px;
  background: var(--medium-soft); border-bottom: 1px solid ${COLORS.mediumBorder};
  font-size: 12px; font-weight: 550; color: #92400E;
}

/* Below ~1180px the right panel stops fitting beside the graph; stack instead of
   letting both shrink into uselessness. */
@media (max-width: 1180px) {
  .piq-split { flex-direction: column; }
  .piq-split-side { flex: 1 1 auto; width: 100%; position: static; }
  .piq-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .piq-grid-3 { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .piq-sidebar { display: none; }
  .piq-grid-2 { grid-template-columns: 1fr; }
  .piq-choices { grid-template-columns: 1fr; }
}

/* =========================================================================
   Caseflow — the lifecycle board, the intake form, the case journey
   =========================================================================
   The board scrolls HORIZONTALLY and each lane scrolls vertically. That is a
   deliberate choice: a passport case moves through fourteen stages, and a
   vertical list of fourteen collapsed sections hides the one thing the officer
   needs to see at a glance — the shape of the queue, and specifically how tall
   the officer_review column is compared to everything else. */

.piq-board {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 10px;
  scroll-snap-type: x proximity;
}
.piq-board::-webkit-scrollbar { height: 9px; }
.piq-board::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 6px; }

.piq-lane {
  flex: 0 0 236px;
  display: flex;
  flex-direction: column;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  scroll-snap-align: start;
  /* Size to content. An empty lane used to stand 620px tall, which made a board
     with two occupied lanes look like a mostly-broken page. */
  align-self: flex-start;
  max-height: 560px;
}
.piq-lane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 9px 11px 8px;
  border-top: 3px solid var(--border-strong);
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.piq-lane-title {
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.piq-lane-count {
  flex: 0 0 auto;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--surface-alt);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.piq-lane-note,
.piq-lane-gate {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: var(--text-3);
  white-space: nowrap;
}
.piq-lane-gate { color: var(--accent); }
.piq-lane-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 9px;
  overflow-y: auto;
  min-height: 64px;
}
.piq-lane-empty {
  margin: 6px 0;
  font-size: 11.5px;
  color: var(--text-3);
  text-align: center;
}

.piq-case-card {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 10px;
  cursor: pointer;
  transition: box-shadow .14s ease, border-color .14s ease, transform .14s ease;
}
.piq-case-card:hover {
  border-color: var(--accent-border);
  box-shadow: 0 3px 10px rgba(15, 23, 42, .07);
  transform: translateY(-1px);
}
.piq-case-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.piq-case-card.is-breached { border-left: 3px solid var(--high); }
.piq-case-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 2px;
}
.piq-case-name {
  font-size: 12.5px;
  font-weight: 620;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.piq-case-arn {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-3);
  margin-bottom: 7px;
}
.piq-case-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 7px;
}
.piq-case-since { font-size: 10.5px; color: var(--text-3); white-space: nowrap; }
.piq-case-act { margin-top: 8px; }
.piq-case-hold {
  margin: 6px 0 0;
  font-size: 10.5px;
  line-height: 1.45;
  color: var(--text-2);
}

/* ---- Forms ------------------------------------------------------------- */

.piq-form { display: flex; flex-direction: column; gap: 12px; }
.piq-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.piq-form-row-3 { display: grid; grid-template-columns: 1fr 1fr .7fr; gap: 12px; }
.piq-lbl {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-2);
}
.piq-input {
  font: inherit;
  font-size: 13px;
  font-weight: 450;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  padding: 8px 10px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color .14s ease, box-shadow .14s ease;
}
.piq-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.piq-hint {
  margin: 0;
  font-size: 10.5px;
  font-weight: 450;
  line-height: 1.5;
  color: var(--text-3);
}
.piq-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
}
.piq-check input { margin-top: 2px; accent-color: var(--accent); }
.piq-chipset { display: flex; flex-wrap: wrap; gap: 6px; }
.piq-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  background: var(--surface-alt);
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 4px 9px;
  cursor: pointer;
  transition: all .12s ease;
}
.piq-toggle.is-on {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.piq-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-2);
  background: var(--surface-alt);
  border-left: 3px solid var(--border-strong);
  border-radius: 0 6px 6px 0;
  padding: 8px 11px;
}
.piq-note code {
  font-family: var(--mono);
  font-size: 11px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 4px;
}
.piq-note.is-warn {
  color: #92400E;
  background: var(--medium-soft);
  border-left-color: var(--medium);
}
.piq-note.is-bad {
  color: #991B1B;
  background: var(--high-soft);
  border-left-color: var(--high);
}

/* ---- The stage rail --------------------------------------------------- */

.piq-rail {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
}
.piq-rail-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px 5px 0;
  position: relative;
}
.piq-rail-step::after {
  content: '';
  position: absolute;
  right: 4px;
  top: 50%;
  width: 6px;
  height: 6px;
  border-top: 1.5px solid var(--border-strong);
  border-right: 1.5px solid var(--border-strong);
  transform: translateY(-50%) rotate(45deg);
}
.piq-rail-step:last-child::after { display: none; }
.piq-rail-dot {
  flex: 0 0 auto;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-3);
  background: var(--surface-alt);
  border: 1px solid var(--border);
}
.piq-rail-label { font-size: 11.5px; color: var(--text-3); white-space: nowrap; }
.piq-rail-step.is-done .piq-rail-dot {
  color: #fff;
  background: var(--low);
  border-color: var(--low);
}
.piq-rail-step.is-done .piq-rail-label { color: var(--text-2); }
.piq-rail-step.is-now .piq-rail-dot {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.piq-rail-step.is-now .piq-rail-label { color: var(--text); font-weight: 650; }

/* ---- Artefacts, journal, steps, ticks --------------------------------- */

.piq-artefacts { display: flex; flex-direction: column; gap: 14px; }
.piq-artefact {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.piq-artefact:last-child { border-bottom: none; padding-bottom: 0; }

.piq-journal,
.piq-steps,
.piq-ticks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 520px;
  overflow-y: auto;
}
.piq-journal-item,
.piq-step,
.piq-tick {
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 11px;
}
.piq-step.is-bad { border-left: 3px solid var(--high); }
.piq-journal-head,
.piq-step-head,
.piq-tick-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}
.piq-journal-time { font-size: 10.5px; color: var(--text-3); white-space: nowrap; }
.piq-journal-summary,
.piq-step-move {
  margin: 0 0 4px;
  font-size: 12.5px;
  font-weight: 620;
  color: var(--text);
}
.piq-step-move { margin: 0; }
.piq-step-who { font-size: 10.5px; color: var(--text-3); white-space: nowrap; }
.piq-journal-why,
.piq-step-why,
.piq-tick-narrative {
  margin: 0 0 6px;
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--text-2);
}
.piq-step-out {
  margin: 0 0 6px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text);
}
.piq-journal-tool {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--machine);
  background: var(--machine-soft);
  border-radius: 4px;
  padding: 1px 5px;
}
.piq-tick-narrative {
  font-size: 12px;
  color: var(--text);
}
.piq-ticks { max-height: none; }
.piq-tick .piq-steps { max-height: none; }

.piq-ministat {
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}
.piq-ministat-value {
  font-size: 21px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.piq-ministat-label {
  margin-top: 2px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: var(--text-3);
}

@media (max-width: 900px) {
  .piq-form-row,
  .piq-form-row-3 { grid-template-columns: 1fr; }
  .piq-lane { flex-basis: 210px; }
}
`;

/**
 * Inject the stylesheet exactly once per document.
 *
 * Called from every page's top-level render rather than a useEffect: an effect
 * runs AFTER the first paint, so the officer would see one unstyled frame on
 * every widget mount. Guarded by id because a host may mount two widgets into the
 * same document, and duplicate `:root` blocks would double the parse cost for no
 * benefit.
 */
export function useTheme(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('piq-theme')) return;
  const style = document.createElement('style');
  style.id = 'piq-theme';
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}
