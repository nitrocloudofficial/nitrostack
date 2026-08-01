'use client';

export type TriageStatus = 'NORMAL' | 'BORDERLINE' | 'CRITICAL';
export type Urgency = 'SEE TODAY' | 'ROUTINE FOLLOW-UP';

export interface FlaggedTest {
  testName: string;
  value: number;
  unit: string;
  status: TriageStatus;
  panel: string;
  normalRange?: { min: number; max: number };
  criticalRange?: { min: number; max: number };
}

export interface FlagCriticalData {
  flagged: FlaggedTest[];
  overallTriage: TriageStatus;
  summary: {
    normalCount: number;
    borderlineCount: number;
    criticalCount: number;
  };
}

export interface Routing {
  specialist: string;
  urgency: Urgency;
  reason: string;
}

export const STATUS_COLORS: Record<TriageStatus, { bg: string; fg: string; dot: string }> = {
  NORMAL: { bg: '#e8f7ee', fg: '#1e7a3d', dot: '#22c55e' },
  BORDERLINE: { bg: '#fff6e5', fg: '#92620a', dot: '#f59e0b' },
  CRITICAL: { bg: '#fdecec', fg: '#a11313', dot: '#ef4444' }
};

export const STATUS_COLORS_DARK: Record<TriageStatus, { bg: string; fg: string; dot: string }> = {
  NORMAL: { bg: 'rgba(34,197,94,0.15)', fg: '#4ade80', dot: '#22c55e' },
  BORDERLINE: { bg: 'rgba(245,158,11,0.15)', fg: '#fbbf24', dot: '#f59e0b' },
  CRITICAL: { bg: 'rgba(239,68,68,0.15)', fg: '#f87171', dot: '#ef4444' }
};

export const BANNER_TEXT: Record<TriageStatus, string> = {
  NORMAL: 'All results look normal',
  BORDERLINE: 'Some results need routine follow-up',
  CRITICAL: 'Some results need urgent attention'
};

interface TriageResultsProps {
  data: FlagCriticalData;
  routing: Routing[] | null;
  isRouting: boolean;
  routingError: string | null;
  isDark: boolean;
}

/**
 * Shared presentational block: triage banner + results table + specialist
 * routing card. Used by both the in-chat triage-panel widget and the
 * standalone demo page so the two never visually drift apart.
 */
export function TriageResults({ data, routing, isRouting, routingError, isDark }: TriageResultsProps) {
  const textColor = isDark ? '#f5f5f5' : '#111827';
  const mutedColor = isDark ? 'rgba(245,245,245,0.6)' : 'rgba(17,24,39,0.6)';
  const cardBg = isDark ? '#1f2430' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const colors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;
  const bannerColors = colors[data.overallTriage];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: textColor, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner */}
      <div
        style={{
          background: bannerColors.bg,
          color: bannerColors.fg,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: bannerColors.dot, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{data.overallTriage}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{BANNER_TEXT[data.overallTriage]}</div>
        </div>
      </div>

      {/* Results table */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
          Lab Results
        </div>
        {data.flagged.map((test, i) => {
          const c = colors[test.status];
          return (
            <div
              key={`${test.testName}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: i < data.flagged.length - 1 ? `1px solid ${borderColor}` : 'none'
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{test.testName}</div>
                <div style={{ fontSize: 12, color: mutedColor }}>
                  {test.value} {test.unit} · {test.panel}
                </div>
              </div>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: c.bg,
                  color: c.fg,
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot }} />
                {test.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Specialist routing card */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
          Recommended Follow-up
        </div>
        {isRouting && <div style={{ padding: 16, fontSize: 13, color: mutedColor }}>Loading recommendations...</div>}
        {routingError && <div style={{ padding: 16, fontSize: 13, color: colors.CRITICAL.fg }}>{routingError}</div>}
        {!isRouting && !routingError && routing && routing.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: mutedColor }}>No specialist follow-up needed.</div>
        )}
        {!isRouting &&
          routing?.map((r, i) => (
            <div
              key={`${r.specialist}-${i}`}
              style={{ padding: '10px 16px', borderBottom: routing && i < routing.length - 1 ? `1px solid ${borderColor}` : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{r.specialist}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: r.urgency === 'SEE TODAY' ? colors.CRITICAL.fg : colors.BORDERLINE.fg
                  }}
                >
                  {r.urgency}
                </span>
              </div>
              <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{r.reason}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
