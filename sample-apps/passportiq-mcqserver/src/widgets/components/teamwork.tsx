/**
 * Teammate component set, ported into the shipped widget runtime.
 *
 * PROVENANCE
 * ----------
 * These components come from Manas's frontend branch
 * (`Nitrostack-Passport-manas_frontend`, `src/components/*`):
 *
 *   StatsCard.tsx · ApplicantTable.tsx · PipelineTimeline.tsx · RiskPanel.tsx
 *   ActivityFeed.tsx · Notification.tsx · NotificationBell.tsx
 *
 * WHAT WAS KEPT
 * -------------
 * The prop interfaces are preserved exactly — `StatsCardProps`, `ApplicantRecord`,
 * `PipelineStep`, `RiskFactor`, `ActivityItem`, `NotificationBellProps` — so his
 * page code (`pages/Dashboard.tsx`) composes against this module unchanged, and the
 * information design he chose (value + delta + explanation per stat; risk score with
 * per-factor bars and a confidence readout; three-state pipeline timeline; time-
 * gutter activity feed) is intact.
 *
 * WHAT HAD TO CHANGE, AND WHY
 * ---------------------------
 *  1. NO TAILWIND. `nitrostack-cli build` is a bare esbuild pass with no CSS
 *     pipeline at all — a `className="text-zinc-400"` compiles fine and then renders
 *     as unstyled text in the widget iframe. Every utility class is therefore
 *     resolved to a theme token from `lib/theme.ts` (inline style or a `.piq-*`
 *     class from the injected stylesheet).
 *  2. NO lucide-react. Widget bundles must be self-contained and are inlined into
 *     HTML; adding an icon package to the widget workspace inflates every bundle.
 *     Icons map onto our 24x24 inline SVG set in `icons.tsx`.
 *  3. LIGHT, NOT DARK. His branch is a dark glassmorphic skin; the reference UI the
 *     team is targeting is a light government console. The structure survives, the
 *     palette does not. `SKIN` below keeps his dark values addressable so the two
 *     can be diffed rather than lost.
 *  4. TOTAL RENDERING. Props arrive from `window.openai.toolOutput` or the console
 *     REST API, both untyped at the boundary. Missing fields fall back rather than
 *     throw, because a widget crash renders as a blank frame with no error.
 */
import React from 'react';
import { COLORS, riskBorder, riskColor, riskSoft } from '../lib/theme.js';
import { asArray, clockTime } from '../lib/format.js';
import {
  IconAlert,
  IconBell,
  IconCheck,
  IconClock,
  IconDoc,
  IconEye,
  IconRefresh,
  IconShield,
} from './icons.jsx';

/**
 * Manas's original dark palette, retained for reference and for the optional
 * "ops" skin. Not applied by default — see note 3 above.
 */
export const SKIN = {
  dark: {
    canvas: '#05060a',
    surface: 'rgba(14,18,26,0.62)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#60A5FA',
    text: '#FFFFFF',
    muted: '#71717A',
  },
} as const;

// ---------------------------------------------------------------------------
// StatsCard  (Manas, components/StatsCard.tsx)
// ---------------------------------------------------------------------------

export type StatsTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger' | 'machine';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  description?: string;
  /** In the original this was a `LucideIcon`; here any node, so callers stay free. */
  icon?: React.ReactNode;
  tone?: StatsTone;
  onClick?: () => void;
}

function toneColor(tone: StatsTone | undefined): { fg: string; bg: string; bd: string } {
  switch (tone) {
    case 'blue':
      return { fg: COLORS.accent, bg: COLORS.accentSoft, bd: COLORS.accentBorder };
    case 'success':
      return { fg: COLORS.low, bg: COLORS.lowSoft, bd: COLORS.lowBorder };
    case 'warning':
      return { fg: COLORS.medium, bg: COLORS.mediumSoft, bd: COLORS.mediumBorder };
    case 'danger':
      return { fg: COLORS.high, bg: COLORS.highSoft, bd: COLORS.highBorder };
    case 'machine':
      return { fg: COLORS.machine, bg: COLORS.machineSoft, bd: `${COLORS.machine}33` };
    default:
      return { fg: COLORS.textSecondary, bg: COLORS.surfaceAlt, bd: COLORS.border };
  }
}

export function StatsCard({ title, value, change, description, icon, tone, onClick }: StatsCardProps) {
  const t = toneColor(tone);
  return (
    <article
      className="piq-card"
      onClick={onClick}
      style={{
        padding: '16px 18px',
        cursor: onClick ? 'pointer' : undefined,
        borderLeft: `3px solid ${t.fg}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10.5,
              fontWeight: 650,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: COLORS.textMuted,
            }}
          >
            {title}
          </p>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 680, letterSpacing: '-0.02em', color: COLORS.textPrimary, lineHeight: 1 }}>
              {value}
            </span>
            {change ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 999,
                  color: t.fg,
                  background: t.bg,
                  border: `1px solid ${t.bd}`,
                }}
              >
                {change}
              </span>
            ) : null}
          </div>
        </div>
        {icon ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: 8,
              color: t.fg,
              background: t.bg,
              border: `1px solid ${t.bd}`,
            }}
          >
            {icon}
          </span>
        ) : null}
      </div>
      {description ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.55, color: COLORS.textSecondary }}>{description}</p>
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// ApplicantTable  (Manas, components/ApplicantTable.tsx)
// ---------------------------------------------------------------------------

export interface ApplicantRecord {
  id: string;
  name: string;
  country: string;
  type: string;
  submitted: string;
  risk: 'Low' | 'Medium' | 'High';
  status: 'Verified' | 'In Review' | 'Clarification' | 'Queued';
  owner: string;
}

const STATUS_ICON: Record<ApplicantRecord['status'], (size: number, color: string) => React.ReactNode> = {
  Verified: (s, c) => <IconCheck size={s} color={c} />,
  'In Review': (s, c) => <IconEye size={s} color={c} />,
  Clarification: (s, c) => <IconAlert size={s} color={c} />,
  Queued: (s, c) => <IconClock size={s} color={c} />,
};

const STATUS_COLOR: Record<ApplicantRecord['status'], string> = {
  Verified: COLORS.low,
  'In Review': COLORS.accent,
  Clarification: COLORS.medium,
  Queued: COLORS.textMuted,
};

export function ApplicantTable({
  applicants,
  onSelect,
  selectedId,
  title = 'Priority verification cases',
  eyebrow = 'Applicant queue',
  totalCount,
  actions,
}: {
  applicants: ApplicantRecord[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  title?: string;
  eyebrow?: string;
  /**
   * How many records exist in the pool, when the caller is only showing a
   * preview slice. An officer must never be told "8 live records" while a
   * ninth application sits unseen off the bottom of the table — a hidden case
   * is exactly the failure this console exists to prevent.
   */
  totalCount?: number;
  actions?: React.ReactNode;
}) {
  const rows = asArray<ApplicantRecord>(applicants);
  const total = typeof totalCount === 'number' ? totalCount : rows.length;
  const truncated = total > rows.length;

  return (
    <section className="piq-card">
      <div className="piq-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="piq-eyebrow">{eyebrow}</div>
          <div className="piq-card-title">{title}</div>
        </div>
        <div className="piq-card-actions">
          <span className="piq-chip">
            <IconDoc size={13} />
            {truncated
              ? `${rows.length} of ${total} records`
              : `${total} live record${total === 1 ? '' : 's'}`}
          </span>
          {actions}
        </div>
      </div>
      <div className="piq-card-body is-flush">
        <div className="piq-scroll" style={{ overflowX: 'auto' }}>
          <table className="piq-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Application</th>
                <th>Submitted</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const selected = Boolean(selectedId && a.id === selectedId);
                const band = a.risk.toLowerCase();
                const sc = STATUS_COLOR[a.status] ?? COLORS.textMuted;
                const renderIcon = STATUS_ICON[a.status];

                return (
                  <tr
                    key={a.id}
                    onClick={onSelect ? () => onSelect(a.id) : undefined}
                    style={{
                      cursor: onSelect ? 'pointer' : undefined,
                      background: selected ? COLORS.accentSoft : undefined,
                      boxShadow: selected ? `inset 3px 0 0 ${COLORS.accent}` : undefined,
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: COLORS.textPrimary }}>{a.name}</div>
                      <div style={{ marginTop: 2, fontSize: 11.5, color: COLORS.textMuted }}>
                        {a.id} · {a.country}
                      </div>
                    </td>
                    <td style={{ color: COLORS.textSecondary }}>{a.type}</td>
                    <td style={{ color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                      {clockTime(a.submitted) || a.submitted}
                    </td>
                    <td>
                      <span
                        className="piq-pill"
                        style={{ color: riskColor(band), background: riskSoft(band), borderColor: riskBorder(band) }}
                      >
                        {a.risk}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: sc }}>
                        {renderIcon ? renderIcon(13, sc) : null}
                        {a.status}
                      </span>
                    </td>
                    <td style={{ color: COLORS.textSecondary }}>{a.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PipelineTimeline  (Manas, components/PipelineTimeline.tsx)
// ---------------------------------------------------------------------------

export interface PipelineStep {
  id: string;
  title: string;
  description?: string;
  status: 'complete' | 'active' | 'pending';
  timestamp?: string;
}

export function PipelineTimeline({
  steps,
  title = 'Identity verification timeline',
  eyebrow = 'Verification pipeline',
  live,
}: {
  steps: PipelineStep[];
  title?: string;
  eyebrow?: string;
  live?: boolean;
}) {
  const rows = asArray<PipelineStep>(steps);

  const tone = (status: PipelineStep['status']): { fg: string; bg: string; bd: string } => {
    if (status === 'complete') return { fg: COLORS.low, bg: COLORS.lowSoft, bd: COLORS.lowBorder };
    if (status === 'active') return { fg: COLORS.accent, bg: COLORS.accentSoft, bd: COLORS.accentBorder };
    return { fg: COLORS.textMuted, bg: COLORS.surfaceAlt, bd: COLORS.border };
  };

  return (
    <section className="piq-card">
      <div className="piq-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="piq-eyebrow">{eyebrow}</div>
          <div className="piq-card-title">{title}</div>
        </div>
        {live ? (
          <div className="piq-card-actions">
            <span className="piq-live">
              <span className="piq-live-dot" />
              live
            </span>
          </div>
        ) : null}
      </div>
      <div className="piq-card-body">
        {rows.length === 0 ? (
          <div className="piq-empty">No stages recorded yet.</div>
        ) : (
          <ol className="piq-timeline" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map((step) => {
              const t = tone(step.status);
              return (
                <li className="piq-tl-item" key={step.id}>
                  <span
                    className="piq-tl-dot"
                    style={{ background: t.bg, borderColor: t.bd, color: t.fg }}
                  >
                    {step.status === 'complete' ? (
                      <IconCheck size={12} />
                    ) : step.status === 'active' ? (
                      <span className="piq-spin" style={{ width: 10, height: 10, borderTopColor: t.fg }} />
                    ) : (
                      <IconClock size={11} />
                    )}
                  </span>
                  <div className="piq-tl-body">
                    <div className="piq-tl-title">
                      <span style={{ color: step.status === 'pending' ? COLORS.textMuted : COLORS.textPrimary }}>
                        {step.title}
                      </span>
                      {step.timestamp ? (
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.textMuted }}>
                          {clockTime(step.timestamp) || step.timestamp}
                        </span>
                      ) : null}
                    </div>
                    {step.description ? (
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.55, color: COLORS.textSecondary }}>
                        {step.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// RiskPanel  (Manas, components/RiskPanel.tsx)
// ---------------------------------------------------------------------------

export interface RiskFactor {
  label: string;
  value: number;
  severity: 'low' | 'medium' | 'high';
}

export function RiskPanel({
  score,
  label,
  confidence,
  factors,
  note,
}: {
  score: number;
  label?: string;
  confidence?: number;
  factors?: RiskFactor[];
  note?: string;
}) {
  const rows = asArray<RiskFactor>(factors);
  const band = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const resolvedLabel = label ?? (band === 'high' ? 'High' : band === 'medium' ? 'Elevated' : 'Low');

  return (
    <section className="piq-card">
      <div className="piq-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="piq-eyebrow">Machine risk assessment</div>
          <div className="piq-card-title">Advisory score</div>
        </div>
      </div>
      <div className="piq-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: riskColor(band) }}>
              {Math.round(score)}
            </span>
            <span
              className="piq-pill"
              style={{ marginBottom: 5, color: riskColor(band), background: riskSoft(band), borderColor: riskBorder(band) }}
            >
              {resolvedLabel}
            </span>
          </div>
          {typeof confidence === 'number' ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: COLORS.textMuted }}>
                Confidence
              </div>
              <div style={{ marginTop: 3, fontSize: 14, fontWeight: 650, color: COLORS.textPrimary }}>{confidence}%</div>
            </div>
          ) : null}
        </div>

        <div className="piq-bar" style={{ marginTop: 14 }} aria-label={`Risk score ${score} out of 100`}>
          <div className="piq-bar-fill" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: riskColor(band) }} />
        </div>

        {rows.length > 0 ? (
          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            {rows.map((f) => (
              <div key={f.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                  <span style={{ color: COLORS.textPrimary }}>{f.label}</span>
                  <span style={{ color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>{f.value}%</span>
                </div>
                <div className="piq-bar" style={{ marginTop: 5, height: 5 }}>
                  <div className="piq-bar-fill" style={{ width: `${Math.max(0, Math.min(100, f.value))}%`, background: riskColor(f.severity) }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            padding: '10px 12px',
            borderRadius: 7,
            fontSize: 12.5,
            lineHeight: 1.6,
            background: COLORS.machineSoft,
            border: `1px solid ${COLORS.machine}33`,
            color: COLORS.textPrimary,
          }}
        >
          <strong style={{ color: COLORS.machine }}>Advisory only. </strong>
          {note ?? 'This score ranks work for an officer. It does not decide anything.'}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ActivityFeed  (Manas, components/ActivityFeed.tsx)
// ---------------------------------------------------------------------------

export interface ActivityItem {
  time: string;
  title: string;
  detail?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'red' | 'violet';
}

const FEED_TONE: Record<NonNullable<ActivityItem['tone']>, string> = {
  blue: COLORS.accent,
  emerald: COLORS.low,
  amber: COLORS.medium,
  red: COLORS.high,
  violet: COLORS.machine,
};

export function ActivityFeed({
  items,
  title = 'Verification activity feed',
  eyebrow = 'Activity',
  height,
}: {
  items: ActivityItem[];
  title?: string;
  eyebrow?: string;
  height?: number;
}) {
  const rows = asArray<ActivityItem>(items);

  return (
    <section className="piq-card">
      <div className="piq-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="piq-eyebrow">{eyebrow}</div>
          <div className="piq-card-title">{title}</div>
        </div>
        <div className="piq-card-actions">
          <IconRefresh size={15} color={COLORS.textMuted} />
        </div>
      </div>
      <div className="piq-card-body">
        {rows.length === 0 ? (
          <div className="piq-empty">No activity yet.</div>
        ) : (
          <div className="piq-scroll" style={{ display: 'grid', gap: 8, maxHeight: height, overflow: height ? 'auto' : undefined }}>
            {rows.map((item, i) => {
              const c = FEED_TONE[item.tone ?? 'blue'];
              return (
                <article
                  key={`${item.time}-${item.title}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 1fr',
                    gap: 10,
                    padding: '9px 11px',
                    borderRadius: 7,
                    background: COLORS.surfaceSunken,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <time style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    {item.time}
                  </time>
                  <div style={{ position: 'relative', paddingLeft: 14, minWidth: 0 }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 5,
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: c,
                      }}
                    />
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: COLORS.textPrimary }}>{item.title}</p>
                    {item.detail ? (
                      <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: 1.55, color: COLORS.textSecondary }}>
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Notification + NotificationBell  (Manas, components/Notification*.tsx)
// ---------------------------------------------------------------------------

export type NotificationTone = 'success' | 'error' | 'info' | 'warning';

export interface NotificationProps {
  tone?: NotificationTone;
  title: string;
  message?: string;
  time?: string;
  onDismiss?: () => void;
}

function notifTone(tone: NotificationTone | undefined): { fg: string; bg: string; bd: string } {
  switch (tone) {
    case 'success':
      return { fg: COLORS.low, bg: COLORS.lowSoft, bd: COLORS.lowBorder };
    case 'error':
      return { fg: COLORS.high, bg: COLORS.highSoft, bd: COLORS.highBorder };
    case 'warning':
      return { fg: COLORS.medium, bg: COLORS.mediumSoft, bd: COLORS.mediumBorder };
    default:
      return { fg: COLORS.info, bg: COLORS.infoSoft, bd: `${COLORS.info}44` };
  }
}

export function Notification({ tone, title, message, time, onDismiss }: NotificationProps) {
  const t = notifTone(tone);
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        gap: 10,
        padding: '11px 13px',
        borderRadius: 8,
        background: t.bg,
        border: `1px solid ${t.bd}`,
      }}
    >
      <span style={{ marginTop: 1, flexShrink: 0, color: t.fg, display: 'flex' }}>
        {tone === 'success' ? <IconCheck size={15} /> : tone === 'error' || tone === 'warning' ? <IconAlert size={15} /> : <IconShield size={15} />}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <strong style={{ fontSize: 12.5, color: t.fg }}>{title}</strong>
          {time ? <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.textMuted }}>{time}</span> : null}
        </div>
        {message ? (
          <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.6, color: COLORS.textSecondary }}>{message}</p>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 0, cursor: 'pointer', color: COLORS.textMuted, padding: 0, lineHeight: 1 }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export interface NotificationBellProps {
  count?: number;
  label?: string;
  onClick?: () => void;
}

export function NotificationBell({ count = 0, label = 'Open notifications', onClick }: NotificationBellProps) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="piq-iconbtn" style={{ position: 'relative' }}>
      <IconBell size={16} />
      {count > 0 ? (
        <span
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            fontSize: 9.5,
            fontWeight: 700,
            color: COLORS.textInverse,
            background: COLORS.high,
            border: `2px solid ${COLORS.surface}`,
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </button>
  );
}

/** Stack of transient toasts, driven by `events.on('notification', ...)`. */
export function NotificationStack({
  items,
  onDismiss,
}: {
  items: Array<NotificationProps & { id: string }>;
  onDismiss?: (id: string) => void;
}) {
  const rows = asArray<NotificationProps & { id: string }>(items);
  if (rows.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 90,
        display: 'grid',
        gap: 8,
        width: 340,
        maxWidth: 'calc(100vw - 36px)',
      }}
    >
      {rows.map((n) => (
        <div key={n.id} style={{ boxShadow: '0 8px 24px rgba(15,23,42,0.14)', borderRadius: 8 }}>
          <Notification {...n} onDismiss={onDismiss ? () => onDismiss(n.id) : undefined} />
        </div>
      ))}
    </div>
  );
}
