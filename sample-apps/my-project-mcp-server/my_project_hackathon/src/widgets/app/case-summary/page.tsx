'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Case Summary Widget
 * Bound to: reconcile_case_by_id, get_live_case_status
 *
 * Shows the full reconciled case status card — claim decision, gap,
 * objectivity flags, and last timeline event. Renders in compact or
 * detailed mode.
 */

interface CaseSummaryData {
  caseId: string;
  patientName: string;
  hospitalName: string;
  procedure: string;
  claimStatus: 'approved' | 'partial' | 'denied' | 'pending' | 'more-info-requested';
  denialReason?: string;
  hospitalEstimate: number;
  insurerApproved: number;
  coverageGap: number;
  financingNeeded: boolean;
  isConsistent: boolean;
  flags: string[];
  objectivitySummary: string;
  latestTimelineEvent?: { timestamp: string; actor: string; event: string } | null;
  recentTimeline?: Array<{ timestamp: string; actor: string; event: string }>;
  submittedAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  approved:           { label: 'Approved',          color: '#059669', bg: '#d1fae5', border: '#6ee7b7', icon: '✅' },
  partial:            { label: 'Partially Approved', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '⚡' },
  denied:             { label: 'Denied',             color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '❌' },
  pending:            { label: 'Pending',            color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', icon: '⏳' },
  'more-info-requested': { label: 'More Info Requested', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', icon: '❓' },
};

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CaseSummary() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ viewMode: 'compact' | 'detailed' }>(() => ({
    viewMode: 'detailed',
  }));

  const data = getToolOutput<CaseSummaryData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
        <p style={{ margin: 0 }}>No case data yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Call <code>reconcile_case_by_id</code> to load a case.</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[data.claimStatus] ?? STATUS_CONFIG['pending'];
  const compact = state?.viewMode === 'compact';

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 480,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      {/* Header stripe */}
      <div style={{
        background: `linear-gradient(135deg, ${status.color}22, ${status.color}11)`,
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
              Case {data.caseId}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: textPrimary }}>
              {data.patientName}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: status.bg,
            color: status.color,
            border: `1px solid ${status.border}`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {status.label}
          </span>
          <button
            onClick={() => setState({ viewMode: compact ? 'detailed' : 'compact' })}
            style={{
              background: 'transparent',
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 11,
              color: textMuted,
              cursor: 'pointer',
            }}
          >
            {compact ? 'Expand' : 'Compact'}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Procedure */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>Hospital</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: textPrimary }}>{data.hospitalName}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>Procedure</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: textPrimary }}>{data.procedure}</p>
          </div>
        </div>

        {/* Financial row */}
        <div style={{
          background: surfaceAlt,
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          gap: 16,
        }}>
          {[
            { label: 'Hospital Estimate', value: formatCurrency(data.hospitalEstimate) },
            { label: 'Insurer Approved', value: formatCurrency(data.insurerApproved) },
            { label: 'Gap', value: formatCurrency(data.coverageGap), highlight: data.coverageGap > 0 },
          ].map((item) => (
            <div key={item.label}>
              <p style={{ margin: 0, fontSize: 10, color: textMuted }}>{item.label}</p>
              <p style={{
                margin: '2px 0 0',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: item.highlight ? '#dc2626' : textPrimary,
              }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Denial reason */}
        {data.denialReason && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '8px 12px',
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#dc2626' }}>Denial reason</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7f1d1d' }}>{data.denialReason}</p>
          </div>
        )}

        {!compact && (
          <>
            {/* Objectivity */}
            <div style={{
              background: data.flags.length > 0 ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${data.flags.length > 0 ? '#fcd34d' : '#86efac'}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: data.flags.length > 0 ? '#b45309' : '#16a34a' }}>
                {data.flags.length > 0 ? `⚠️ ${data.flags.length} objectivity flag${data.flags.length > 1 ? 's' : ''}` : '✅ Objectivity clear'}
              </p>
              {data.flags.length > 0 && data.flags.map((f: string, i: number) => (
                <p key={i} style={{ margin: '4px 0 0', fontSize: 11, color: '#78350f' }}>• {f}</p>
              ))}
            </div>

            {/* Latest timeline event */}
            {data.latestTimelineEvent && (
              <div style={{ borderLeft: '3px solid #94a3b8', paddingLeft: 10 }}>
                <p style={{ margin: 0, fontSize: 10, color: textMuted }}>
                  Latest · {formatDate(data.latestTimelineEvent.timestamp)} · {data.latestTimelineEvent.actor}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: textPrimary }}>
                  {data.latestTimelineEvent.event}
                </p>
              </div>
            )}
          </>
        )}

        <p style={{ margin: 0, fontSize: 10, color: textMuted, textAlign: 'right' }}>
          Submitted {formatDate(data.submittedAt)} · Care Mediator
        </p>
      </div>
    </div>
  );
}
