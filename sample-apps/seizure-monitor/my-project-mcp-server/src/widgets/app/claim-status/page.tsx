'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Claim Status Widget
 * Bound to: get_claim_status
 *
 * Cashless status + approved amount for a patient from the reference
 * claims dataset. Lighter-weight than the case-summary widget — this is
 * the "quick lookup" view, not the full reconciled case.
 */

interface ClaimStatusData {
  found: boolean;
  message?: string;
  claimId?: string;
  cashlessStatus?: 'approved' | 'denied' | 'pending';
  approvedAmount?: number | null;
  denialReason?: string | null;
  isNetworkHospital?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  approved: { label: 'Approved', color: '#059669', bg: '#d1fae5', border: '#6ee7b7', icon: '✅' },
  denied: { label: 'Denied', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '❌' },
  pending: { label: 'Pending', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', icon: '⏳' },
};

function formatCurrency(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function ClaimStatus() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<ClaimStatusData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
        <p style={{ margin: 0 }}>No claim looked up yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Call <code>get_claim_status</code> with a patientId.</p>
      </div>
    );
  }

  if (!data.found) {
    return (
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 16,
        maxWidth: 400,
        padding: '20px',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <p style={{ margin: 0, fontSize: 24 }}>🔍</p>
        <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 600, color: textPrimary }}>No claim found</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: textMuted }}>{data.message}</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[data.cashlessStatus ?? 'pending'];

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 400,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${status.color}22, ${status.color}08)`,
        borderBottom: `1px solid ${status.border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{status.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
              Claim {data.claimId}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: status.color }}>{status.label}</p>
          </div>
        </div>
        <span style={{
          background: data.isNetworkHospital ? '#d1fae5' : '#fee2e2',
          color: data.isNetworkHospital ? '#059669' : '#dc2626',
          border: `1px solid ${data.isNetworkHospital ? '#6ee7b7' : '#fca5a5'}`,
          borderRadius: 20,
          padding: '3px 10px',
          fontSize: 10,
          fontWeight: 700,
        }}>
          {data.isNetworkHospital ? 'IN-NETWORK' : 'OUT-OF-NETWORK'}
        </span>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: surfaceAlt, borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Approved Amount</p>
          <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: textPrimary }}>
            {data.approvedAmount != null ? formatCurrency(data.approvedAmount) : '—'}
          </p>
        </div>

        {data.denialReason && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#dc2626' }}>Denial reason</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7f1d1d' }}>{data.denialReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
