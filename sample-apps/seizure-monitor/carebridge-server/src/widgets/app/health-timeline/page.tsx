'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface TimelineData {
  labReadings: { month: string; date: string; value: number; unit: string; flag?: string }[];
  vitalEvents: { date: string; label: string }[];
  todaySymptom: string;
  observationSummary: string;
  clinicalRelevance: string;
  trendDirection: string;
  testName: string;
}

// Also handles raw HistoricalLabAnalysis output from analyze_health_history
interface RawAnalysis {
  testName: string;
  trendDirection: string;
  readings: { date: string; value: number; unit: string }[];
  observationSummary: string;
  clinicalRelevance: string;
}

type WidgetData = TimelineData | RawAnalysis;

function isRaw(d: WidgetData): d is RawAnalysis {
  return 'readings' in d;
}

const FLAG_COLORS: Record<string, string> = { normal: '#10b981', low: '#f97316', high: '#f97316', critical: '#ef4444' };

export default function HealthTimelineWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const raw = getToolOutput<WidgetData>();

  const isDark  = theme === 'dark';
  const bg      = isDark ? '#0f172a' : '#ffffff';
  const card    = isDark ? '#1e293b' : '#f8fafc';
  const border  = isDark ? '#334155' : '#e2e8f0';
  const muted   = '#64748b';
  const text    = isDark ? '#f1f5f9' : '#0f172a';
  const lineCol = isDark ? '#334155' : '#cbd5e1';
  const dotBlue = isDark ? '#38bdf8' : '#0284c7';

  if (!raw) {
    return <div style={{ padding: 24, textAlign: 'center', color: muted, fontFamily: 'system-ui' }}>No health data available.</div>;
  }

  // Normalise both data shapes
  const testName = raw.testName;
  const trendDir = raw.trendDirection;
  const summary  = raw.observationSummary;
  const relevance= raw.clinicalRelevance;

  const readings: { date: string; value: number; unit: string; flag?: string; month?: string }[] =
    isRaw(raw) ? raw.readings : raw.labReadings;

  // Build timeline entries
  const entries: { label: string; subLabel?: string; dot: string; color: string; isToday?: boolean }[] = [];

  const MONTHS: Record<string, string> = {
    '2026-01': 'JAN', '2026-03': 'MAR', '2026-05': 'MAY', '2026-07': 'JUL',
  };

  for (const r of readings) {
    const monthKey = r.date.slice(0, 7);
    const monthLabel = MONTHS[monthKey] ?? r.date.slice(0, 7);
    const flag = r.flag ?? (r.value < 12.0 ? 'low' : 'normal');
    const color = FLAG_COLORS[flag] ?? '#10b981';
    entries.push({
      label: `${monthLabel}`,
      subLabel: `Hb ${r.value} ${r.unit}`,
      dot: '●',
      color,
    });
  }

  // Vital events
  const vitalEvents = isRaw(raw) ? [
    { label: 'Sleep ↓ · Resting HR ↑ · Activity ↓', color: '#f97316' },
  ] : (raw.vitalEvents ?? []).map((v) => ({ label: v.label, color: '#f97316' }));

  if (vitalEvents.length > 0) {
    entries.push({ label: 'JUL (vitals)', subLabel: undefined, dot: '●', color: '#f97316' });
    for (const ve of vitalEvents) {
      entries.push({ label: ve.label, dot: '●', color: ve.color });
    }
  }

  entries.push({ label: 'TODAY', subLabel: 'Fatigue reported', dot: '●', color: '#ef4444', isToday: true });

  return (
    <div style={{ padding: 20, borderRadius: 20, background: bg, color: text, border: `1px solid ${border}`, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>📈 HEALTH TIMELINE</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{testName}</div>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>
          {trendDir.toUpperCase()} TREND
        </span>
      </div>

      {/* Visual Timeline */}
      <div style={{ padding: '16px 12px', borderRadius: 14, background: card, border: `1px solid ${border}`, marginBottom: 16 }}>
        {entries.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: 14 }}>
            {/* Line + dot column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{ fontSize: 16, color: entry.color, lineHeight: 1, zIndex: 1 }}>{entry.dot}</div>
              {i < entries.length - 1 && (
                <div style={{ flex: 1, width: 2, background: lineCol, minHeight: 16, margin: '2px 0' }} />
              )}
            </div>
            {/* Text */}
            <div style={{ paddingBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: entry.isToday ? 700 : 600, color: entry.isToday ? '#ef4444' : text }}>
                {entry.label}
              </div>
              {entry.subLabel && (
                <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>{entry.subLabel}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ fontSize: 13, fontWeight: 600, color: dotBlue, marginBottom: 8 }}>{summary}</div>
      <div style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{relevance}</div>
    </div>
  );
}
