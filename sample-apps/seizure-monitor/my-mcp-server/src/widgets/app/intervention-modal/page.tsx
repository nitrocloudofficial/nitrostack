'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { emptyStateMessage, usePreview, usePreviewTheme } from '../preview';

/**
 * Layer B surface: the moment of friction.
 *
 * Everything on this screen is either a fact about the user's own portfolio, a base rate from
 * history, or a question. There is no recommendation anywhere on it, and "Proceed anyway" is a
 * first-class button rather than a grudging escape hatch — the user's decision stays theirs.
 */

interface HistoricalCase {
  id: string;
  case: string;
  recovery_days?: number;
  peak_drawdown_pct?: number;
  panic_seller_outcome?: string;
  late_buyer_outcome?: string;
  outcome?: string;
  note?: string;
}

interface InterventionData {
  pattern: 'panic_sell' | 'fomo_buy' | 'herd_follow';
  headline: string;
  observation: string;
  pattern_note: string;
  historical_context: string | null;
  reflection_question: string;
  cooling_off_suggestion: string;
  user_options: string[];
  compliance: { passed: boolean; violations: string[]; rule: string };
  confidence: number | null;
  driving_event: { event_id: string; headline: string; date: string } | null;
  relevance: {
    relevance_band: string;
    driver: string;
    is_company_specific: boolean;
    exposure_pct_of_portfolio: number;
    affected_holdings: Array<{ symbol: string; day_change_pct: number }>;
  } | null;
  historical: {
    label: string;
    plain_language: string;
    aggregate: Record<string, unknown>;
    cases: HistoricalCase[];
    counterweight: string | null;
  } | null;
  target_symbols: string[];
  affected_value: number | null;
  portfolio_totals: { total_value: number };
}

const PATTERN: Record<InterventionData['pattern'], { label: string; icon: string }> = {
  panic_sell: { label: 'Panic-sell pattern', icon: '↓' },
  fomo_buy: { label: 'FOMO-buy pattern', icon: '↑' },
  herd_follow: { label: 'Herd-follow pattern', icon: '⇉' }
};

const DRIVER_COPY: Record<string, string> = {
  broad_market: 'Market-wide — not about these companies',
  sector: 'Sector-wide — not about these companies',
  company_specific: 'Company-specific — this one is about the business',
  unrelated: 'No existing exposure'
};

/** Turn an aggregate key/value pair into something a first-time investor can read. */
function statLabel(key: string, value: unknown): { label: string; value: string } | null {
  if (typeof value !== 'number') return null;
  const label = key
    .replace(/_pct|_12mo|_90d/g, '')
    .replace(/^share_/, '')
    .replace(/_/g, ' ')
    .trim();
  if (key === 'sample_size') return { label: 'cases in cohort', value: value.toLocaleString('en-US') };
  if (key.startsWith('share_')) return { label, value: `${Math.round(value * 100)}%` };
  if (key.endsWith('_days')) return { label: label.replace(/ days$/, ''), value: `${value} days` };
  if (Math.abs(value) < 1) return { label, value: `${(value * 100).toFixed(1)}%` };
  return { label, value: String(value) };
}

export default function InterventionModal() {
  const hostTheme = useTheme();
  const { getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  const preview = usePreview<InterventionData>('/intervention-modal');
  const previewTheme = usePreviewTheme();
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data = getToolOutput<InterventionData>() ?? preview.data;
  const theme = previewTheme ?? hostTheme;

  if (!data) {
    return (
      <div className="iv-root" data-mode={theme}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="iv-empty">{emptyStateMessage(preview, 'intervention')}</div>
      </div>
    );
  }

  const pattern = PATTERN[data.pattern] ?? { label: data.pattern, icon: '•' };
  const exposurePct = (data.relevance?.exposure_pct_of_portfolio ?? 0) * 100;

  const stats = data.historical
    ? Object.entries(data.historical.aggregate)
        .map(([k, v]) => statLabel(k, v))
        .filter((s): s is { label: string; value: string } => s !== null)
        .slice(0, 4)
    : [];

  const choose = async (option: string, index: number, total: number) => {
    setBusy(true);
    setChoice(option);
    const proceeded = index === total - 1;
    try {
      await callTool('log_decision_context', {
        user_intent: data.headline,
        detected_pattern: data.pattern,
        confidence: data.confidence ?? undefined,
        user_decision: proceeded ? 'proceeded' : 'paused_to_reflect',
        user_note: option,
        context_shown: {
          driving_event: data.driving_event?.event_id ?? null,
          relevance_band: data.relevance?.relevance_band ?? null,
          exposure_pct: data.relevance?.exposure_pct_of_portfolio ?? null,
          historical: data.historical?.plain_language ?? null,
          reflection_question: data.reflection_question
        }
      });
    } catch {
      /* logging must never block the user's choice */
    }
    if (!proceeded) sendFollowUpMessage(option);
    setBusy(false);
  };

  return (
    <div className="iv-root" data-mode={theme}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="iv-head">
        <span className="iv-chip">
          <span aria-hidden="true">{pattern.icon}</span> {pattern.label}
        </span>
        {data.confidence !== null && (
          <span className="iv-conf" title="Detection confidence">
            <span className="iv-conf-bar">
              <span style={{ width: `${Math.round(data.confidence * 100)}%` }} />
            </span>
            {Math.round(data.confidence * 100)}% match
          </span>
        )}
      </header>

      <h1 className="iv-title">{data.headline}</h1>

      {/* What is actually happening */}
      <section className="iv-block">
        {data.relevance && (
          <div className="iv-exposure">
            <div className="iv-exposure-nums">
              <span className="iv-exposure-pct">{exposurePct.toFixed(1)}%</span>
              <span className="iv-exposure-label">
                of your portfolio
                {data.affected_value !== null && ` · $${Math.round(data.affected_value).toLocaleString('en-US')}`}
              </span>
            </div>
            <div className="iv-exposure-bar" role="img" aria-label={`${exposurePct.toFixed(1)} percent exposed`}>
              <span style={{ width: `${Math.min(100, exposurePct)}%` }} />
            </div>
            <span className={`iv-driver ${data.relevance.is_company_specific ? 'iv-driver--specific' : ''}`}>
              {DRIVER_COPY[data.relevance.driver] ?? data.relevance.driver}
            </span>
          </div>
        )}
        <p className="iv-body">{data.observation}</p>
        {data.driving_event && (
          <p className="iv-source">
            Source: {data.driving_event.headline} · {data.driving_event.date}
          </p>
        )}
      </section>

      {/* The pattern, named without moralising */}
      <section className="iv-block iv-block--quiet">
        <h2>What the wording suggests</h2>
        <p className="iv-body">{data.pattern_note}</p>
      </section>

      {/* Base rates */}
      {data.historical && (
        <section className="iv-block">
          <h2>What happened to people who did this</h2>
          <p className="iv-body iv-lead">{data.historical.plain_language}</p>
          {stats.length > 0 && (
            <ul className="iv-stats">
              {stats.map((s) => (
                <li key={s.label}>
                  <span className="iv-stat-value">{s.value}</span>
                  <span className="iv-stat-label">{s.label}</span>
                </li>
              ))}
            </ul>
          )}
          <ul className="iv-cases">
            {data.historical.cases.map((c) => (
              <li key={c.id}>
                <strong>{c.case}</strong>
                <span>
                  {[
                    c.recovery_days !== undefined ? `recovered in ~${c.recovery_days} days` : null,
                    c.peak_drawdown_pct !== undefined ? `peak drawdown ${c.peak_drawdown_pct}%` : null,
                    c.panic_seller_outcome ?? c.late_buyer_outcome ?? c.outcome ?? null
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          {data.historical.counterweight && (
            <p className="iv-counter">
              <strong>The other side of it:</strong> {data.historical.counterweight}
            </p>
          )}
        </section>
      )}

      {/* The question — the whole point of the screen */}
      <section className="iv-question">
        <span className="iv-question-tag">One question before you decide</span>
        <p>{data.reflection_question}</p>
      </section>

      <p className="iv-cooling">{data.cooling_off_suggestion}</p>

      {/* Choices — proceeding is first-class */}
      {choice ? (
        <div className="iv-done">
          <strong>Recorded: “{choice}”</strong>
          <span>
            Your choice and everything shown above are in the decision log. The decision was yours to make — that was
            the whole idea.
          </span>
        </div>
      ) : (
        <div className="iv-actions">
          {data.user_options.map((opt, i) => (
            <button
              key={opt}
              disabled={busy}
              className={i === data.user_options.length - 1 ? 'iv-btn iv-btn--ghost' : 'iv-btn'}
              onClick={() => choose(opt, i, data.user_options.length)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <footer className="iv-foot">
        <span className={data.compliance.passed ? 'iv-ok' : 'iv-bad'}>
          {data.compliance.passed ? '✓ No trade recommendation given' : `⚠ Compliance lint: ${data.compliance.violations.join(', ')}`}
        </span>
        <span>Mock data · informational only · not investment advice</span>
      </footer>
    </div>
  );
}

const CSS = `
.iv-root {
  color-scheme: light;
  --surface: #fcfcfb;
  --plane: #f9f9f7;
  --ink: #0b0b0b;
  --ink-2: #52514e;
  --ink-muted: #898781;
  --rule: #e1e0d9;
  --ring: rgba(11,11,11,0.10);
  --accent: #2a78d6;
  --critical: #d03b3b;
  --good: #006300;
  --quiet: rgba(11,11,11,0.03);
  background: var(--plane);
  color: var(--ink);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.55;
  padding: 20px;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
@media (prefers-color-scheme: dark) {
  .iv-root:not([data-mode="light"]) {
    color-scheme: dark;
    --surface: #1a1a19; --plane: #0d0d0d; --ink: #ffffff; --ink-2: #c3c2b7;
    --ink-muted: #898781; --rule: #2c2c2a; --ring: rgba(255,255,255,0.10);
    --accent: #3987e5; --critical: #e66767; --good: #0ca30c;
    --quiet: rgba(255,255,255,0.04);
  }
}
.iv-root[data-mode="dark"] {
  color-scheme: dark;
  --surface: #1a1a19; --plane: #0d0d0d; --ink: #ffffff; --ink-2: #c3c2b7;
  --ink-muted: #898781; --rule: #2c2c2a; --ring: rgba(255,255,255,0.10);
  --accent: #3987e5; --critical: #e66767; --good: #0ca30c;
  --quiet: rgba(255,255,255,0.04);
}

.iv-root * { box-sizing: border-box; }
.iv-empty { padding: 40px; text-align: center; color: var(--ink-muted); }

.iv-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.iv-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
  padding: 4px 10px; border-radius: 999px;
  color: var(--critical); border: 1px solid currentColor; background: var(--surface);
}
.iv-conf { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.iv-conf-bar { width: 54px; height: 4px; background: var(--rule); border-radius: 2px; overflow: hidden; }
.iv-conf-bar span { display: block; height: 100%; background: var(--ink-muted); border-radius: 2px; }

.iv-title { margin: 0; font-size: 19px; font-weight: 640; letter-spacing: -0.015em; line-height: 1.3; }

.iv-block { background: var(--surface); border: 1px solid var(--ring); border-radius: 12px; padding: 16px; }
.iv-block--quiet { background: var(--quiet); border-color: transparent; }
.iv-block h2 { margin: 0 0 8px; font-size: 11px; font-weight: 620; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-muted); }
.iv-body { margin: 0; color: var(--ink-2); }
.iv-lead { color: var(--ink); font-weight: 550; }
.iv-source { margin: 10px 0 0; font-size: 11px; color: var(--ink-muted); }

.iv-exposure { margin-bottom: 12px; }
.iv-exposure-nums { display: flex; align-items: baseline; gap: 8px; }
.iv-exposure-pct { font-size: 26px; font-weight: 640; letter-spacing: -0.02em; }
.iv-exposure-label { font-size: 12px; color: var(--ink-2); }
.iv-exposure-bar { height: 8px; background: var(--rule); border-radius: 4px; overflow: hidden; margin: 8px 0 8px; }
.iv-exposure-bar span { display: block; height: 100%; background: var(--accent); border-radius: 4px; }
.iv-driver { font-size: 11px; font-weight: 600; color: var(--ink-2); }
.iv-driver--specific { color: var(--critical); }

.iv-stats { list-style: none; margin: 12px 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
.iv-stats li { background: var(--quiet); border-radius: 8px; padding: 9px 11px; display: flex; flex-direction: column; }
.iv-stat-value { font-size: 17px; font-weight: 620; font-variant-numeric: tabular-nums; }
.iv-stat-label { font-size: 10.5px; color: var(--ink-muted); text-transform: lowercase; }

.iv-cases { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.iv-cases li { display: flex; flex-direction: column; padding-left: 10px; border-left: 2px solid var(--rule); }
.iv-cases strong { font-size: 12.5px; font-weight: 600; }
.iv-cases span { font-size: 12px; color: var(--ink-2); }
.iv-counter { margin: 12px 0 0; font-size: 12px; color: var(--ink-2); padding: 10px 12px; background: var(--quiet); border-radius: 8px; }
.iv-counter strong { color: var(--ink); }

.iv-question {
  border: 1px solid var(--accent); border-radius: 12px; padding: 16px;
  background: var(--surface); display: flex; flex-direction: column; gap: 6px;
}
.iv-question-tag { font-size: 10.5px; font-weight: 620; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
.iv-question p { margin: 0; font-size: 16px; font-weight: 520; line-height: 1.45; }

.iv-cooling { margin: 0; font-size: 12.5px; color: var(--ink-2); padding: 0 2px; }

.iv-actions { display: flex; flex-direction: column; gap: 7px; }
.iv-btn {
  width: 100%; text-align: left; padding: 11px 14px; border-radius: 9px;
  border: 1px solid var(--ring); background: var(--surface); color: var(--ink);
  font-family: inherit; font-size: 13px; font-weight: 520; cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.iv-btn:hover:not(:disabled) { border-color: var(--accent); }
.iv-btn:disabled { opacity: 0.5; cursor: default; }
.iv-btn--ghost { background: transparent; color: var(--ink-2); border-style: dashed; }

.iv-done {
  border: 1px solid var(--ring); border-radius: 10px; padding: 14px;
  background: var(--surface); display: flex; flex-direction: column; gap: 4px;
}
.iv-done strong { font-size: 13px; }
.iv-done span { font-size: 12px; color: var(--ink-2); }

.iv-foot {
  display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  font-size: 11px; color: var(--ink-muted); border-top: 1px solid var(--rule); padding-top: 10px;
}
.iv-ok { color: var(--good); font-weight: 600; }
.iv-bad { color: var(--critical); font-weight: 600; }

@media (max-width: 480px) {
  .iv-root { padding: 14px; }
  .iv-title { font-size: 17px; }
  .iv-question p { font-size: 15px; }
}
`;
