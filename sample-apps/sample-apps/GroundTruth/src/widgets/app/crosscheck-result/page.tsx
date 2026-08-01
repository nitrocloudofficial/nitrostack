'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import {
  Chip,
  GroundTruthFrame,
  toneColorVar,
  toneForVerdict,
} from '../_shared/tokens';

interface CrosscheckData {
  employee: { id: string; name: string; role: string; githubUsername: string };
  date: string;
  reportText: string;
  confidence: number;
  claimSupport: Array<{
    claim: string;
    assertsCompletion: boolean;
    overlap: number;
    supported: boolean;
  }>;
  blockers: string[];
  priorBlockers: Array<{ date: string; blockers: string[] }>;
  recurringBlockers?: Array<{ blocker: string; days: number; dates: string[] }>;
  commits: Array<{ sha: string; message: string; repo: string; url: string }>;
  pullRequests: Array<{
    number: number;
    title: string;
    repo: string;
    state: string;
    merged: boolean;
    url: string;
  }>;
  matchScore: number;
  verdict: string;
  observations: string[];
}

const VERDICT_LABEL: Record<string, string> = {
  consistent: 'Claims line up',
  partial: 'Partly supported',
  unsupported: 'Not supported by activity',
  'no-claims': 'Nothing to verify',
};

export default function CrosscheckResult() {
  const { isReady, getToolOutput, theme, openExternal } = useWidgetSDK();
  const data = getToolOutput<CrosscheckData>();

  if (!isReady) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={760}>
        <div className="gt-panel gt-muted">Connecting to host…</div>
      </GroundTruthFrame>
    );
  }

  if (!data) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={760}>
        <div className="gt-panel gt-muted">
          No cross-check data. Run <code>crosscheck_activity</code>.
        </div>
      </GroundTruthFrame>
    );
  }

  const tone = toneForVerdict(data.verdict);
  const pct = Math.round((data.matchScore ?? 0) * 100);
  const evidenceCount = data.commits.length + data.pullRequests.length;

  return (
    <GroundTruthFrame theme={theme} maxWidth={760}>
      <div className="gt-panel">
        {/* Header: who, when, and the headline reading */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p className="gt-eyebrow">Cross-check · {data.date}</p>
            <h2 className="gt-title">
              {data.employee.name}{' '}
              <span className="gt-muted" style={{ fontWeight: 400, fontSize: 14 }}>
                {data.employee.role}
              </span>
            </h2>
          </div>
          <Chip tone={tone}>{VERDICT_LABEL[data.verdict] ?? data.verdict}</Chip>
        </div>

        {/* Claim support meter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span className="gt-label">Claims with matching activity</span>
            <span
              className="gt-mono"
              style={{ fontSize: 18, fontWeight: 650, color: toneColorVar(tone) }}
            >
              {pct}%
            </span>
          </div>
          <div className="gt-meter">
            <span
              style={{ width: `${pct}%`, background: toneColorVar(tone) }}
              role="presentation"
            />
          </div>
        </div>

        {/* The comparison — claimed on the left, what GitHub shows on the right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="gt-label">What they reported</span>
            <p
              style={{
                margin: 0,
                padding: '10px 12px',
                background: 'var(--gt-surface-sunken)',
                borderRadius: 8,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{data.reportText}&rdquo;
            </p>

            {data.claimSupport.length > 0 && (
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {data.claimSupport.map((c, i) => (
                  <li
                    key={i}
                    className={`gt-row ${c.supported ? 'gt-row--good' : c.assertsCompletion ? 'gt-row--bad' : 'gt-row--warn'}`}
                    style={{ flexDirection: 'column', gap: 4, fontSize: 13 }}
                  >
                    <span>{c.claim}</span>
                    <span
                      className="gt-muted gt-mono"
                      style={{ fontSize: 11.5 }}
                    >
                      {c.supported ? 'matched' : 'no match'} · overlap {c.overlap}
                      {c.assertsCompletion ? ' · claims done' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="gt-label">
              What GitHub shows{' '}
              <span className="gt-mono gt-muted">
                @{data.employee.githubUsername}
              </span>
            </span>

            {evidenceCount === 0 ? (
              <p
                className="gt-muted"
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  background: 'var(--gt-surface-sunken)',
                  borderRadius: 8,
                }}
              >
                No commits or pull requests on this date.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {data.commits.map((c) => (
                  <li
                    key={c.sha}
                    className="gt-row"
                    style={{ flexDirection: 'column', gap: 3, fontSize: 13 }}
                  >
                    <button
                      onClick={() => openExternal(c.url)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'var(--gt-accent)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {c.message}
                    </button>
                    <span className="gt-mono gt-muted" style={{ fontSize: 11.5 }}>
                      {c.sha} · {c.repo}
                    </span>
                  </li>
                ))}
                {data.pullRequests.map((p) => (
                  <li
                    key={`${p.repo}#${p.number}`}
                    className="gt-row"
                    style={{ flexDirection: 'column', gap: 3, fontSize: 13 }}
                  >
                    <button
                      onClick={() => openExternal(p.url)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'var(--gt-accent)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {p.title}
                    </button>
                    <span className="gt-mono gt-muted" style={{ fontSize: 11.5 }}>
                      PR #{p.number} · {p.repo} ·{' '}
                      {p.merged ? 'merged' : p.state}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Blockers, with recurrence called out — the thing managers actually miss */}
        {(data.blockers.length > 0 || data.priorBlockers.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="gt-label">Blockers</span>
            {data.blockers.map((b, i) => {
              // Recurrence is decided server-side, where the blocker-matching
              // logic lives — the widget must not re-implement it and drift.
              const run = (data.recurringBlockers ?? []).find((r) => r.blocker === b);
              return (
                <div
                  key={i}
                  className={`gt-row ${run ? 'gt-row--bad' : 'gt-row--warn'}`}
                  style={{ flexDirection: 'column', gap: 4, fontSize: 13 }}
                >
                  <span>{b}</span>
                  {run && (
                    <span style={{ color: 'var(--gt-bad)', fontSize: 11.5, fontWeight: 600 }}>
                      {run.days} days running — also on{' '}
                      {run.dates.filter((d) => d !== data.date).join(', ')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Raw observations, so the agent's inputs stay auditable */}
        {data.observations.length > 0 && (
          <details>
            <summary
              className="gt-label"
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Observations passed to the agent ({data.observations.length})
            </summary>
            <ul
              className="gt-muted"
              style={{
                margin: '8px 0 0',
                paddingLeft: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontSize: 13,
              }}
            >
              {data.observations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </details>
        )}

        <p className="gt-muted" style={{ margin: 0, fontSize: 11.5 }}>
          Evidence only. Whether this warrants a manager&apos;s attention is the
          agent&apos;s call, explained in the conversation.
        </p>
      </div>
    </GroundTruthFrame>
  );
}
