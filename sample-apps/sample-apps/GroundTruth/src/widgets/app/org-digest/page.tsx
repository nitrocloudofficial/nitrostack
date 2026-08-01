'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import { Chip, GroundTruthFrame, toneForSeverity, type Tone } from '../_shared/tokens';

interface TeamCard {
  teamId: string;
  summary: {
    headcount: number;
    submitted: number;
    missing: number;
    verified: number;
    openAlerts: number;
    needsAttention: number;
  };
  topConcern: {
    name: string;
    role: string;
    attentionRank: number;
    reason: string | null;
  } | null;
}

interface FlaggedPerson {
  teamId: string;
  employee: { id: string; name: string; role: string };
  submitted: boolean;
  reportText: string | null;
  confidence: number | null;
  recurringBlockers: string[];
  longestBlockerRun: number;
  verdict: string | null;
  matchScore: number | null;
  commitCount: number | null;
  prCount: number | null;
  alerts: Array<{ id: string; reason: string; severity: string }>;
  attentionRank: number;
}

interface OrgData {
  date: string;
  summary: {
    headcount: number;
    submitted: number;
    missing: number;
    verified: number;
    openAlerts: number;
    needsAttention: number;
  };
  teams: TeamCard[];
  needsAttention: FlaggedPerson[];
}

/** A team's colour comes from how many of its people need attention. */
function teamTone(t: TeamCard): Tone {
  if (t.summary.needsAttention > 1) return 'bad';
  if (t.summary.needsAttention === 1) return 'warn';
  if (t.summary.missing > 0) return 'warn';
  return 'good';
}

export default function OrgDigest() {
  const { isReady, getToolOutput, theme, sendFollowUpMessage } = useWidgetSDK();
  const data = getToolOutput<OrgData>();

  if (!isReady) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={860}>
        <div className="gt-panel gt-muted">Connecting to host…</div>
      </GroundTruthFrame>
    );
  }

  if (!data) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={860}>
        <div className="gt-panel gt-muted">
          No org data. Run <code>generate_org_digest</code>.
        </div>
      </GroundTruthFrame>
    );
  }

  const { summary } = data;
  const clear = data.needsAttention.length === 0;
  // Nobody flagged means one of two very different things: a day that was
  // checked and came back fine, or a day nobody has reported yet. Only the
  // first is good news, so they must never render as the same sentence.
  const nothingReported = summary.submitted === 0;

  return (
    <GroundTruthFrame theme={theme} maxWidth={860}>
      <div className="gt-panel">
        <div>
          <p className="gt-eyebrow">
            Organisation · {data.date} · {data.teams.length} teams ·{' '}
            {summary.headcount} people
          </p>
          <h2 className="gt-title">
            {clear
              ? nothingReported
                ? 'Nothing reported yet today'
                : 'No one needs your attention today'
              : `${data.needsAttention.length} ${data.needsAttention.length === 1 ? 'person needs' : 'people need'} your attention`}
          </h2>
        </div>

        {/*
          Teams first. At org level the question is which team is struggling —
          the individual names matter once you know where to look.
        */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(224px, 1fr))',
            gap: 10,
          }}
        >
          {data.teams.map((t) => {
            const tone = teamTone(t);
            return (
              <div
                key={t.teamId}
                className={`gt-row gt-row--${tone === 'neutral' ? 'good' : tone}`}
                style={{ flexDirection: 'column', gap: 8 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{t.teamId}</strong>
                  <span className="gt-mono gt-muted" style={{ fontSize: 11.5 }}>
                    {t.summary.submitted}/{t.summary.headcount}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/*
                    Nobody flagged is only "all clear" if somebody actually
                    reported. A team where no one has filed yet is unknown, not
                    fine, and reading "all clear" next to "6 missing" invites the
                    exact complacency this digest exists to prevent.
                  */}
                  {t.summary.needsAttention > 0 && (
                    <Chip tone={tone}>
                      {t.summary.needsAttention} need attention
                    </Chip>
                  )}
                  {t.summary.needsAttention === 0 && t.summary.submitted > 0 && (
                    <Chip tone="good">all clear</Chip>
                  )}
                  {t.summary.submitted === 0 ? (
                    <Chip tone="warn">no reports yet</Chip>
                  ) : (
                    t.summary.missing > 0 && (
                      <Chip tone="warn">{t.summary.missing} missing</Chip>
                    )
                  )}
                  {t.summary.openAlerts > 0 && (
                    <Chip tone="bad">{t.summary.openAlerts} alert{t.summary.openAlerts === 1 ? '' : 's'}</Chip>
                  )}
                </div>

                {t.topConcern && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                      {t.topConcern.name}{' '}
                      <span className="gt-muted" style={{ fontWeight: 400 }}>
                        {t.topConcern.role}
                      </span>
                    </span>
                    {t.topConcern.reason && (
                      <span className="gt-muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
                        {t.topConcern.reason}
                      </span>
                    )}
                  </div>
                )}

                <button
                  className="gt-btn gt-btn--quiet"
                  style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: 12 }}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show me the full digest for ${t.teamId} on ${data.date}.`,
                    )
                  }
                >
                  Open team
                </button>
              </div>
            );
          })}
        </div>

        {/* Then the people, across every team, worst first. */}
        {clear ? (
          <p className="gt-muted" style={{ margin: 0, fontSize: 13 }}>
            {nothingReported
              ? 'No one has filed an EOD report yet, so there is nothing to verify. This is an empty day, not a clear one.'
              : summary.missing > 0
                ? `Nothing crossed the attention threshold. ${summary.missing} of ${summary.headcount} have not reported yet, so this is a clear read on the ones who did — not on the whole org.`
                : 'Every team reported and nothing crossed the attention threshold. That is a real answer, not an empty result — most days should look like this.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="gt-label">Across every team, worst first</span>
            {data.needsAttention.map((p) => (
              <div
                key={p.employee.id}
                className="gt-row gt-row--bad"
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
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14.5 }}>{p.employee.name}</strong>
                    <span className="gt-muted" style={{ fontSize: 12.5 }}>
                      {p.employee.role} · {p.teamId}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.longestBlockerRun >= 2 && (
                      <Chip tone="bad">blocker {p.longestBlockerRun}d</Chip>
                    )}
                    {p.alerts.map((a) => (
                      <Chip key={a.id} tone={toneForSeverity(a.severity)}>
                        {a.severity}
                      </Chip>
                    ))}
                    {!p.submitted && <Chip tone="warn">no report</Chip>}
                  </div>
                </div>

                {p.alerts.map((a) => (
                  <span key={a.id} style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {a.reason}
                  </span>
                ))}

                {p.alerts.length === 0 && p.recurringBlockers.length > 0 && (
                  <span style={{ color: 'var(--gt-bad)', fontSize: 12.5, fontWeight: 600 }}>
                    Blocker repeating: {p.recurringBlockers.join('; ')}
                  </span>
                )}

                <button
                  className="gt-btn gt-btn--quiet"
                  style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: 12 }}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show me ${p.employee.name}'s recent history and tell me what is going on.`,
                    )
                  }
                >
                  Look into {p.employee.name.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </GroundTruthFrame>
  );
}
