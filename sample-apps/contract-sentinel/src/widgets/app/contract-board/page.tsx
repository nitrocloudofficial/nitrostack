'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { useWidgetSDK, useTheme, useMaxHeight, useDisplayMode } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ types */

interface Factor {
  code?: string;
  label?: string;
  weight?: number;
  clauseText?: string;
  rationale?: string;
}

interface RecommendedAction {
  action?: string;
  label?: string;
  talkingPoints?: string[];
}

interface BoardCard {
  id?: string;
  title?: string;
  counterparty?: string;
  contractType?: string;
  imageUrl?: string;
  currency?: string;
  annualValue?: number;
  status?: string;
  deadline?: string | null;
  daysUntilDeadline?: number | null;
  riskScore?: number;
  classification?: string;
  dangerThreshold?: number;
  needsAction?: boolean;
  actionReasons?: string[];
  drivingClause?: Factor;
  factors?: Factor[];
  scoreExplanation?: string;
  recommendedAction?: RecommendedAction;
  reviewCount?: number;
  lastCycleAt?: string | null;
  disclaimer?: string;
}

interface BoardSummary {
  total?: number;
  safe?: number;
  danger?: number;
  needsAttention?: number;
  averageScore?: number;
}

interface CycleSummary {
  contractsPerceived?: number;
  contractsNeedingAction?: number;
  statusesUpdated?: number;
  dryRun?: boolean;
}

interface BoardColumns {
  safe?: BoardCard[];
  danger?: BoardCard[];
}

interface BoardData {
  generatedAt?: string;
  profileSummary?: string;
  dangerThreshold?: number;
  filter?: string;
  summary?: BoardSummary;
  columns?: BoardColumns;
  cycle?: CycleSummary;
  disclaimer?: string;
}

interface SafeFactor {
  label: string;
  weight: number;
  clauseText: string;
  rationale: string;
}

interface SafeCard {
  id: string;
  title: string;
  counterparty: string;
  contractType: string;
  status: string;
  imageUrl: string;
  currency: string;
  annualValue: number;
  deadline: string | null;
  daysUntilDeadline: number | null;
  riskScore: number;
  classification: 'safe' | 'danger';
  dangerThreshold: number;
  needsAction: boolean;
  actionReasons: string[];
  drivingClause: SafeFactor;
  factors: SafeFactor[];
  scoreExplanation: string;
  recommendedActionLabel: string;
  talkingPoints: string[];
  reviewCount: number;
  disclaimer: string;
}

interface Palette {
  pageText: string;
  muted: string;
  faint: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  pageBg: string;
  quoteBg: string;
  safe: string;
  danger: string;
  warn: string;
}

/* ------------------------------------------------------------- safe access */

const FALLBACK_DISCLAIMER =
  'Automated heuristic assessment — NOT legal advice. Have a qualified lawyer review any contract before acting.';

const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, system-ui, sans-serif';

function toSafeFactor(raw: Factor | null | undefined, fallbackLabel: string): SafeFactor {
  const source = raw ?? {};
  return {
    label: source.label ?? fallbackLabel,
    weight: typeof source.weight === 'number' ? source.weight : 0,
    clauseText: source.clauseText ?? '',
    rationale: source.rationale ?? '',
  };
}

function toSafeCard(raw: BoardCard | null | undefined, index: number): SafeCard {
  const source = raw ?? {};
  const driving = toSafeFactor(source.drivingClause, 'No clause evidence available');
  const action = source.recommendedAction ?? {};

  return {
    id: source.id ?? `card-${index}`,
    title: source.title ?? 'Untitled contract',
    counterparty: source.counterparty ?? 'Unknown counterparty',
    contractType: source.contractType ?? 'Contract',
    status: source.status ?? 'tracked',
    imageUrl: typeof source.imageUrl === 'string' ? source.imageUrl : '',
    currency: source.currency ?? '',
    annualValue: typeof source.annualValue === 'number' ? source.annualValue : 0,
    deadline: source.deadline ?? null,
    daysUntilDeadline: typeof source.daysUntilDeadline === 'number' ? source.daysUntilDeadline : null,
    riskScore: typeof source.riskScore === 'number' ? source.riskScore : 0,
    classification: source.classification === 'danger' ? 'danger' : 'safe',
    dangerThreshold: typeof source.dangerThreshold === 'number' ? source.dangerThreshold : 55,
    needsAction: source.needsAction === true,
    actionReasons: Array.isArray(source.actionReasons) ? source.actionReasons : [],
    drivingClause: {
      ...driving,
      clauseText: driving.clauseText || 'No clause text was extracted for this contract.',
    },
    factors: (Array.isArray(source.factors) ? source.factors : []).map((factor) =>
      toSafeFactor(factor, 'Unlabelled factor'),
    ),
    scoreExplanation: source.scoreExplanation ?? '',
    recommendedActionLabel: action.label ?? 'No recommendation recorded',
    talkingPoints: Array.isArray(action.talkingPoints) ? action.talkingPoints : [],
    reviewCount: typeof source.reviewCount === 'number' ? source.reviewCount : 0,
    disclaimer: source.disclaimer ?? FALLBACK_DISCLAIMER,
  };
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return letters || 'CS';
}

const styleSheet = `
  .cs-spinner {
    width: 22px; height: 22px; margin: 0 auto 10px auto; border-radius: 50%;
    border: 2.5px solid rgba(244,63,94,0.25); border-top-color: #f43f5e;
    animation: cs-spin 720ms linear infinite;
  }
  @keyframes cs-spin { to { transform: rotate(360deg); } }
  .cs-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  @media (max-width: 720px) { .cs-columns { grid-template-columns: minmax(0, 1fr); } }
  .cs-card { transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease; }
  .cs-card:hover { transform: translateY(-1px); }
  .cs-card:focus-visible { outline: 2px solid #f43f5e; outline-offset: 2px; }
  .cs-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

/* ------------------------------------------------------------------ widget */

export default function ContractBoard() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const displayMode = useDisplayMode();
  const { isReady, getToolOutput } = useWidgetSDK();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const data = getToolOutput<BoardData>();
  const isDark = theme === 'dark';

  const palette = useMemo<Palette>(
    () => ({
      pageText: isDark ? '#f1f5f9' : '#0f172a',
      muted: isDark ? 'rgba(226,232,240,0.66)' : 'rgba(15,23,42,0.6)',
      faint: isDark ? 'rgba(226,232,240,0.46)' : 'rgba(15,23,42,0.45)',
      surface: isDark ? '#161b26' : '#ffffff',
      surfaceAlt: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.035)',
      border: isDark ? 'rgba(255,255,255,0.11)' : 'rgba(15,23,42,0.1)',
      pageBg: isDark ? '#0d1117' : '#f7f8fa',
      quoteBg: isDark ? 'rgba(244,63,94,0.09)' : 'rgba(244,63,94,0.06)',
      safe: '#10b981',
      danger: '#f43f5e',
      warn: '#f59e0b',
    }),
    [isDark],
  );

  const safeColumn = useMemo(
    () => (Array.isArray(data?.columns?.safe) ? data!.columns!.safe! : []).map(toSafeCard),
    [data],
  );
  const dangerColumn = useMemo(
    () => (Array.isArray(data?.columns?.danger) ? data!.columns!.danger! : []).map(toSafeCard),
    [data],
  );

  const stateStyle: CSSProperties = {
    fontFamily: fontStack,
    padding: '30px 20px',
    textAlign: 'center',
    fontSize: 13,
    color: palette.muted,
  };

  /* staged rendering — readiness first, then data, then payload shape */

  if (!isReady) {
    return (
      <div style={stateStyle}>
        <style>{styleSheet}</style>
        <div className="cs-spinner" />
        Initializing contract board…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={stateStyle}>
        <style>{styleSheet}</style>
        <div className="cs-spinner" />
        Loading portfolio…
      </div>
    );
  }

  if (!data.columns) {
    return (
      <div style={stateStyle}>
        <strong style={{ color: palette.pageText }}>Contract board unavailable</strong>
        <div style={{ marginTop: 6, lineHeight: 1.5 }}>
          The tool response did not include a portfolio payload. Run <code>run-sentinel-cycle</code> or{' '}
          <code>review-portfolio</code> to rebuild the board.
        </div>
      </div>
    );
  }

  const summary = data.summary ?? {};
  const total =
    typeof summary.total === 'number' ? summary.total : safeColumn.length + dangerColumn.length;
  const safeCount = typeof summary.safe === 'number' ? summary.safe : safeColumn.length;
  const dangerCount = typeof summary.danger === 'number' ? summary.danger : dangerColumn.length;
  const needsAttention = typeof summary.needsAttention === 'number' ? summary.needsAttention : 0;
  const averageScore = typeof summary.averageScore === 'number' ? summary.averageScore : 0;
  const threshold = typeof data.dangerThreshold === 'number' ? data.dangerThreshold : 55;
  const dangerShare = total > 0 ? Math.round((dangerCount / total) * 100) : 0;
  const cycle = data.cycle;

  const stats = [
    { value: String(total), label: 'Tracked', color: palette.pageText },
    { value: String(safeCount), label: 'Safe', color: palette.safe },
    { value: String(dangerCount), label: 'Danger', color: palette.danger },
    { value: String(needsAttention), label: 'Needs action', color: palette.warn },
    { value: String(averageScore), label: 'Avg score', color: palette.pageText },
    { value: `${dangerShare}%`, label: 'Danger share', color: palette.pageText },
  ];

  const headingStyle = (color: string): CSSProperties => ({
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    fontWeight: 700,
    marginBottom: 6,
    color,
  });

  const metaStyle = (color: string): CSSProperties => ({
    margin: '4px 0 0 0',
    fontSize: 11.5,
    lineHeight: 1.4,
    color,
  });

  const pointListStyle: CSSProperties = {
    margin: 0,
    paddingLeft: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 10.5,
    lineHeight: 1.45,
    color: palette.muted,
  };

  const renderCard = (card: SafeCard, accent: string) => {
    const open = expandedId === card.id;
    const pct = Math.max(0, Math.min(100, card.riskScore));
    const meterColor =
      card.classification === 'danger'
        ? palette.danger
        : pct >= threshold * 0.7
          ? palette.warn
          : palette.safe;

    return (
      <button
        key={card.id}
        type="button"
        className="cs-card"
        onClick={() => setExpandedId(open ? null : card.id)}
        aria-expanded={open}
        style={{
          borderRadius: 14,
          border: `1px solid ${open ? accent : palette.border}`,
          overflow: 'hidden',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          padding: 0,
          fontFamily: fontStack,
          color: 'inherit',
          background: palette.surface,
          boxShadow: open
            ? `0 8px 24px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(15,23,42,0.11)'}`
            : `0 1px 3px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(15,23,42,0.05)'}`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            background: palette.surfaceAlt,
          }}
        >
          {card.imageUrl ? (
            <img className="cs-thumb" src={card.imageUrl} alt="" loading="lazy" />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: palette.faint,
              }}
            >
              {initials(card.counterparty)}
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              alignItems: 'baseline',
              gap: 3,
              padding: '4px 9px',
              borderRadius: 999,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              fontVariantNumeric: 'tabular-nums',
              background: meterColor,
              boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
            }}
          >
            {card.riskScore}
            <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.85 }}>/100</span>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 650,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#fff',
              background: 'rgba(15,23,42,0.72)',
            }}
          >
            {card.status.replace(/_/g, ' ')}
          </div>
        </div>

        <div style={{ padding: '11px 12px 12px 12px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 640,
              lineHeight: 1.3,
              color: palette.pageText,
            }}
          >
            {card.title}
          </h3>
          <p style={metaStyle(palette.muted)}>
            {card.counterparty} · {card.contractType}
            {card.annualValue > 0 && card.currency
              ? ` · ${card.currency} ${card.annualValue.toLocaleString('en-IE')}/yr`
              : ''}
          </p>
          <p style={metaStyle(palette.faint)}>
            {card.deadline
              ? `Deadline ${card.deadline}${
                  card.daysUntilDeadline !== null
                    ? card.daysUntilDeadline < 0
                      ? ` · ${Math.abs(card.daysUntilDeadline)} days overdue`
                      : ` · ${card.daysUntilDeadline} days away`
                    : ''
                }`
              : 'No deadline extracted'}
            {` · reviewed ${card.reviewCount}×`}
          </p>

          <div
            style={{
              height: 5,
              borderRadius: 999,
              overflow: 'hidden',
              margin: '9px 0 8px 0',
              background: palette.surfaceAlt,
            }}
          >
            <div
              style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: meterColor }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, fontSize: 11, lineHeight: 1.4, color: palette.muted }}>
            <span style={{ fontWeight: 650, whiteSpace: 'nowrap', color: meterColor }}>Driver</span>
            <span>— {card.drivingClause.label}</span>
          </div>

          <div
            style={{
              marginTop: 9,
              fontSize: 10.5,
              fontWeight: 620,
              letterSpacing: '0.02em',
              color: accent,
            }}
          >
            {open ? '▾ Hide clause evidence' : '▸ Tap to reveal the exact clause text'}
          </div>

          {open && (
            <div
              style={{
                marginTop: 10,
                borderRadius: 10,
                border: `1px solid ${palette.border}`,
                padding: '10px 11px',
                background: palette.surfaceAlt,
              }}
            >
              <div style={headingStyle(accent)}>Clause that caused this classification</div>
              <p
                style={{
                  margin: 0,
                  padding: '8px 10px',
                  borderLeft: `3px solid ${accent}`,
                  borderRadius: '0 8px 8px 0',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                  background: palette.quoteBg,
                  color: palette.pageText,
                }}
              >
                “{card.drivingClause.clauseText}”
              </p>
              {card.drivingClause.rationale ? (
                <p style={metaStyle(palette.muted)}>{card.drivingClause.rationale}</p>
              ) : null}
              {card.scoreExplanation ? (
                <p style={metaStyle(palette.faint)}>{card.scoreExplanation}</p>
              ) : null}

              {card.factors.length > 0 ? (
                <>
                  <div style={{ ...headingStyle(palette.muted), marginTop: 10 }}>
                    Every scoring factor ({card.factors.length})
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: '9px 0 0 0',
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                    }}
                  >
                    {card.factors.map((factor, i) => (
                      <li
                        key={`${card.id}-factor-${i}`}
                        style={{ fontSize: 11, lineHeight: 1.45, color: palette.pageText }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 999,
                              fontVariantNumeric: 'tabular-nums',
                              background:
                                factor.weight >= 0
                                  ? 'rgba(244,63,94,0.14)'
                                  : 'rgba(16,185,129,0.16)',
                              color: factor.weight >= 0 ? palette.danger : palette.safe,
                            }}
                          >
                            {factor.weight >= 0 ? `+${factor.weight}` : factor.weight}
                          </span>
                          <span>{factor.label}</span>
                        </div>
                        {factor.rationale ? (
                          <p style={{ ...metaStyle(palette.muted), margin: 0 }}>{factor.rationale}</p>
                        ) : null}
                        {factor.clauseText ? (
                          <p
                            style={{
                              margin: '3px 0 0 0',
                              fontSize: 10.5,
                              lineHeight: 1.45,
                              fontStyle: 'italic',
                              color: palette.faint,
                            }}
                          >
                            “{factor.clauseText}”
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {card.actionReasons.length > 0 ? (
                <>
                  <div style={{ ...headingStyle(palette.muted), marginTop: 10 }}>
                    Why it needs action
                  </div>
                  <ul style={pointListStyle}>
                    {card.actionReasons.map((reason, i) => (
                      <li key={`${card.id}-reason-${i}`}>{reason}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              <div
                style={{
                  marginTop: 9,
                  borderRadius: 9,
                  padding: '9px 10px',
                  border: `1px dashed ${accent}`,
                  color: palette.pageText,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 680, marginBottom: 5, color: accent }}>
                  Recommended — {card.recommendedActionLabel}
                </div>
                {card.talkingPoints.length > 0 ? (
                  <ul style={pointListStyle}>
                    {card.talkingPoints.map((point, i) => (
                      <li key={`${card.id}-point-${i}`}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ ...metaStyle(palette.muted), margin: 0 }}>
                    No talking points recorded for this contract yet.
                  </p>
                )}
              </div>

              <div
                style={{
                  marginTop: 9,
                  fontSize: 10,
                  lineHeight: 1.45,
                  display: 'flex',
                  gap: 5,
                  alignItems: 'flex-start',
                  color: palette.faint,
                }}
              >
                <span aria-hidden="true">⚖️</span>
                <span>{card.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderColumn = (label: string, cards: SafeCard[], accent: string, emptyText: string) => (
    <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 10,
          border: `1px solid ${palette.border}`,
          fontSize: 12.5,
          fontWeight: 650,
          background: palette.surface,
          color: palette.pageText,
        }}
      >
        <span
          style={{ width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto', background: accent }}
        />
        {label}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 600,
            padding: '1px 7px',
            borderRadius: 999,
            fontVariantNumeric: 'tabular-nums',
            background: palette.surfaceAlt,
            color: palette.muted,
          }}
        >
          {cards.length}
        </span>
      </header>
      {cards.length === 0 ? (
        <div
          style={{
            borderRadius: 12,
            border: `1px dashed ${palette.border}`,
            padding: '18px 14px',
            textAlign: 'center',
            fontSize: 12,
            lineHeight: 1.5,
            color: palette.faint,
          }}
        >
          {emptyText}
        </div>
      ) : (
        cards.map((card) => renderCard(card, accent))
      )}
    </section>
  );

  return (
    <div
      style={{
        fontFamily: fontStack,
        padding: 18,
        boxSizing: 'border-box',
        width: '100%',
        overflowY: 'auto',
        color: palette.pageText,
        background: palette.pageBg,
        maxHeight:
          displayMode === 'fullscreen' ? undefined : maxHeight ? `${maxHeight}px` : undefined,
      }}
    >
      <style>{styleSheet}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            flex: '0 0 auto',
            boxShadow: '0 4px 12px rgba(244,63,94,0.32)',
          }}
        >
          CS
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 650, letterSpacing: '-0.01em' }}>
            Contract Board
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, lineHeight: 1.35, color: palette.muted }}>
            {data.profileSummary ?? 'No company profile set.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 16px 0' }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              borderRadius: 10,
              padding: '8px 12px',
              border: `1px solid ${palette.border}`,
              minWidth: 74,
              background: palette.surface,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 680,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 2,
                color: palette.faint,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {cycle ? (
        <div
          style={{
            borderRadius: 12,
            border: `1px dashed ${palette.border}`,
            padding: '12px 14px',
            fontSize: 11.5,
            lineHeight: 1.5,
            color: palette.muted,
            marginBottom: 14,
          }}
        >
          <strong style={{ color: palette.pageText }}>Sentinel cycle</strong> perceived{' '}
          {cycle.contractsPerceived ?? 0} contract(s), flagged {cycle.contractsNeedingAction ?? 0} as
          needing action, changed {cycle.statusesUpdated ?? 0} status value(s)
          {cycle.dryRun ? ' (dry run — nothing written back)' : ''}. Danger threshold {threshold}.
        </div>
      ) : null}

      <div className="cs-columns">
        {renderColumn('Safe', safeColumn, palette.safe, 'No contracts are currently classified safe.')}
        {renderColumn(
          'Danger',
          dangerColumn,
          palette.danger,
          'No contracts breached the danger threshold.',
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 11,
          borderTop: `1px solid ${palette.border}`,
          fontSize: 10.5,
          lineHeight: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          justifyContent: 'space-between',
          color: palette.faint,
        }}
      >
        <span>{data.disclaimer ?? FALLBACK_DISCLAIMER}</span>
        <span>
          Filter {data.filter ?? 'all'} · threshold {threshold}
        </span>
      </div>
    </div>
  );
}
