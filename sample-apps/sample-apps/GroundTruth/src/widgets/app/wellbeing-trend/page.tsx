'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { Chip, GroundTruthFrame, type Tone } from '../_shared/tokens';

interface TrendPoint {
  date: string;
  submitted: boolean;
  confidence: number | null;
  sentiment: string | null;
  blockerCount: number;
}

interface Person {
  employee: { id: string; name: string; role: string };
  series: TrendPoint[];
  currentConfidence: number | null;
  currentSentiment: string | null;
  confidenceDelta: number;
  direction: 'improving' | 'steady' | 'declining';
  consecutiveNegativeDays: number;
  recurringBlockers: Array<{ blocker: string; days: number; dates: string[] }>;
  missedDays: number;
  signals: string[];
}

interface TrendData {
  teamId?: string;
  days: number;
  dateRange: { from: string; to: string };
  people: Person[];
}

/** Direction drives the mark colour; the label beside it carries the same meaning in words. */
function directionTone(direction: Person['direction']): Tone {
  if (direction === 'declining') return 'bad';
  if (direction === 'improving') return 'good';
  return 'neutral';
}

function markColor(direction: Person['direction']): string {
  if (direction === 'declining') return 'var(--gt-mark-bad)';
  if (direction === 'improving') return 'var(--gt-mark-good)';
  return 'var(--gt-mark-warn)';
}

const DIRECTION_LABEL: Record<Person['direction'], string> = {
  declining: 'declining',
  steady: 'steady',
  improving: 'improving',
};

const W = 168;
const H = 40;
const PAD = 6;

/**
 * Confidence over time for one person. Small multiples rather than one shared
 * chart: the question is "which way is each person heading", not "who scores
 * highest", and eight overlapping lines would answer neither.
 */
function Sparkline({
  person,
  onHover,
}: {
  person: Person;
  onHover: (p: TrendPoint | null) => void;
}) {
  const pts = person.series;
  const n = pts.length;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(n - 1, 1);
  // Confidence is a fixed 1–5 scale, so the axis is fixed too — an auto domain
  // would make a one-point wobble look like a cliff.
  const y = (c: number) => H - PAD - ((c - 1) / 4) * (H - PAD * 2);

  const submitted = pts.filter((p) => p.confidence !== null);
  const path = pts
    .map((p, i) => (p.confidence === null ? null : `${x(i)},${y(p.confidence)}`))
    .filter((v): v is string => v !== null)
    .join(' L ');

  const color = markColor(person.direction);
  const last = [...pts].reverse().find((p) => p.confidence !== null);
  const lastIndex = last ? pts.lastIndexOf(last) : -1;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Confidence for ${person.employee.name}: ${DIRECTION_LABEL[person.direction]}, currently ${person.currentConfidence ?? 'not reported'} out of 5`}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      {/* Recessive reference lines at the scale's ends and midpoint */}
      {[1, 3, 5].map((c) => (
        <line
          key={c}
          x1={PAD}
          x2={W - PAD}
          y1={y(c)}
          y2={y(c)}
          stroke="var(--gt-grid)"
          strokeWidth={1}
        />
      ))}

      {submitted.length > 1 && (
        <path
          d={`M ${path}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {pts.map((p, i) =>
        p.confidence === null ? (
          // A missed day is absence, not zero — mark it hollow on the baseline.
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(1)}
            r={2.5}
            fill="var(--gt-surface)"
            stroke="var(--gt-border-strong)"
            strokeWidth={1.5}
            onMouseEnter={() => onHover(p)}
            onMouseLeave={() => onHover(null)}
          />
        ) : (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(p.confidence)}
            r={i === lastIndex ? 4 : 2.5}
            fill={color}
            stroke="var(--gt-surface)"
            strokeWidth={i === lastIndex ? 2 : 0}
            onMouseEnter={() => onHover(p)}
            onMouseLeave={() => onHover(null)}
          />
        ),
      )}

      {/* Generous invisible hit targets — the marks themselves are too small to hover */}
      {pts.map((p, i) => (
        <rect
          key={`hit-${p.date}`}
          x={x(i) - (W - PAD * 2) / (2 * Math.max(n - 1, 1))}
          y={0}
          width={(W - PAD * 2) / Math.max(n - 1, 1)}
          height={H}
          fill="transparent"
          onMouseEnter={() => onHover(p)}
          onMouseLeave={() => onHover(null)}
        />
      ))}
    </svg>
  );
}

export default function WellbeingTrend() {
  const { isReady, getToolOutput, theme, sendFollowUpMessage } = useWidgetSDK();
  const data = getToolOutput<TrendData>();
  const [hover, setHover] = useState<{ id: string; point: TrendPoint } | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (!isReady) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={800}>
        <div className="gt-panel gt-muted">Connecting to host…</div>
      </GroundTruthFrame>
    );
  }

  if (!data) {
    return (
      <GroundTruthFrame theme={theme} maxWidth={800}>
        <div className="gt-panel gt-muted">
          No trend data. Run <code>analyze_wellbeing_trend</code>.
        </div>
      </GroundTruthFrame>
    );
  }

  const concerning = data.people.filter(
    (p) => p.direction === 'declining' || p.consecutiveNegativeDays >= 2,
  );

  return (
    <GroundTruthFrame theme={theme} maxWidth={800}>
      <div className="gt-panel">
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
            <p className="gt-eyebrow">
              Confidence trend · {data.dateRange.from} to {data.dateRange.to}
            </p>
            <h2 className="gt-title">
              {concerning.length === 0
                ? 'Everyone is holding steady'
                : `${concerning.length} ${concerning.length === 1 ? 'person is' : 'people are'} trending down`}
            </h2>
          </div>
          <button
            className="gt-btn gt-btn--quiet"
            style={{ padding: '6px 12px', fontSize: 12.5 }}
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            {showTable ? 'Show charts' : 'Show table'}
          </button>
        </div>

        {showTable ? (
          // Table view: the same numbers without relying on colour or shape at all.
          <div className="gt-scroll">
            <table
              className="gt-mono"
              style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}
            >
              <caption
                className="gt-label"
                style={{ textAlign: 'left', paddingBottom: 8 }}
              >
                Self-reported confidence, 1–5, by day
              </caption>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>
                    Person
                  </th>
                  {data.people[0]?.series.map((p) => (
                    <th key={p.date} style={{ padding: '6px 8px', textAlign: 'right' }}>
                      {p.date.slice(5)}
                    </th>
                  ))}
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.people.map((person) => (
                  <tr
                    key={person.employee.id}
                    style={{ borderTop: '1px solid var(--gt-border)' }}
                  >
                    <td
                      style={{
                        padding: '6px 10px 6px 0',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {person.employee.name}
                    </td>
                    {person.series.map((p) => (
                      <td
                        key={p.date}
                        style={{ padding: '6px 8px', textAlign: 'right' }}
                      >
                        {p.confidence ?? '—'}
                      </td>
                    ))}
                    <td
                      style={{
                        padding: '6px 8px',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {DIRECTION_LABEL[person.direction]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.people.map((person) => {
              const tone = directionTone(person.direction);
              const active =
                hover?.id === person.employee.id ? hover.point : null;

              return (
                <div
                  key={person.employee.id}
                  className={`gt-row gt-row--${tone === 'neutral' ? 'good' : tone}`}
                  style={{ flexDirection: 'column', gap: 8 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: '1 1 160px', minWidth: 140 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong style={{ fontSize: 14.5 }}>
                          {person.employee.name}
                        </strong>
                        <span className="gt-muted" style={{ fontSize: 12.5 }}>
                          {person.employee.role}
                        </span>
                      </div>
                      {/* Text label carries the trend independent of colour */}
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Chip tone={tone}>
                          {DIRECTION_LABEL[person.direction]}
                          {person.confidenceDelta !== 0
                            ? ` ${person.confidenceDelta > 0 ? '+' : ''}${person.confidenceDelta}`
                            : ''}
                        </Chip>
                        {person.recurringBlockers.length > 0 && (
                          <Chip tone="bad">
                            blocker · {person.recurringBlockers[0].days}d
                          </Chip>
                        )}
                      </div>
                    </div>

                    <Sparkline
                      person={person}
                      onHover={(point) =>
                        setHover(point ? { id: person.employee.id, point } : null)
                      }
                    />

                    {/* Direct label on the current value, not on every point */}
                    <div style={{ minWidth: 62, textAlign: 'right' }}>
                      <div
                        className="gt-mono"
                        style={{ fontSize: 20, fontWeight: 650, lineHeight: 1.1 }}
                      >
                        {person.currentConfidence ?? '—'}
                        <span
                          className="gt-muted"
                          style={{ fontSize: 12, fontWeight: 400 }}
                        >
                          /5
                        </span>
                      </div>
                      <div className="gt-eyebrow" style={{ fontSize: 10 }}>
                        today
                      </div>
                    </div>
                  </div>

                  {active && (
                    <div
                      className="gt-mono"
                      role="status"
                      style={{
                        fontSize: 12,
                        padding: '5px 9px',
                        background: 'var(--gt-surface-sunken)',
                        borderRadius: 6,
                        alignSelf: 'flex-start',
                      }}
                    >
                      {active.date} ·{' '}
                      {active.submitted
                        ? `confidence ${active.confidence}/5 · tone ${active.sentiment}${active.blockerCount > 0 ? ` · ${active.blockerCount} blocker(s)` : ''}`
                        : 'no report submitted'}
                    </div>
                  )}

                  <ul
                    className="gt-muted"
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      fontSize: 12.5,
                    }}
                  >
                    {person.signals.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <p className="gt-muted" style={{ margin: 0, fontSize: 11.5 }}>
            Self-reported confidence, 1–5. Signals only — the agent explains what it
            makes of them.
          </p>
          {concerning.length > 0 && (
            <button
              className="gt-btn"
              style={{ padding: '7px 13px', fontSize: 12.5 }}
              onClick={() =>
                sendFollowUpMessage(
                  `Is ${concerning[0].employee.name} struggling? Look at their trend and recent reports before answering.`,
                )
              }
            >
              Ask about {concerning[0].employee.name.split(' ')[0]}
            </button>
          )}
        </div>
      </div>
    </GroundTruthFrame>
  );
}
