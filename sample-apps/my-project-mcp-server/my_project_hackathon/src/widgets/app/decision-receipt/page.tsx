'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Decision Receipt Widget
 * Bound to: submit_decision
 *
 * Confirms an insurer decision was persisted on the backend — the same
 * "stamp" moment the Insurer web portal shows, surfaced here so an agent
 * conversation gets visual confirmation instead of a bare JSON blob.
 */

interface TimelineEvent {
  timestamp: string;
  actor: string;
  event: string;
}

interface DecisionReceiptData {
  success: boolean;
  caseId: string;
  newStatus: 'approved' | 'partial' | 'denied' | 'pending' | 'more-info-requested';
  insurerApproved: number;
  gap: number;
  denialReason?: string | null;
  latestTimelineEvent?: TimelineEvent;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  approved: { label: 'Approved', color: '#059669', bg: '#d1fae5', border: '#6ee7b7', icon: '✅' },
  partial: { label: 'Partially Approved', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '⚡' },
  denied: { label: 'Denied', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '❌' },
  pending: { label: 'Pending', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', icon: '⏳' },
  'more-info-requested': { label: 'More Info Requested', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', icon: '❓' },
};

function formatCurrency(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DecisionReceipt() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<DecisionReceiptData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🖋️</div>
        <p style={{ margin: 0 }}>No decision submitted yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Call <code>submit_decision</code> to record an insurer decision.</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[data.newStatus] ?? STATUS_CONFIG['pending'];

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 420,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${status.color}22, ${status.color}08)`,
        borderBottom: `1px solid ${status.border}`,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>{status.icon}</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
            Decision Recorded · {data.caseId}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: status.color }}>{status.label}</p>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: surfaceAlt, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Insurer Approved</p>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: textPrimary }}>
              {formatCurrency(data.insurerApproved)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Remaining Gap</p>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: data.gap > 0 ? '#dc2626' : textPrimary }}>
              {formatCurrency(data.gap)}
            </p>
          </div>
        </div>

        {data.denialReason && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#dc2626' }}>Reason</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7f1d1d' }}>{data.denialReason}</p>
          </div>
        )}

        {data.latestTimelineEvent && (
          <div style={{ borderLeft: '3px solid #94a3b8', paddingLeft: 10 }}>
            <p style={{ margin: 0, fontSize: 10, color: textMuted }}>
              {formatDate(data.latestTimelineEvent.timestamp)} · {data.latestTimelineEvent.actor}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: textPrimary }}>{data.latestTimelineEvent.event}</p>
          </div>
        )}

        <p style={{ margin: 0, fontSize: 10, color: textMuted, textAlign: 'right' }}>
          ✓ Persisted on the backend · visible to patient and hospital portals
        </p>
      </div>
    </div>
  );
}
