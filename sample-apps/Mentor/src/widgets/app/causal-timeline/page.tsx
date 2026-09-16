'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

/**
 * CausalTimeline — MENTOR's glass box, and the differentiator a judge can point at.
 *
 * Two rows: the plan the student drew, and the order they actually built in. The
 * same component is highlighted in both, with a labelled arrow between them
 * showing where it moved. Copilot's answer to "what's wrong" is prose in a chat
 * panel; this is the answer to "when did I go wrong" as a diagram
 * (`MENTOR-CONCEPT.md` §5).
 *
 * The bottom of the card is the product thesis: the fix is **withheld**, and in
 * its place there is a question wired to `sendFollowUpMessage`. That matters —
 * a refusal that dead-ends the student is just an unhelpful tool. Handing them
 * the next question instead keeps it teaching (`GAPS.md` Gap 4).
 */

interface Origin {
  component: string;
  file: string;
  line: number | null;
  shouldFollow: string;
  plannedPosition: number;
  actualPosition: number;
  dependency: 'direct' | 'transitive';
  at?: string;
}

interface ConfComponent { score: number; weight: number; reason: string }

interface DriftData {
  status?: string;
  explanation?: string;
  origin?: Origin | null;
  failure?: { test?: string; file?: string; line?: number | null; message?: string } | null;
  plan_row?: string[];
  build_row?: string[];
  confidence?: number;
  confidence_components?: Record<string, ConfComponent>;
  caveats?: string[];
  fix_withheld?: boolean;
  refusal?: string;
  next_question?: string;
  unbuilt?: string[];
  unplanned?: string[];
}

const same = (a: string, b: string): boolean =>
  a.trim().toLowerCase().replace(/[\s_-]+/g, '') === b.trim().toLowerCase().replace(/[\s_-]+/g, '');

export default function CausalTimeline() {
  const theme = useTheme();
  const sdk = useWidgetSDK();
  const data = sdk.getToolOutput<DriftData>();

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f1420' : '#ffffff';
  const fg = isDark ? '#e6edf3' : '#0b1220';
  const muted = isDark ? 'rgba(230,237,243,0.6)' : 'rgba(11,18,32,0.6)';
  const card = isDark ? '#161d2b' : '#f5f7fb';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const DRIFT = '#f59e0b';
  const OK = '#10b981';

  if (!data) {
    return <div style={{ padding: 24, color: fg, background: bg }}>Waiting for a drift report…</div>;
  }

  const origin = data.origin ?? null;
  const conf = data.confidence ?? 0;
  const planRow = data.plan_row ?? [];
  const buildRow = data.build_row ?? [];
  const escalated = (data.status ?? '').toUpperCase() === 'ESCALATED';

  /** One component box. Highlighted when it's the drifted one. */
  const chip = (label: string, highlight: boolean, key: string) => (
    <span
      key={key}
      style={{
        display: 'inline-block',
        padding: '6px 11px',
        borderRadius: 8,
        fontSize: 12.5,
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        color: highlight ? '#0b1220' : fg,
        background: highlight ? DRIFT : card,
        border: `1px solid ${highlight ? DRIFT : border}`,
        fontWeight: highlight ? 700 : 500,
      }}
    >
      {label}
    </span>
  );

  const row = (labels: string[], which: 'plan' | 'build') => (
    // Wide diagrams must scroll inside their own box, never the card.
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
      {labels.length === 0 && <span style={{ fontSize: 12, color: muted }}>(nothing recorded)</span>}
      {labels.map((label, i) => (
        <span key={`${which}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: muted, fontSize: 13 }}>→</span>}
          {chip(label, !!origin && same(label, origin.component), `${which}-${i}`)}
        </span>
      ))}
    </div>
  );

  return (
    <div
      style={{
        padding: 20,
        background: bg,
        color: fg,
        borderRadius: 16,
        maxWidth: 620,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      }}
    >
      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, letterSpacing: 1 }}>MENTOR · Causal Timeline</div>
          <div style={{ fontSize: 12, color: muted }}>
            {origin ? "you didn't just write the bug — you designed it" : 'plan vs build'}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            background: escalated ? '#ef4444' : origin ? DRIFT : OK,
            padding: '4px 10px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          {escalated ? 'ABSTAINED' : origin ? 'DRIFT FOUND' : 'NO DRIFT'}
        </span>
      </div>

      {/* ── the claim, in one sentence ── */}
      {data.explanation && (
        <div
          style={{
            background: card,
            border: `1px solid ${origin ? DRIFT : border}`,
            borderLeft: `3px solid ${origin ? DRIFT : OK}`,
            borderRadius: 10,
            padding: '11px 13px',
            marginBottom: 16,
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          {data.explanation}
        </div>
      )}

      {/* ── the two rows ── */}
      <div style={{ fontSize: 10.5, letterSpacing: 1, color: muted, marginBottom: 6 }}>
        THE PLAN — what you designed
      </div>
      {row(planRow, 'plan')}

      {/* the drift connector */}
      {origin ? (
        <div style={{ margin: '10px 0', paddingLeft: 2 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: DRIFT, fontSize: 15, lineHeight: 1.2 }}>⌄</span>
            <div style={{ fontSize: 12, lineHeight: 1.55 }}>
              <span style={{ color: DRIFT, fontWeight: 700 }}>DRIFT </span>
              you designed <code style={{ fontFamily: 'monospace' }}>{origin.component}</code> to run
              after <code style={{ fontFamily: 'monospace' }}>{origin.shouldFollow}</code> (step{' '}
              {origin.plannedPosition}) — you built it at step {origin.actualPosition}.
              {origin.file && (
                <>
                  {' '}
                  <span style={{ color: DRIFT, fontFamily: 'monospace' }}>
                    {origin.file}
                    {origin.line ? `:${origin.line}` : ''}
                  </span>
                </>
              )}
              {origin.at && <span style={{ color: muted }}> · {origin.at}</span>}
              {origin.dependency === 'transitive' && (
                <div style={{ color: muted, fontSize: 11, marginTop: 2 }}>
                  (the plan ordered these two only indirectly — lower confidence)
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ margin: '10px 0', fontSize: 12, color: muted, paddingLeft: 2 }}>
          ✓ every component was built in the order you designed
        </div>
      )}

      {row(buildRow, 'build')}
      <div style={{ fontSize: 10.5, letterSpacing: 1, color: muted, marginTop: 6, marginBottom: 16 }}>
        THE BUILD — what actually happened
      </div>

      {/* ── the error the student actually saw ── */}
      {data.failure && (
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: '10px 13px',
            marginBottom: 14,
            fontSize: 12.5,
          }}
        >
          <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ </span>
          {data.failure.test}
          <div style={{ color: muted, fontFamily: 'monospace', fontSize: 11, marginTop: 3 }}>
            {data.failure.file}
            {data.failure.line ? `:${data.failure.line}` : ''}
            {data.failure.message ? ` · ${data.failure.message}` : ''}
            <span style={{ color: muted }}> ← the error you saw</span>
          </div>
        </div>
      )}

      {/* ── uncertainty, stated per-claim ── */}
      {data.confidence_components && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: conf >= 0.8 ? OK : conf >= 0.5 ? DRIFT : '#ef4444' }}>
              {conf.toFixed(2)}
            </span>
            <span style={{ fontSize: 11, color: muted }}>confidence in the origin claim</span>
          </div>
          {Object.entries(data.confidence_components).map(([name, c]) => (
            <div key={name} style={{ marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, gap: 8 }}>
                <span style={{ fontFamily: 'monospace' }}>{name}</span>
                <span>{Math.round(c.score * 100)}% × {c.weight}</span>
              </div>
              <div style={{ height: 5, background: border, borderRadius: 3, overflow: 'hidden', margin: '2px 0 2px' }}>
                <div style={{ width: `${Math.round(c.score * 100)}%`, height: '100%', background: '#3b82f6' }} />
              </div>
              <div style={{ fontSize: 10.5, color: muted, lineHeight: 1.4 }}>{c.reason}</div>
            </div>
          ))}
        </div>
      )}

      {/* where MENTOR is guessing — a student who learns to check this has learned something */}
      {data.caveats && data.caveats.length > 0 && (
        <div style={{ fontSize: 11, color: muted, marginBottom: 14, lineHeight: 1.55 }}>
          <span style={{ fontWeight: 700 }}>Where I'm less sure: </span>
          {data.caveats.join(' · ')}
        </div>
      )}

      {/* ── the refusal, and the question that replaces the patch ── */}
      {data.fix_withheld && (
        <div
          style={{
            background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.05)',
            border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⛔ No fix, on purpose</div>
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.55, marginBottom: data.next_question ? 11 : 0 }}>
            {data.refusal}
          </div>
          {data.next_question && sdk.sendFollowUpMessage && (
            <button
              type="button"
              onClick={() => sdk.sendFollowUpMessage?.(data.next_question as string)}
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                background: card,
                color: fg,
                border: `1px solid ${border}`,
                borderRadius: 9,
                padding: '10px 12px',
                fontSize: 12.5,
                fontFamily: 'inherit',
                lineHeight: 1.45,
              }}
            >
              <span style={{ color: muted }}>Ask instead → </span>
              {data.next_question}
            </button>
          )}
        </div>
      )}

      {/* ── secondary findings ── */}
      {((data.unbuilt?.length ?? 0) > 0 || (data.unplanned?.length ?? 0) > 0) && (
        <div style={{ fontSize: 11, color: muted, marginTop: 12, lineHeight: 1.6 }}>
          {(data.unbuilt?.length ?? 0) > 0 && <div>Planned, never built: {data.unbuilt?.join(', ')}</div>}
          {(data.unplanned?.length ?? 0) > 0 && <div>Built, never planned: {data.unplanned?.join(', ')}</div>}
        </div>
      )}

      {/* the timeline is wide; offer the room for it */}
      {sdk.requestFullscreen && sdk.displayMode !== 'fullscreen' && (
        <button
          type="button"
          onClick={() => sdk.requestFullscreen?.()}
          style={{
            marginTop: 14,
            cursor: 'pointer',
            background: 'transparent',
            color: muted,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        >
          Expand
        </button>
      )}
    </div>
  );
}
