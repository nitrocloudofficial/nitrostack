'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import {
  Chip,
  GroundTruthFrame,
  toneForSeverity,
  toneForVerdict,
  type Tone,
} from '../_shared/tokens';

interface DigestRow {
  employee: { id: string; name: string; role: string };
  submitted: boolean;
  reportText: string | null;
  confidence: number | null;
  sentiment: string | null;
  blockers: string[];
  recurringBlockers: string[];
  longestBlockerRun: number;
  verified: boolean;
  matchScore: number | null;
  verdict: string | null;
  commitCount: number | null;
  prCount: number | null;
  alerts: Array<{ id: string; reason: string; severity: string }>;
  attentionRank: number;
}

interface DigestData {
  teamId: string;
  date: string;
  summary: {
    headcount: number;
    submitted: number;
    missing: number;
    verified: number;
    openAlerts: number;
    needsAttention: number;
  };
  rows: DigestRow[];
}

/** The row's overall tone: the most severe signal on it wins. */
function rowTone(row: DigestRow): Tone {
  if (row.alerts.some((a) => a.severity === 'high')) return 'bad';
  if (row.recurringBlockers.length > 0) return 'bad';
  if (row.alerts.some((a) => a.severity === 'medium')) return 'warn';
  if (row.verdict === 'unsupported') return 'bad';
  if (row.verdict === 'partial') return 'warn';
  if (!row.submitted) return 'warn';
  if (row.verdict === 'consistent') return 'good';
  return 'neutral';
}

function Stat({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: number;
  tone?: Tone;
  compact?: boolean;
}) {
  const color =
    tone === 'bad'
      ? 'var(--gt-bad)'
      : tone === 'warn'
        ? 'var(--gt-warn)'
        : tone === 'good'
          ? 'var(--gt-good)'
          : 'var(--gt-text)';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: compact ? '6px 11px' : '10px 14px',
        background: 'var(--gt-surface-sunken)',
        borderRadius: 8,
        minWidth: compact ? 74 : 92,
      }}
    >
      <span
        className="gt-mono"
        style={{ fontSize: compact ? 17 : 22, fontWeight: 650, color, lineHeight: 1.1 }}
      >
        {value}
      </span>
      <span className="gt-eyebrow" style={{ fontSize: 10 }}>
        {label}
      </span>
    </div>
  );
}

export default function TeamDigest() {
  const { isReady, getToolOutput, theme, sendFollowUpMessage, requestFullscreen } =
    useWidgetSDK();
  const data = getToolOutput<DigestData>();

  /*
   * Detailed by default, however many people there are.
   *
   * Compacting past a row threshold was tried and reverted: it buys a digest that
   * fits on one screen at the cost of the report text, and the report text is the
   * thing a manager actually reads. Scrolling a longer, fuller list is the better
   * trade. Compact remains one click away for anyone who wants the overview.
   */
  const [compact, setCompact] = useState(false);

  if (!isReady) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={820}>
        <div className="gt-panel gt-muted">Connecting to host…</div>
      </GroundTruthFrame>
    );
  }

  if (!data) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={820}>
        <div className="gt-panel gt-muted">
          No digest data. Run <code>generate_daily_digest</code>.
        </div>
      </GroundTruthFrame>
    );
  }

  const { summary } = data;

  return (
    <GroundTruthFrame theme={theme} maxWidth={820}>
      <div
        className="gt-panel"
        style={compact ? { padding: 14, gap: 10 } : undefined}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
          <p className="gt-eyebrow">
            {data.teamId} · {data.date}
          </p>
          <h2 className="gt-title">
            {summary.needsAttention === 0
              ? 'Nothing needs your attention today'
              : `${summary.needsAttention} ${summary.needsAttention === 1 ? 'person needs' : 'people need'} your attention`}
          </h2>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              className="gt-btn gt-btn--quiet"
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => setCompact((v) => !v)}
            >
              {compact ? 'Expand rows' : 'Compact'}
            </button>
            <button
              className="gt-btn gt-btn--quiet"
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => requestFullscreen()}
            >
              Fullscreen
            </button>
          </div>
        </div>

        {/* Summary first — a manager should get the shape of the day without scrolling */}
        <div className="gt-scroll">
          <div style={{ display: 'flex', gap: 8, minWidth: 'min-content' }}>
            <Stat label="Reported" value={summary.submitted} compact={compact} />
            <Stat
              label="Missing"
              value={summary.missing}
              tone={summary.missing > 0 ? 'warn' : undefined}
              compact={compact}
            />
            <Stat label="Verified" value={summary.verified} compact={compact} />
            <Stat
              label="Open alerts"
              value={summary.openAlerts}
              tone={summary.openAlerts > 0 ? 'bad' : undefined}
              compact={compact}
            />
          </div>
        </div>

        {/* Rows, worst first — ordering is the digest's main job */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
          {data.rows.map((row) => {
            const tone = rowTone(row);
            // Anyone flagged keeps their explanation even when the list is dense.
            const flagged = row.alerts.length > 0 || row.recurringBlockers.length > 0;

            return (
              <div
                key={row.employee.id}
                className={`gt-row gt-row--${tone === 'neutral' ? 'good' : tone}`}
                style={{
                  flexDirection: 'column',
                  gap: compact ? 3 : 8,
                  padding: compact ? '7px 12px' : '12px 14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: compact ? 13.5 : 14.5 }}>
                      {row.employee.name}
                    </strong>
                    <span className="gt-muted" style={{ fontSize: compact ? 11.5 : 12.5 }}>
                      {row.employee.role}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    {/* Compact rows fold the stats into the same line as the chips. */}
                    {compact && row.submitted && (
                      <span className="gt-mono gt-muted" style={{ fontSize: 11 }}>
                        {row.commitCount !== null ? `${row.commitCount}c ` : ''}
                        {row.prCount !== null ? `${row.prCount}pr ` : ''}
                        {row.confidence !== null ? `${row.confidence}/5` : ''}
                      </span>
                    )}
                    {!row.submitted && <Chip tone="warn">no report</Chip>}
                    {row.recurringBlockers.length > 0 && (
                      <Chip tone="bad">blocker {row.longestBlockerRun}d</Chip>
                    )}
                    {row.verdict && (
                      <Chip tone={toneForVerdict(row.verdict)}>
                        {row.verdict}
                        {row.matchScore !== null ? ` ${Math.round(row.matchScore * 100)}%` : ''}
                      </Chip>
                    )}
                    {row.alerts.map((a) => (
                      <Chip key={a.id} tone={toneForSeverity(a.severity)}>
                        {a.severity}
                      </Chip>
                    ))}
                    {!compact && row.submitted && !row.verified && (
                      <Chip tone="neutral">unverified</Chip>
                    )}
                  </div>
                </div>

                {!compact && row.reportText && (
                  <p className="gt-muted" style={{ margin: 0, fontSize: 13 }}>
                    &ldquo;{row.reportText}&rdquo;
                  </p>
                )}

                {/* The reason a flagged person is flagged survives compaction. */}
                {(!compact || flagged) &&
                  row.alerts.map((a) => (
                    <span key={a.id} style={{ fontSize: compact ? 12 : 13 }}>
                      {a.reason}
                    </span>
                  ))}

                {(!compact || flagged) && row.recurringBlockers.length > 0 && (
                  <span style={{ color: 'var(--gt-bad)', fontSize: 12, fontWeight: 600 }}>
                    Blocker repeating: {row.recurringBlockers.join('; ')}
                  </span>
                )}

                {!compact && row.submitted && (
                  <div
                    className="gt-mono gt-muted"
                    style={{ display: 'flex', gap: 14, fontSize: 11.5, flexWrap: 'wrap' }}
                  >
                    {row.commitCount !== null && (
                      <span>{row.commitCount} commit{row.commitCount === 1 ? '' : 's'}</span>
                    )}
                    {row.prCount !== null && (
                      <span>{row.prCount} PR{row.prCount === 1 ? '' : 's'}</span>
                    )}
                    {row.confidence !== null && <span>confidence {row.confidence}/5</span>}
                    {row.sentiment && <span>tone {row.sentiment}</span>}
                  </div>
                )}

                {!compact && row.submitted && !row.verified && (
                  <button
                    className="gt-btn gt-btn--quiet"
                    style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12.5 }}
                    onClick={() =>
                      sendFollowUpMessage(
                        `Review the EOD report for ${row.employee.id} on ${data.date}.`,
                      )
                    }
                  >
                    Verify now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GroundTruthFrame>
  );
}
