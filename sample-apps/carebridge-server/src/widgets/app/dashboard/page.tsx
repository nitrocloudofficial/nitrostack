'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface GuardianData {
  deviationDetected: boolean;
  signals: string[];
  status: string;
  details: {
    sleepChange: string;
    hrChange: string;
    activityChange: string;
    mealChange: string;
  };
}

const METRIC_CONFIG = [
  { key: 'sleepChange',    label: 'Sleep',       icon: '🌙', upIsBad: false },
  { key: 'hrChange',       label: 'Resting HR',  icon: '❤️', upIsBad: true  },
  { key: 'activityChange', label: 'Activity',    icon: '🏃', upIsBad: false },
  { key: 'mealChange',     label: 'Meals',       icon: '🍽️', upIsBad: false },
] as const;

function getTrendArrow(value: string, upIsBad: boolean): { arrow: string; color: string } {
  if (value.includes('->') || value.includes('→')) {
    const match = value.match(/\(([+-]?\d+)%\)/);
    if (match) {
      const pct = parseInt(match[1]);
      if (pct < 0) return { arrow: '↓', color: upIsBad ? '#10b981' : '#ef4444' };
      if (pct > 0) return { arrow: '↑', color: upIsBad ? '#ef4444' : '#10b981' };
    }
    if (value.toLowerCase().includes('irregular')) return { arrow: '⚠', color: '#f59e0b' };
  }
  return { arrow: '–', color: '#64748b' };
}

export default function DashboardWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<GuardianData>();

  const isDark = theme === 'dark';
  const bg       = isDark ? '#0f172a' : '#f8fafc';
  const card     = isDark ? '#1e293b' : '#ffffff';
  const border   = isDark ? '#334155' : '#e2e8f0';
  const muted    = '#64748b';
  const text     = isDark ? '#f1f5f9' : '#0f172a';

  const hasDeviation = data?.deviationDetected ?? false;
  const badgeBg    = hasDeviation ? '#fef2f2' : '#f0fdf4';
  const badgeText  = hasDeviation ? '#dc2626' : '#16a34a';
  const badgeBorder= hasDeviation ? '#fecaca' : '#bbf7d0';
  const statusLabel= hasDeviation ? `⚠ ${data?.signals?.length ?? 0} signal(s) detected` : '✓ All vitals normal';

  return (
    <div style={{ padding: 20, borderRadius: 20, background: bg, color: text, border: `1px solid ${border}`, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>🛡️ GUARDIAN CHECK-IN</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Passive baseline deviation monitor</div>
        </div>
        <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: badgeBg, color: badgeText, border: `1px solid ${badgeBorder}` }}>
          {statusLabel}
        </span>
      </div>

      {/* Metric grid */}
      {data?.details && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {METRIC_CONFIG.map(({ key, label, icon, upIsBad }) => {
            const value = data.details[key];
            const { arrow, color } = getTrendArrow(value, upIsBad);
            return (
              <div key={key} style={{ padding: '12px 14px', borderRadius: 14, background: card, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: muted }}>{icon} {label}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{arrow}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status message */}
      <div style={{ padding: '12px 16px', borderRadius: 12, background: hasDeviation ? (isDark ? '#1c1008' : '#fff7ed') : (isDark ? '#071d13' : '#f0fdf4'), border: `1px solid ${hasDeviation ? '#f97316' : '#86efac'}`, fontSize: 13, color: hasDeviation ? '#ea580c' : '#16a34a', marginBottom: 16, fontWeight: 500 }}>
        {hasDeviation
          ? `Several signals have changed from ${data?.signals?.length === 4 ? 'all' : data?.signals?.length} of your usual patterns. A health check is recommended.`
          : 'All vitals are within your normal baseline range. Keep it up!'}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 12, background: hasDeviation ? '#f97316' : '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', cursor: 'pointer' }}>
          {hasDeviation ? '[ Start Health Check ]' : '[ View Full Report ]'}
        </div>
      </div>
    </div>
  );
}
