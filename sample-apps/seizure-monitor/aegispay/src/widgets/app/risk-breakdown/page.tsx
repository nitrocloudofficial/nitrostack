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

  if (!isReady) return <div style={{ padding: 16 }}>Loading...</div>;

  const data = getToolOutput<RiskData>();
  if (!data) return <div style={{ padding: 16 }}>No risk data</div>;

  // Handle wrapper object: data might be { flags: [...], invoiceId: "...", tier: "..." } directly
  const flags = data.flags ?? [];
  const invoiceId = data.invoiceId ?? 'unknown';
  const tier = data.tier ?? 'UNKNOWN';

  const dark = theme === 'dark';

  const tierColor: Record<string, string> = {
    AUTO: '#0a7c3e',
    SINGLE_APPROVAL: '#e08a00',
    DUAL_APPROVAL: '#c62828',
    BLOCKED: '#7b0000',
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 480,
      color: dark ? '#f5f5f5' : '#111111',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, opacity: 0.6 }}>{invoiceId}</div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: tierColor[tier] || '#888',
          background: dark ? '#1a1a1a' : '#f5f5f5',
          padding: '3px 10px',
          borderRadius: 20,
        }}>{tier}</div>
      </div>

      {flags.length === 0 && (
        <div style={{ fontSize: 13, opacity: 0.6 }}>No risk flags detected</div>
      )}

      {flags.map(function(f, i) {
        return (
          <div key={i} style={{
            background: dark ? '#1a1a1a' : '#fafafa',
            borderLeft: '3px solid ' + (f.severity === 'high' ? '#c62828' : f.severity === 'medium' ? '#e08a00' : '#888'),
            padding: '10px 12px',
            borderRadius: 6,
            marginBottom: 8,
            fontSize: 13,
          }}>
            <strong>{f.ruleId}</strong>
            <div style={{ opacity: 0.75, marginTop: 3 }}>{f.evidence}</div>
          </div>
        );
      })}
    </div>
  );
}
