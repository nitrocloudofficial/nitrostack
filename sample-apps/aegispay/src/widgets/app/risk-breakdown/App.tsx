'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface RiskFlag {
  ruleId: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
}

interface RiskData {
  invoiceId: string;
  flags: RiskFlag[];
  tier: string;
}

export default function RiskBreakdown() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={styles.loading}>Loading…</div>;

  const data = getToolOutput<RiskData>();
  if (!data) return <div style={styles.loading}>No risk data</div>;

  const flags = data.flags ?? [];
  const invoiceId = data.invoiceId ?? 'unknown';
  const tier = data.tier ?? 'UNKNOWN';

  const t = tokens(theme);

  const tierColorMap: Record<string, string> = {
    AUTO: t.accentGreen,
    SINGLE_APPROVAL: t.accentAmber,
    DUAL_APPROVAL: t.accentRed,
    BLOCKED: '#7b0000',
  };

  const severityColorMap: Record<string, string> = {
    high: t.accentRed,
    medium: t.accentAmber,
    low: t.secondaryText,
  };

  return (
    <div style={styles.card(t)}>
      <div style={styles.headerRow}>
        <div style={styles.invoiceId(t)}>{invoiceId}</div>
        <div style={styles.badge(t, tierColorMap[tier] || t.secondaryText)}>{tier}</div>
      </div>

      {flags.length === 0 && (
        <div style={styles.empty(t)}>No risk flags detected</div>
      )}

      {flags.map((f, i) => (
        <div key={i} style={styles.flagRow(t, severityColorMap[f.severity] || t.secondaryText)}>
          <strong>{f.ruleId}</strong>
          <div style={styles.evidence(t)}>{f.evidence}</div>
        </div>
      ))}
    </div>
  );
}

function tokens(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return {
      bg: '#0F0F0F',
      cardBg: '#1A1A1A',
      primaryText: '#F5F4F0',
      secondaryText: '#9A9A9A',
      border: '#2A2A2A',
      accentGreen: '#2D6A4F',
      accentRed: '#C62828',
      accentAmber: '#B45309',
      mutedBg: '#1A1A1A',
    };
  }
  return {
    bg: '#FAF9F6',
    cardBg: '#FFFFFF',
    primaryText: '#1A1A1A',
    secondaryText: '#6B6B6B',
    border: '#E8E4DC',
    accentGreen: '#2D6A4F',
    accentRed: '#C62828',
    accentAmber: '#B45309',
    mutedBg: '#FAF9F6',
  };
}

const styles = {
  card: (t: ReturnType<typeof tokens>) => ({
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 480,
    color: t.primaryText,
    backgroundColor: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: 20,
  }),
  loading: { padding: 20, color: '#6B6B6B' },
  headerRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 14 },
  invoiceId: (t: ReturnType<typeof tokens>) => ({ fontSize: 13, color: t.secondaryText }),
  badge: (t: ReturnType<typeof tokens>, bgColor: string) => ({
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    backgroundColor: bgColor,
    padding: '3px 10px',
    borderRadius: 20,
  }),
  empty: (t: ReturnType<typeof tokens>) => ({ fontSize: 13, color: t.secondaryText }),
  flagRow: (t: ReturnType<typeof tokens>, borderColor: string) => ({
    backgroundColor: t.mutedBg,
    borderLeft: `3px solid ${borderColor}`,
    padding: '10px 12px',
    borderRadius: 6,
    marginBottom: 8,
    fontSize: 13,
  }),
  evidence: (t: ReturnType<typeof tokens>) => ({
    color: t.secondaryText,
    marginTop: 3,
  }),
};