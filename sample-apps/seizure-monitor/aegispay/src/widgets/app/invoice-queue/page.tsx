'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface Invoice {
  id: string;
  vendorId: string;
  amount: number;
  status: string;
  invoiceDate: string;
  notes: string;
}

function formatPaise(paise: number): string {
  const rupees = Math.floor(paise / 100);
  return '\u20b9' + rupees.toLocaleString('en-IN');
}

export default function InvoiceQueue() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={styles.loading}>Loading…</div>;

  const invoices = getToolOutput<Invoice[]>();
  if (!invoices || invoices.length === 0) return <div style={styles.empty}>No pending invoices</div>;

  const t = tokens(theme);

  return (
    <div style={styles.container}>
      <div style={styles.header(t)}>{invoices.length} pending invoice{invoices.length !== 1 ? 's' : ''}</div>
      {invoices.map((inv, i) => (
        <div key={inv.id} style={styles.row(t, i % 2 === 1)}>
          <div>
            <div style={styles.vendor}>{inv.vendorId}</div>
            <div style={styles.meta}>{inv.id} · {inv.invoiceDate}</div>
          </div>
          <div style={styles.amount}>{formatPaise(inv.amount)}</div>
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
      rowAltBg: '#141414',
    };
  }
  return {
    bg: '#FAF9F6',
    cardBg: '#FFFFFF',
    primaryText: '#1A1A1A',
    secondaryText: '#6B6B6B',
    border: '#E8E4DC',
    rowAltBg: '#F5F3EE',
  };
}

const styles = {
  container: { fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 520 },
  loading: { padding: 20, color: '#6B6B6B' },
  empty: { padding: 20, opacity: 0.6, color: '#6B6B6B' },
  header: (t: ReturnType<typeof tokens>) => ({ fontSize: 13, color: t.secondaryText, marginBottom: 12 }),
  row: (t: ReturnType<typeof tokens>, isAlt: boolean) => ({
    backgroundColor: isAlt ? t.rowAltBg : 'transparent',
    color: t.primaryText,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }),
  vendor: { fontWeight: 600, fontSize: 14 },
  meta: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  amount: { fontWeight: 700, fontSize: 16 },
};