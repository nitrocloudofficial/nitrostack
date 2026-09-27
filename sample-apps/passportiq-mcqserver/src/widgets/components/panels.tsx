/**
 * Review panels: risk gauge, applicant detail, stage timeline, audit trail,
 * officer decision, evidence explorer.
 *
 * A THEME RUNS THROUGH ALL OF THESE
 * --------------------------------
 * Nothing here ever presents a machine output as a conclusion. The gauge shows a
 * score *and* the rules that produced it; the timeline shows which stages ran and
 * which did not; the decision panel is the only place an outcome is created, it
 * requires a named officer and a written justification, and it says out loud that
 * the recommendation is advisory. That is not UI politeness — an officer is
 * personally accountable for a passport decision, so the interface has to make the
 * machine's role visibly subordinate.
 */
import React from 'react';
import { COLORS, bandLabel, bandOf, riskBorder, riskColor, riskSoft, type RiskLevel } from '../lib/theme.js';
import { asArray, clockTime, dateTime, humanise, initials, pctOf1, truncate } from '../lib/format.js';
import { Bar, Button, Card, Chip, Field, Fields, Pill, RiskPill } from './chrome.jsx';
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconDoc,
  IconEye,
  IconLink,
  IconMail,
  IconPhone,
  IconPin,
  IconQuestion,
  IconX,
} from './icons.jsx';

// ---------------------------------------------------------------------------
// Risk gauge
// ---------------------------------------------------------------------------

/**
 * The circular risk gauge.
 *
 * `strokeDasharray`/`strokeDashoffset` on a rotated circle, rather than an arc
 * path: it animates smoothly with a single CSS transition and cannot produce the
 * degenerate-arc rendering bug an SVG `A` command hits at exactly 0% and 100%.
 */
export function RiskDonut({
  score,
  size = 132,
  thickness = 11,
  caption,
}: {
  score: number | null | undefined;
  size?: number;
  thickness?: number;
  caption?: string;
}) {
  const value = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  const band = bandOf(value);
  const color = riskColor(band);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = value === null ? circumference : circumference * (1 - value / 100);

  return (
    <div className="piq-donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.surfaceAlt}
          strokeWidth={thickness}
        />
        <circle
          className="piq-donut-ring"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="piq-donut-center">
        <span className="piq-donut-value" style={{ color }}>
          {value === null ? '—' : `${Math.round(value)}%`}
        </span>
        <span className="piq-donut-label" style={{ color }}>
          {caption ?? bandLabel(band)}
        </span>
      </div>
      <span className="piq-sr-only" style={{ position: 'absolute', left: -9999 }}>
        {value === null ? 'Not scored' : `Risk score ${Math.round(value)} of 100, ${bandLabel(band)}`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applicant detail panel
// ---------------------------------------------------------------------------

export interface ApplicantDetail {
  applicationId?: string;
  applicantName?: string;
  applicationType?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  phone?: string | null;
  email?: string | null;
  address?: string;
  submittedAt?: string;
  status?: string;
  riskScore?: number | null;
  confidence?: number | null;
  linkedApplicationIds?: string[];
}

/**
 * The applicant identity mark.
 *
 * Deliberately initials on a risk-tinted disc rather than a photograph. A passport
 * application does contain a face image, but rendering it here would put a
 * biometric on screen next to a machine risk score — which invites exactly the
 * snap judgement this product is built to prevent. The document photo remains
 * available in the evidence explorer, where it is examined on purpose.
 */
function ApplicantAvatar({ name, band, size = 46 }: { name?: string; band: RiskLevel; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: `0 0 ${size}px`,
        width: size,
        height: size,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: riskSoft(band),
        border: `1.5px solid ${riskBorder(band)}`,
        color: riskColor(band),
        fontSize: size * 0.36,
        fontWeight: 750,
        letterSpacing: '-.02em',
      }}
    >
      {initials(name ?? '?')}
    </span>
  );
}

export function ApplicantPanel({
  detail,
  onViewEvidence,
  onSelectLinked,
  headline,
}: {
  detail: ApplicantDetail;
  onViewEvidence?: () => void;
  /** Jump to a linked application. This is how a ring gets walked. */
  onSelectLinked?: (applicationId: string) => void;
  headline?: string;
}) {
  const band = bandOf(detail.riskScore ?? null);
  const linked = asArray<string>(detail.linkedApplicationIds);

  return (
    <Card title="Applicant Details" eyebrow="Selected Application">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <ApplicantAvatar name={detail.applicantName} band={band} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-.02em',
              color: COLORS.textPrimary,
              lineHeight: 1.25,
            }}
          >
            {detail.applicantName ?? '—'}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              color: COLORS.textSecondary,
              marginTop: 2,
            }}
          >
            {detail.applicationId ?? '—'}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <RiskPill band={band} />
            {detail.applicationType && <Pill square>{humanise(detail.applicationType)}</Pill>}
          </div>
        </div>
      </div>

      {/* Score and machine confidence side by side. Showing them together is the
          point: a high score the machine is unsure of is a different case from a
          high score it is certain of, and the officer needs both numbers. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <RiskDonut score={detail.riskScore ?? null} size={96} thickness={9} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1 }}>
          <div>
            <div className="piq-eyebrow">Risk score</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: riskColor(band),
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {typeof detail.riskScore === 'number' ? `${Math.round(detail.riskScore)}%` : '—'}
            </div>
          </div>
          <div>
            <div className="piq-eyebrow">Machine confidence</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: typeof detail.confidence === 'number' ? COLORS.machine : COLORS.textMuted,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {typeof detail.confidence === 'number' ? pctOf1(detail.confidence) : '—'}
            </div>
          </div>
        </div>
      </div>

      {headline && (
        <div
          style={{
            padding: '10px 12px',
            background: riskSoft(band),
            border: `1px solid ${riskBorder(band)}`,
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.55,
            color: COLORS.textPrimary,
            marginBottom: 14,
          }}
        >
          {headline}
        </div>
      )}

      <Fields>
        <Field label="Applied On">{detail.submittedAt ? dateTime(detail.submittedAt) : '—'}</Field>
        <Field label="Date of Birth">{detail.dateOfBirth ?? '—'}</Field>
        <Field label="Passport No." mono>
          {detail.passportNumber ?? '—'}
        </Field>
        <Field label="Phone">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconPhone size={13} />
            {detail.phone ?? '—'}
          </span>
        </Field>
        <Field label="Email">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconMail size={13} />
            {detail.email ?? '—'}
          </span>
        </Field>
        <Field label="Address">
          <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
            <IconPin size={13} />
            <span>{detail.address ?? '—'}</span>
          </span>
        </Field>
        <Field
          label={linked.length === 0 ? 'Linked To' : `Linked To (${linked.length})`}
        >
          {linked.length === 0 ? (
            <span style={{ color: COLORS.textSecondary }}>No linked applications</span>
          ) : (
            <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
              {/* Clickable when a handler is supplied. Walking from one member of a
                  ring to the next is the core investigative motion, and making the
                  officer copy an id back into the queue filter breaks it. */}
              {linked.map((id) =>
                onSelectLinked ? (
                  <button
                    key={id}
                    type="button"
                    className="piq-chip"
                    onClick={() => onSelectLinked(id)}
                    style={{ cursor: 'pointer', border: `1px solid ${COLORS.accentBorder}`, color: COLORS.accent }}
                    title={`Open ${id}`}
                  >
                    <IconLink size={11} />
                    {id}
                  </button>
                ) : (
                  <Chip key={id} icon={<IconLink size={11} />}>
                    {id}
                  </Chip>
                ),
              )}
            </span>
          )}
        </Field>
      </Fields>

      {onViewEvidence && (
        <div style={{ marginTop: 14 }}>
          <Button variant="primary" block icon={<IconEye size={15} />} onClick={onViewEvidence}>
            View Evidence
          </Button>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stage timeline
// ---------------------------------------------------------------------------

export interface StageRow {
  stage: string;
  completed?: boolean;
  required?: boolean;
  at?: string | null;
  detail?: string;
}

export function StageTimeline({ stages }: { stages: StageRow[] }) {
  const rows = asArray<StageRow>(stages);
  if (rows.length === 0) return <div className="piq-empty">No pipeline stages recorded yet.</div>;

  // The first incomplete required stage is "next" — highlighting it tells the
  // officer what is blocking the decision gate without them counting stages.
  const nextIndex = rows.findIndex((row) => !row.completed && row.required !== false);

  return (
    <div className="piq-timeline">
      {rows.map((row, index) => {
        const state = row.completed ? 'is-done' : index === nextIndex ? 'is-active' : '';
        return (
          <div className="piq-tl-item" key={`${row.stage}-${index}`}>
            <span className={`piq-tl-dot ${state}`}>
              {row.completed ? <IconCheck size={9} /> : null}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="piq-tl-title">{humanise(row.stage)}</span>
              {row.required === false && (
                <span style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600 }}>
                  optional
                </span>
              )}
              {!row.completed && index === nextIndex && (
                <span style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700 }}>NEXT</span>
              )}
            </div>
            <div className="piq-tl-meta">
              {row.completed ? (row.at ? clockTime(row.at) : 'completed') : 'pending'}
            </div>
            {row.detail && <div className="piq-tl-body">{row.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export interface AuditRow {
  at?: string;
  actor?: string;
  title?: string;
  detail?: string;
  tone?: 'done' | 'flag' | 'active' | 'machine';
}

export function AuditTrail({ rows }: { rows: AuditRow[] }) {
  const items = asArray<AuditRow>(rows);
  if (items.length === 0)
    return (
      <div className="piq-empty">
        Nothing recorded yet. Every stage, agent step and officer decision is appended here.
      </div>
    );

  return (
    <div className="piq-timeline">
      {items.map((row, index) => (
        <div className="piq-tl-item" key={`${row.at ?? index}-${index}`}>
          <span
            className={`piq-tl-dot ${
              row.tone === 'flag' ? 'is-flag' : row.tone === 'active' ? 'is-active' : 'is-done'
            }`}
            style={
              row.tone === 'machine'
                ? { background: COLORS.machine, borderColor: COLORS.machine }
                : undefined
            }
          >
            {row.tone === 'flag' ? <IconAlert size={9} /> : <IconCheck size={9} />}
          </span>
          <div className="piq-tl-title">{row.title ?? '—'}</div>
          <div className="piq-tl-meta">
            {row.at ? clockTime(row.at) : '—'}
            {row.actor ? ` · ${row.actor}` : ''}
          </div>
          {row.detail && <div className="piq-tl-body">{row.detail}</div>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk summary (score + the rules behind it)
// ---------------------------------------------------------------------------

export interface RiskFlag {
  label?: string;
  ruleId?: string;
  severity?: string;
  weight?: number;
  citation?: string;
  detail?: string;
}

export function RiskSummary({
  score,
  recommendation,
  flags,
  narrative,
}: {
  score: number | null | undefined;
  recommendation?: string | null;
  flags: RiskFlag[];
  narrative?: string | null;
}) {
  const items = asArray<RiskFlag>(flags);
  const band = bandOf(score ?? null);

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <RiskDonut score={score ?? null} size={128} />
        {recommendation && (
          <Pill color={riskColor(band)} background={riskSoft(band)} border={riskBorder(band)}>
            Recommends {humanise(recommendation)}
          </Pill>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 240 }}>
        {narrative && (
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 12.5,
              lineHeight: 1.65,
              color: COLORS.textSecondary,
            }}
          >
            {narrative}
          </p>
        )}

        {items.length === 0 ? (
          <div style={{ fontSize: 12.5, color: COLORS.textSecondary }}>
            No rules fired. Run <strong>evaluate_rules</strong> to populate the cited findings.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((flag, index) => {
              const sev = (flag.severity ?? 'medium') as RiskLevel;
              return (
                <div
                  key={`${flag.ruleId ?? flag.label ?? index}-${index}`}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '9px 11px',
                    background: COLORS.surfaceSunken,
                    border: `1px solid ${COLORS.border}`,
                    borderLeft: `3px solid ${riskColor(sev)}`,
                    borderRadius: 7,
                  }}
                >
                  <span style={{ color: riskColor(sev), display: 'flex', paddingTop: 1 }}>
                    <IconAlert size={14} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textPrimary }}>
                      {flag.label ?? humanise(flag.ruleId)}
                    </div>
                    {flag.detail && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: COLORS.textSecondary,
                          marginTop: 2,
                          lineHeight: 1.5,
                        }}
                      >
                        {flag.detail}
                      </div>
                    )}
                    {/* The citation is the whole point of the rulebook: an officer
                        must be able to point at the rule, not at a model. */}
                    {flag.citation && (
                      <div
                        style={{
                          fontSize: 10.5,
                          color: COLORS.textMuted,
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        {flag.citation}
                      </div>
                    )}
                  </div>
                  {typeof flag.weight === 'number' && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: riskColor(sev),
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +{Math.round(flag.weight)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Officer decision
// ---------------------------------------------------------------------------

export type DecisionKind = 'approve' | 'clarify' | 'reject';

const CHOICES: Array<{
  kind: DecisionKind;
  title: string;
  desc: string;
  color: string;
  soft: string;
  border: string;
  icon: React.ReactNode;
}> = [
  {
    kind: 'approve',
    title: 'Approve',
    desc: 'No adverse findings. Issue the passport.',
    color: COLORS.low,
    soft: COLORS.lowSoft,
    border: COLORS.lowBorder,
    icon: <IconCheck size={15} />,
  },
  {
    kind: 'clarify',
    title: 'Request Clarification',
    desc: 'Ask the applicant for documents or an explanation.',
    color: COLORS.medium,
    soft: COLORS.mediumSoft,
    border: COLORS.mediumBorder,
    icon: <IconQuestion size={15} />,
  },
  {
    kind: 'reject',
    title: 'Reject',
    desc: 'Findings are disqualifying. Record the refusal.',
    color: COLORS.high,
    soft: COLORS.highSoft,
    border: COLORS.highBorder,
    icon: <IconX size={15} />,
  },
];

const MAX_NOTE = 500;
/** The server's own minimum. Enforced here too so the officer is told before submitting. */
const MIN_NOTE = 20;

export function OfficerDecision({
  onSubmit,
  disabled,
  disabledReason,
  recommendation,
  recommendationRationale,
  checklist,
  requiresSeniorReview,
  officerName,
  decided,
  busy,
  error,
}: {
  onSubmit?: (decision: DecisionKind, note: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  recommendation?: string | null;
  /** Why the machine recommends what it recommends, in its own words. */
  recommendationRationale?: string | null;
  /** The agent's ordered worst-first list of what a human should check. */
  checklist?: string[];
  /** Set when the agent's confidence fell below the escalation floor. */
  requiresSeniorReview?: boolean;
  officerName?: string;
  decided?: { decision: string; at?: string; by?: string; note?: string } | null;
  busy?: boolean;
  error?: string | null;
}) {
  const [picked, setPicked] = React.useState<DecisionKind | null>(null);
  const [note, setNote] = React.useState('');

  if (decided) {
    const band =
      decided.decision === 'approve' ? 'low' : decided.decision === 'reject' ? 'high' : 'medium';
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            background: riskSoft(band),
            border: `1px solid ${riskBorder(band)}`,
            borderRadius: 8,
          }}
        >
          <span style={{ color: riskColor(band), display: 'flex' }}>
            <IconCheck size={17} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 650, color: COLORS.textPrimary }}>
              Decision recorded: {humanise(decided.decision)}
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textSecondary, marginTop: 1 }}>
              {decided.by ? `${decided.by} · ` : ''}
              {decided.at ? dateTime(decided.at) : ''} · retained in the audit trail
            </div>
          </div>
        </div>
        {decided.note && (
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 12,
              lineHeight: 1.6,
              color: COLORS.textSecondary,
              fontStyle: 'italic',
            }}
          >
            “{decided.note}”
          </p>
        )}
      </div>
    );
  }

  const tooShort = note.trim().length > 0 && note.trim().length < MIN_NOTE;
  const canSubmit =
    !disabled && !busy && picked !== null && note.trim().length >= MIN_NOTE && note.length <= MAX_NOTE;

  return (
    <div>
      {requiresSeniorReview && (
        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            padding: '10px 12px',
            background: COLORS.highSoft,
            border: `1px solid ${COLORS.highBorder}`,
            borderRadius: 8,
            marginBottom: 10,
            fontSize: 12,
            lineHeight: 1.55,
            color: '#991B1B',
          }}
        >
          <span style={{ display: 'flex', paddingTop: 1 }}>
            <IconAlert size={14} />
          </span>
          <span>
            <strong>Senior review requested.</strong> The agent&apos;s confidence fell below the
            escalation floor, or a hard escalation rule fired. Do not clear this alone.
          </span>
        </div>
      )}

      {recommendation && (
        <div
          style={{
            padding: '10px 12px',
            background: COLORS.machineSoft,
            border: '1px solid #E9D5FF',
            borderRadius: 8,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span style={{ color: COLORS.machine, display: 'flex', paddingTop: 1 }}>
              <IconAlert size={14} />
            </span>
            <div style={{ fontSize: 12, lineHeight: 1.55, color: '#5B21B6' }}>
              <strong>Agent recommends {humanise(recommendation)}.</strong> This is advisory only —
              the decision below is yours and is recorded against your name.
            </div>
          </div>

          {/* The rationale is what makes the recommendation reviewable rather than
              oracular. An officer who cannot see the reasoning has no basis to
              disagree with it, and disagreeing is the whole point of the gate. */}
          {recommendationRationale && (
            <p
              style={{
                margin: '9px 0 0 23px',
                fontSize: 11.5,
                lineHeight: 1.6,
                color: '#6D28D9',
              }}
            >
              {recommendationRationale}
            </p>
          )}

          {asArray<string>(checklist).length > 0 && (
            <div style={{ margin: '10px 0 0 23px' }}>
              <div
                className="piq-eyebrow"
                style={{ color: '#6D28D9', marginBottom: 5 }}
              >
                Suggested checks — worst first
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  fontSize: 11.5,
                  lineHeight: 1.7,
                  color: '#5B21B6',
                }}
              >
                {asArray<string>(checklist).map((item, index) => (
                  <li key={`${index}-${item.slice(0, 12)}`}>{item}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {disabled && disabledReason && (
        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            padding: '10px 12px',
            background: COLORS.mediumSoft,
            border: `1px solid ${COLORS.mediumBorder}`,
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 12,
            lineHeight: 1.55,
            color: '#92400E',
          }}
        >
          <span style={{ display: 'flex', paddingTop: 1 }}>
            <IconClock size={14} />
          </span>
          <span>{disabledReason}</span>
        </div>
      )}

      <div className="piq-choices">
        {CHOICES.map((choice) => {
          const isPicked = picked === choice.kind;
          return (
            <button
              key={choice.kind}
              type="button"
              className={`piq-choice${isPicked ? ' is-picked' : ''}`}
              onClick={() => setPicked(choice.kind)}
              disabled={disabled}
              style={
                isPicked
                  ? { borderColor: choice.color, background: choice.soft }
                  : undefined
              }
              aria-pressed={isPicked}
            >
              <div className="piq-choice-top">
                <span style={{ color: choice.color, display: 'flex' }}>{choice.icon}</span>
                <span className="piq-choice-title">{choice.title}</span>
              </div>
              <div className="piq-choice-desc">{choice.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <label
          htmlFor="piq-note"
          style={{
            display: 'block',
            fontSize: 11.5,
            fontWeight: 600,
            color: COLORS.textSecondary,
            marginBottom: 6,
          }}
        >
          Officer justification <span style={{ color: COLORS.high }}>*</span>
        </label>
        <textarea
          id="piq-note"
          className="piq-textarea"
          value={note}
          maxLength={MAX_NOTE}
          disabled={disabled}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Record the reasoning a reviewer would need in six months: what you checked, what convinced you, and what you discounted."
        />
        <div className={`piq-counter${tooShort ? ' is-over' : ''}`}>
          {tooShort ? `At least ${MIN_NOTE} characters — ` : ''}
          {note.length}/{MAX_NOTE}
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: '9px 11px',
            background: COLORS.highSoft,
            border: `1px solid ${COLORS.highBorder}`,
            borderRadius: 7,
            fontSize: 12,
            lineHeight: 1.55,
            color: '#991B1B',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 11.5, color: COLORS.textMuted }}>
          {officerName ? `Signing as ${officerName}` : 'Signed against your officer identity'}
        </span>
        <Button
          variant="primary"
          disabled={!canSubmit}
          onClick={() => picked && onSubmit?.(picked, note.trim())}
          title={
            canSubmit
              ? undefined
              : 'Choose an outcome and write at least 20 characters of justification.'
          }
        >
          {busy ? 'Recording…' : 'Record Decision'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence explorer
// ---------------------------------------------------------------------------

export function EvidenceModal({
  open,
  onClose,
  title,
  subtitle,
  signals,
  documents,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  signals: Array<{
    type?: string;
    severity?: string;
    confidence?: number;
    matchedApplicationId?: string;
    evidence?: Record<string, unknown>;
  }>;
  documents?: Array<{ type?: string; documentId?: string; imageHash?: string; issuedOn?: string | null }>;
}) {
  // Escape-to-close: a modal that traps the officer is a support ticket.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const rows = asArray<Record<string, unknown>>(signals);
  const docs = asArray<Record<string, unknown>>(documents);

  return (
    <div className="piq-overlay" onClick={onClose} role="presentation">
      <div
        className="piq-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="piq-modal-head">
          <div style={{ minWidth: 0 }}>
            <div className="piq-eyebrow">Evidence</div>
            <div className="piq-card-title">{title}</div>
            {subtitle && <div className="piq-card-sub">{subtitle}</div>}
          </div>
          <div className="piq-card-actions">
            <Button small icon={<IconX size={14} />} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="piq-modal-body piq-scroll">
          <div className="piq-eyebrow" style={{ marginBottom: 9 }}>
            Reused identifiers ({rows.length})
          </div>
          {rows.length === 0 ? (
            <div className="piq-empty">No reused identifiers found for this application.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
              {rows.map((signal, index) => {
                const sev = String(signal['severity'] ?? 'medium');
                const evidence = (signal['evidence'] ?? {}) as Record<string, unknown>;
                return (
                  <div
                    key={index}
                    style={{
                      border: `1px solid ${COLORS.border}`,
                      borderLeft: `3px solid ${riskColor(sev)}`,
                      borderRadius: 8,
                      padding: '11px 13px',
                      background: COLORS.surfaceSunken,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}
                    >
                      <span style={{ color: riskColor(sev), display: 'flex' }}>
                        <IconLink size={14} />
                      </span>
                      <strong style={{ fontSize: 12.5 }}>
                        {humanise(String(signal['type'] ?? 'signal'))}
                      </strong>
                      <Pill
                        color={riskColor(sev)}
                        background={riskSoft(sev)}
                        border={riskBorder(sev)}
                      >
                        {sev}
                      </Pill>
                      {typeof signal['confidence'] === 'number' && (
                        <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 'auto' }}>
                          {pctOf1(signal['confidence'])} confidence
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Matches{' '}
                      <strong style={{ color: COLORS.textPrimary }}>
                        {String(signal['matchedApplicationId'] ?? '—')}
                      </strong>
                    </div>
                    {Object.keys(evidence).length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {Object.entries(evidence).map(([key, value]) => (
                          <Chip key={key}>
                            {humanise(key)}: {truncate(String(value), 40)}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {docs.length > 0 && (
            <>
              <div className="piq-eyebrow" style={{ marginBottom: 9 }}>
                Submitted documents ({docs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {docs.map((doc, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ color: COLORS.textMuted, display: 'flex' }}>
                      <IconDoc size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {humanise(String(doc['type'] ?? 'document'))}
                      </div>
                      <div
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 10.5,
                          color: COLORS.textMuted,
                          marginTop: 1,
                        }}
                      >
                        {String(doc['documentId'] ?? '')} · hash{' '}
                        {truncate(String(doc['imageHash'] ?? '—'), 28)}
                      </div>
                    </div>
                    {doc['issuedOn'] ? (
                      <span style={{ fontSize: 11, color: COLORS.textSecondary }}>
                        issued {String(doc['issuedOn'])}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small helper reused by dashboards: a labelled progress row. */
export function ProgressRow({
  label,
  percent,
  hint,
  color,
}: {
  label: string;
  percent: number;
  hint?: string;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 550, color: COLORS.textPrimary }}>{label}</span>
        <span style={{ fontSize: 11.5, color: COLORS.textSecondary }}>
          {hint ?? `${Math.round(percent)}%`}
        </span>
      </div>
      <Bar percent={percent} color={color} />
    </div>
  );
}
