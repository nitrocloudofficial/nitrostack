'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Case Queue Widget
 * Bound to: list_cases
 *
 * A scannable list of every case in the backend, newest first — the
 * "which case do I look at next" view. Tap-through detail is left to
 * reconcile_case_by_id / get_live_case_status (case-summary widget).
 */

interface CaseQueueEntry {
  caseId: string;
  patientName: string;
  hospitalName: string;
  procedure: string;
  submittedAt: string;
  claimStatus: 'approved' | 'partial' | 'denied' | 'pending' | 'more-info-requested';
  hospitalEstimate: number;
  insurerApproved: number;
  gap: number;
}

interface CaseQueueData {
  count: number;
  cases: CaseQueueEntry[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: 'Approved', color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
  partial: { label: 'Partial', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  denied: { label: 'Denied', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  pending: { label: 'Pending', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  'more-info-requested': { label: 'More Info', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
};

function formatCurrency(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function CaseQueue() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<CaseQueueData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
        <p style={{ margin: 0 }}>No cases loaded yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Call <code>list_cases</code> to see everything on the backend.</p>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 520,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f172a11, #0f172a04)',
        borderBottom: `1px solid ${border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>🗂️</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
            Care Mediator
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: textPrimary }}>
            {data.count} case{data.count !== 1 ? 's' : ''} in the queue
          </p>
        </div>
      </div>

      {data.count === 0 ? (
        <div style={{ padding: '24px 20px', textAlign: 'center', color: textMuted }}>
          <p style={{ margin: 0, fontSize: 13 }}>No cases submitted yet.</p>
        </div>
      ) : (
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {data.cases.map((c, idx) => {
            const status = STATUS_CONFIG[c.claimStatus] ?? STATUS_CONFIG['pending'];
            return (
              <div
                key={c.caseId}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx < data.cases.length - 1 ? `1px solid ${border}` : 'none',
                  background: idx % 2 === 0 ? 'transparent' : surfaceAlt,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 10, fontFamily: 'monospace', color: textMuted }}>{c.caseId}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: textPrimary }}>{c.patientName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.hospitalName} · {c.procedure}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      background: status.bg,
                      color: status.color,
                      border: `1px solid ${status.border}`,
                      borderRadius: 20,
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                    }}>
                      {status.label}
                    </span>
                    {c.gap > 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, fontFamily: 'monospace', color: '#dc2626' }}>
                        Gap {formatCurrency(c.gap)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
