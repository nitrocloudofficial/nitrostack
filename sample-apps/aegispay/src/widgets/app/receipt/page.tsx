'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface ReceiptData {
  receiptId: string;
  invoiceIds: string[];
  total: number;
  executedAt: string;
}

function formatPaise(paise: number): string {
  const rupees = Math.floor(paise / 100);
  return '\u20b9' + rupees.toLocaleString('en-IN');
}

export default function Receipt() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={styles.loading}>Loading…</div>;

  const data = getToolOutput<ReceiptData>();
  if (!data) return <div style={styles.empty}>No receipt data</div>;

  const t = tokens(theme);

  return (
    <div style={styles.card(t)}>
      <div style={styles.successBadge(t)}>✓ Payment executed</div>
      <div style={styles.amount(t)}>{formatPaise(data.total)}</div>
      <div style={styles.detailRow(t)}>
        <span style={styles.detailLabel}>Receipt:</span>
        <span style={styles.detailValue}>{data.receiptId}</span>
      </div>
      <div style={styles.detailRow(t)}>
        <span style={styles.detailLabel}>Invoices:</span>
        <span style={styles.detailValue}>{(data.invoiceIds ?? []).join(', ')}</span>
      </div>
      <div style={styles.detailRow(t)}>
        <span style={styles.detailLabel}>Executed:</span>
        <span style={styles.detailValue}>{new Date(data.executedAt).toLocaleString('en-IN')}</span>
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
  };
}

const styles = {
  loading: { padding: 20, color: '#6B6B6B' },
  empty: { padding: 20, opacity: 0.6, color: '#6B6B6B' },
  card: (t: ReturnType<typeof tokens>) => ({
    backgroundColor: t.cardBg,
    color: t.primaryText,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: 20,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 480,
  }),
  successBadge: (t: ReturnType<typeof tokens>) => ({
    color: t.accentGreen,
    fontWeight: 700,
    fontSize: 16,
    marginBottom: 12,
  }),
  amount: (t: ReturnType<typeof tokens>) => ({
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 16,
  }),
  detailRow: (t: ReturnType<typeof tokens>) => ({
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: `1px solid ${t.border}`,
  }),
  detailLabel: { color: '#6B6B6B' },
  detailValue: { fontWeight: 500, textAlign: 'right' as const },
};