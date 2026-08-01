'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import {
  Chip,
  GroundTruthFrame,
  toneForSeverity,
  toneForVerdict,
} from '../_shared/tokens';

interface Day {
  date: string;
  submitted: boolean;
  reportText: string | null;
  confidence: number | null;
  sentiment: string | null;
  blockers: string[];
  verified: boolean;
  verdict: string | null;
  matchScore: number | null;
  commits: Array<{ sha: string; message: string }>;
  pullRequests: Array<{ number: number; title: string }>;
}

interface DetailData {
  employee: {
    id: string;
    name: string;
    role: string;
    teamId: string;
    githubUsername: string;
  };
  window: { days: number; from: string; to: string };
  summary: {
    reported: number;
    missed: number;
    verified: number;
    unsupportedDays: number;
    currentConfidence: number | null;
    confidenceDelta: number;
    longestBlockerRun: number;
    openAlerts: number;
  };
  blockerRuns: Array<{ blocker: string; days: number; dates: string[] }>;
  alerts: Array<{
    id: string;
    date: string;
    severity: string;
    reason: string;
    resolved: boolean;
  }>;
  timeline: Day[];
}

export default function EmployeeDetail() {
  const { isReady, getToolOutput, theme, sendFollowUpMessage } = useWidgetSDK();
  const data = getToolOutput<DetailData>();

  if (!isReady) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={780}>
        <div className="gt-panel gt-muted">Connecting to host…</div>
      </GroundTruthFrame>
    );
  }

  if (!data) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={780}>
        <div className="gt-panel gt-muted">
          No detail data. Run <code>get_employee_detail</code>.
        </div>
      </GroundTruthFrame>
    );
  }

  const { employee, summary } = data;
  const delta = summary.confidenceDelta;

  return (
    <GroundTruthFrame theme={theme} maxWidth={780}>
      <div className="gt-panel">
        <div>
          <p className="gt-eyebrow">
            {employee.teamId} · {data.window.from} to {data.window.to}
          </p>
          <h2 className="gt-title">
            {employee.name}{' '}
            <span className="gt-muted" style={{ fontWeight: 400, fontSize: 14 }}>
              {employee.role}
            </span>
          </h2>
        </div>

        {/* The shape of the window, before any of the detail. */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip tone={summary.missed === 0 ? 'good' : 'warn'}>
            {summary.reported} of {data.window.days} days reported
          </Chip>
          {summary.currentConfidence !== null && (
            <Chip tone={delta <= -1 ? 'bad' : delta >= 1 ? 'good' : 'neutral'}>
              confidence {summary.currentConfidence}/5
              {delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}
            </Chip>
          )}
          {summary.longestBlockerRun >= 2 && (
            <Chip tone="bad">blocker {summary.longestBlockerRun}d</Chip>
          )}
          {summary.unsupportedDays > 0 && (
            <Chip tone="bad">
              {summary.unsupportedDays} unsupported day
              {summary.unsupportedDays === 1 ? '' : 's'}
            </Chip>
          )}
          {summary.openAlerts > 0 && (
            <Chip tone="bad">{summary.openAlerts} open alert{summary.openAlerts === 1 ? '' : 's'}</Chip>
          )}
        </div>

        {data.blockerRuns.some((r) => r.days >= 2) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="gt-label">Blockers that lasted</span>
            {data.blockerRuns
              .filter((r) => r.days >= 2)
              .map((r, i) => (
                <div key={i} className="gt-row gt-row--bad" style={{ flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 13 }}>{r.blocker}</span>
                  <span className="gt-mono" style={{ color: 'var(--gt-bad)', fontSize: 11.5, fontWeight: 600 }}>
                    {r.days} days · {r.dates.join('  ')}
                  </span>
                </div>
              ))}
          </div>
        )}

        {data.alerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="gt-label">Alerts raised</span>
            {data.alerts.map((a) => (
              <div
                key={a.id}
                className={`gt-row ${a.resolved ? '' : 'gt-row--bad'}`}
                style={{ flexDirection: 'column', gap: 4, opacity: a.resolved ? 0.65 : 1 }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <Chip tone={toneForSeverity(a.severity)}>{a.severity}</Chip>
                  <span className="gt-mono gt-muted" style={{ fontSize: 11.5 }}>
                    {a.date}
                  </span>
                  {a.resolved && <Chip tone="neutral">resolved</Chip>}
                </div>
                <span style={{ fontSize: 13, lineHeight: 1.5 }}>{a.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Day by day, newest first — you arrive asking about today. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="gt-label">Day by day</span>
          {data.timeline.map((d) => (
            <div
              key={d.date}
              className={`gt-row ${
                !d.submitted
                  ? 'gt-row--warn'
                  : d.verdict === 'unsupported'
                    ? 'gt-row--bad'
                    : d.verdict === 'consistent'
                      ? 'gt-row--good'
                      : ''
              }`}
              style={{ flexDirection: 'column', gap: 6 }}
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
                <span className="gt-mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {d.date}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!d.submitted && <Chip tone="warn">no report</Chip>}
                  {d.verdict && (
                    <Chip tone={toneForVerdict(d.verdict)}>
                      {d.verdict}
                      {d.matchScore !== null ? ` ${Math.round(d.matchScore * 100)}%` : ''}
                    </Chip>
                  )}
                  {d.confidence !== null && (
                    <span className="gt-mono gt-muted" style={{ fontSize: 11.5 }}>
                      {d.confidence}/5 · {d.sentiment}
                    </span>
                  )}
                </div>
              </div>

              {d.reportText && (
                <p className="gt-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                  &ldquo;{d.reportText}&rdquo;
                </p>
              )}

              {(d.commits.length > 0 || d.pullRequests.length > 0) && (
                <div
                  className="gt-mono gt-muted"
                  style={{ fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                  {d.commits.slice(0, 3).map((c) => (
                    <span key={c.sha}>
                      {c.sha}  {c.message.slice(0, 62)}
                    </span>
                  ))}
                  {d.commits.length > 3 && <span>… and {d.commits.length - 3} more commits</span>}
                  {d.pullRequests.map((pr) => (
                    <span key={pr.number}>PR #{pr.number}  {pr.title.slice(0, 58)}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="gt-btn"
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            sendFollowUpMessage(
              `Looking at ${employee.name}'s last ${data.window.days} days, what would you raise with them and what would you leave alone?`,
            )
          }
        >
          Ask what to do about this
        </button>
      </div>
    </GroundTruthFrame>
  );
}
