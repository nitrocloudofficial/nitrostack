'use client';

/**
 * Shared visual language for the GroundTruth widgets.
 *
 * These are dashboard surfaces, not documents: the job is for state to read at
 * a glance, so severity is encoded in shape and colour as well as number.
 *
 * Semantic colours (verified / partial / unsupported) are kept separate from the
 * slate-blue accent so a status never reads as branding, or the reverse.
 */

const GROUNDTRUTH_CSS = `
.gt {
  /* Neutrals carry a slight blue bias so they sit with the accent. */
  --gt-bg: #f6f7f9;
  --gt-surface: #ffffff;
  --gt-surface-sunken: #eef0f4;
  --gt-border: #d9dde5;
  --gt-border-strong: #bcc3cf;
  --gt-text: #171b22;
  --gt-text-muted: #5b6472;
  --gt-text-faint: #8b94a3;

  --gt-accent: #3d6ea8;
  --gt-accent-soft: #e7eef7;

  --gt-good: #1f7a52;
  --gt-good-soft: #e2f2ea;
  --gt-warn: #9a6516;
  --gt-warn-soft: #faeed9;
  --gt-bad: #b0382f;
  --gt-bad-soft: #fbe6e3;

  --gt-radius: 10px;
  --gt-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  /*
   * Chart marks get their own palette, separate from the UI chip colours.
   * These specific values passed the data-viz validator against this mode's
   * surface — lightness band, chroma floor, CVD separation, normal-vision
   * floor, and contrast. Do not hand-tune them; re-run the validator instead.
   * CVD separation lands in the 6–8 band, which is only legal alongside
   * secondary encoding, so every sparkline also carries a text trend label.
   */
  --gt-mark-good: #008c41;
  --gt-mark-warn: #8b5300;
  --gt-mark-bad: #ec3f3a;
  --gt-grid: #e4e7ec;

  color: var(--gt-text);
  background: var(--gt-bg);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  .gt {
    --gt-bg: #14171d;
    --gt-surface: #1c2027;
    --gt-surface-sunken: #23272f;
    --gt-border: #2f3540;
    --gt-border-strong: #444c59;
    --gt-text: #e8ebf0;
    --gt-text-muted: #a3acbb;
    --gt-text-faint: #7b8493;

    --gt-accent: #7ba7d9;
    --gt-accent-soft: #1e2a38;

    --gt-good: #5fc294;
    --gt-good-soft: #16281f;
    --gt-warn: #dfa947;
    --gt-warn-soft: #2b2216;
    --gt-bad: #ef8578;
    --gt-bad-soft: #2d1a18;

    --gt-mark-good: #13a15e;
    --gt-mark-warn: #a77b00;
    --gt-mark-bad: #e65f55;
    --gt-grid: #2a303a;
  }
}

/* The host's explicit theme choice must win over the OS preference, both ways. */
.gt[data-gt-theme='dark'] {
  --gt-bg: #14171d;
  --gt-surface: #1c2027;
  --gt-surface-sunken: #23272f;
  --gt-border: #2f3540;
  --gt-border-strong: #444c59;
  --gt-text: #e8ebf0;
  --gt-text-muted: #a3acbb;
  --gt-text-faint: #7b8493;
  --gt-accent: #7ba7d9;
  --gt-accent-soft: #1e2a38;
  --gt-good: #5fc294;
  --gt-good-soft: #16281f;
  --gt-warn: #dfa947;
  --gt-warn-soft: #2b2216;
  --gt-bad: #ef8578;
  --gt-bad-soft: #2d1a18;

  --gt-mark-good: #13a15e;
  --gt-mark-warn: #a77b00;
  --gt-mark-bad: #e65f55;
  --gt-grid: #2a303a;
}

.gt[data-gt-theme='light'] {
  --gt-bg: #f6f7f9;
  --gt-surface: #ffffff;
  --gt-surface-sunken: #eef0f4;
  --gt-border: #d9dde5;
  --gt-border-strong: #bcc3cf;
  --gt-text: #171b22;
  --gt-text-muted: #5b6472;
  --gt-text-faint: #8b94a3;
  --gt-accent: #3d6ea8;
  --gt-accent-soft: #e7eef7;
  --gt-good: #1f7a52;
  --gt-good-soft: #e2f2ea;
  --gt-warn: #9a6516;
  --gt-warn-soft: #faeed9;
  --gt-bad: #b0382f;
  --gt-bad-soft: #fbe6e3;

  --gt-mark-good: #008c41;
  --gt-mark-warn: #8b5300;
  --gt-mark-bad: #ec3f3a;
  --gt-grid: #e4e7ec;
}

.gt * { box-sizing: border-box; }

.gt-panel {
  background: var(--gt-surface);
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gt-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gt-text-faint);
  margin: 0;
}

.gt-title {
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.01em;
  margin: 0;
  text-wrap: balance;
}

.gt-muted { color: var(--gt-text-muted); }
.gt-mono { font-family: var(--gt-mono); font-variant-numeric: tabular-nums; }

.gt-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.gt-chip--good { background: var(--gt-good-soft); color: var(--gt-good); }
.gt-chip--warn { background: var(--gt-warn-soft); color: var(--gt-warn); }
.gt-chip--bad  { background: var(--gt-bad-soft);  color: var(--gt-bad); }
.gt-chip--neutral { background: var(--gt-surface-sunken); color: var(--gt-text-muted); }
.gt-chip--accent { background: var(--gt-accent-soft); color: var(--gt-accent); }

.gt-field { display: flex; flex-direction: column; gap: 6px; }
.gt-label { font-size: 12.5px; font-weight: 600; color: var(--gt-text-muted); }

.gt-input, .gt-textarea, .gt-select {
  font: inherit;
  color: var(--gt-text);
  background: var(--gt-surface-sunken);
  border: 1px solid var(--gt-border);
  border-radius: 8px;
  padding: 9px 11px;
  width: 100%;
}
.gt-textarea { resize: vertical; min-height: 96px; line-height: 1.55; }
.gt-input:focus-visible, .gt-textarea:focus-visible,
.gt-select:focus-visible, .gt-btn:focus-visible {
  outline: 2px solid var(--gt-accent);
  outline-offset: 2px;
}

.gt-btn {
  font: inherit;
  font-weight: 600;
  color: #fff;
  background: var(--gt-accent);
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: filter 120ms ease;
}
.gt[data-gt-theme='dark'] .gt-btn { color: #10151c; }
@media (prefers-color-scheme: dark) { .gt .gt-btn { color: #10151c; } }
.gt-btn:hover:not(:disabled) { filter: brightness(1.08); }
.gt-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.gt-btn--quiet {
  background: transparent;
  color: var(--gt-accent);
  border-color: var(--gt-border-strong);
}

/* Severity rail on a row — state readable without parsing the text. */
.gt-row {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background: var(--gt-surface);
  border: 1px solid var(--gt-border);
  border-left-width: 3px;
  border-left-color: var(--gt-border-strong);
  border-radius: 8px;
}
.gt-row--good { border-left-color: var(--gt-good); }
.gt-row--warn { border-left-color: var(--gt-warn); }
.gt-row--bad  { border-left-color: var(--gt-bad); }

.gt-scroll { overflow-x: auto; }

.gt-meter {
  height: 6px;
  border-radius: 999px;
  background: var(--gt-surface-sunken);
  overflow: hidden;
}
.gt-meter > span { display: block; height: 100%; border-radius: 999px; }

@media (prefers-reduced-motion: reduce) {
  .gt * { transition: none !important; animation: none !important; }
}
`;

/** Severity buckets shared by every widget. */
export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export function toneForVerdict(verdict: string | null | undefined): Tone {
  switch (verdict) {
    case 'consistent':
      return 'good';
    case 'partial':
      return 'warn';
    case 'unsupported':
      return 'bad';
    default:
      return 'neutral';
  }
}

export function toneForSeverity(severity: string | null | undefined): Tone {
  switch (severity) {
    case 'high':
      return 'bad';
    case 'medium':
      return 'warn';
    case 'low':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function toneColorVar(tone: Tone): string {
  if (tone === 'good') return 'var(--gt-good)';
  if (tone === 'warn') return 'var(--gt-warn)';
  if (tone === 'bad') return 'var(--gt-bad)';
  return 'var(--gt-border-strong)';
}

/**
 * Wraps a widget in the shared tokens and injects the stylesheet.
 * `theme` comes from the host via the widget SDK.
 */
export function GroundTruthFrame({
  theme,
  children,
  maxWidth = 640,
}: {
  theme?: string | null;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      className="gt"
      data-gt-theme={theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : undefined}
      style={{ padding: 16, maxWidth, width: '100%' }}
    >
      <style dangerouslySetInnerHTML={{ __html: GROUNDTRUTH_CSS }} />
      {children}
    </div>
  );
}

/** Small labelled status pill. */
export function Chip({
  tone = 'neutral',
  children,
}: {
  tone?: Tone | 'accent';
  children: React.ReactNode;
}) {
  return <span className={`gt-chip gt-chip--${tone}`}>{children}</span>;
}
