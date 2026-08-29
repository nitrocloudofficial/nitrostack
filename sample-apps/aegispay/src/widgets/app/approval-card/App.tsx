'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface RiskFlag {
  ruleId: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
}

interface ApprovalData {
  approvalId: string;
  draftId: string;
  total: number;
  flags: RiskFlag[];
  status: 'pending' | 'approved' | 'rejected';
  invoiceIds?: string[];
}

function formatPaise(paise: number): string {
  const rupees = Math.floor(paise / 100);
  return '\u20b9' + rupees.toLocaleString('en-IN');
}

export default function ApprovalCard() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={styles.loading}>Loading…</div>;

  const data = getToolOutput<ApprovalData>();
  if (!data) return <div style={styles.loading}>No approval data</div>;

  const invoiceIds = data.invoiceIds ?? [];
  const approvalId = data.approvalId ?? data.draftId ?? 'unknown';
  const total = data.total ?? 0;
  const flags = data.flags ?? [];
  const status = data.status ?? 'pending';

  if (!invoiceIds.length && total === 0) return <div style={styles.loading}>No approval data</div>;

  const t = tokens(theme);

  const severityColorMap: Record<string, string> = {
    high: t.accentRed,
    medium: t.accentAmber,
    low: t.secondaryText,
  };

  return (
    <div style={styles.card(t)}>
      <div style={styles.label(t)}>Payment approval required</div>
      <div style={styles.amount(t)}>{formatPaise(total)}</div>

      {flags.map((f, i) => (
        <div key={i} style={styles.flagRow(t, severityColorMap[f.severity] || t.secondaryText)}>
          <strong>{f.ruleId}</strong> — {f.evidence}
        </div>
      ))}

      <div style={styles.buttonRow}>
        <button
          onClick={() => callTool('execute_payment', { approval_id: approvalId, decision: 'approve' })}
          style={styles.buttonPrimary(t)}
        >
          Approve
        </button>
        <button
          onClick={() => callTool('execute_payment', { approval_id: approvalId, decision: 'reject' })}
          style={styles.buttonSecondary(t)}
        >
          Reject
        </button>
      </div>
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
      btnPrimaryBg: '#2D6A4F',
      btnPrimaryHover: '#1e4d38',
      btnSecondaryBorder: '#3A3A3A',
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
    btnPrimaryBg: '#2D6A4F',
    btnPrimaryHover: '#1e4d38',
    btnSecondaryBorder: '#D0D0D0',
  };
}

const styles = {
  card: (t: ReturnType<typeof tokens>) => ({
    backgroundColor: t.cardBg,
    color: t.primaryText,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: 20,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 480,
  }),
  loading: { padding: 20, color: '#6B6B6B' },
  label: (t: ReturnType<typeof tokens>) => ({
    fontSize: 13,
    color: t.secondaryText,
    marginBottom: 6,
  }),
  amount: (t: ReturnType<typeof tokens>) => ({
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 16,
    color: t.primaryText,
  }),
  flagRow: (t: ReturnType<typeof tokens>, borderColor: string) => ({
    backgroundColor: t.mutedBg,
    borderLeft: `3px solid ${borderColor}`,
    padding: '10px 12px',
    borderRadius: 6,
    marginBottom: 8,
    fontSize: 13,
  }),
  buttonRow: { display: 'flex', gap: 10, marginTop: 18 },
  buttonPrimary: (t: ReturnType<typeof tokens>) => ({
    backgroundColor: t.btnPrimaryBg,
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  }),
  buttonSecondary: (t: ReturnType<typeof tokens>) => ({
    backgroundColor: 'transparent',
    color: t.primaryText,
    border: `1px solid ${t.btnSecondaryBorder}`,
    padding: '10px 20px',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  }),
};