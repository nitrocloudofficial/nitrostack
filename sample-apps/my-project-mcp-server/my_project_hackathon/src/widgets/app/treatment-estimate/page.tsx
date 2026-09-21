'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Treatment Estimate Widget
 * Bound to: get_treatment_estimate
 *
 * Shows the official CGHS rate for a procedure in a given city — the
 * neutral benchmark hospital estimates and insurer claims are checked
 * against.
 */

interface TreatmentEstimateData {
  found: boolean;
  message?: string;
  procedureCode?: string;
  procedure?: string;
  city?: string;
  estimatedCost?: number;
  currency?: string;
}

function formatCurrency(n: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return symbol + Math.round(n).toLocaleString('en-IN');
}

export default function TreatmentEstimate() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<TreatmentEstimateData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏷️</div>
        <p style={{ margin: 0 }}>No estimate yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Call <code>get_treatment_estimate</code> to look up a CGHS rate.</p>
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
        maxWidth: 420,
        padding: '20px',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <p style={{ margin: 0, fontSize: 24 }}>🔍</p>
        <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 600, color: textPrimary }}>No rate on file</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: textMuted }}>{data.message}</p>
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
      maxWidth: 420,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2563eb22, #2563eb08)',
        borderBottom: `1px solid ${border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>🏷️</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
            CGHS Rate Benchmark
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: textPrimary }}>
            {data.procedure}
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>Procedure Code</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontFamily: 'monospace', color: textPrimary }}>{data.procedureCode}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>City</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: textPrimary }}>{data.city}</p>
          </div>
        </div>

        <div style={{ background: surfaceAlt, borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Official CGHS Rate</p>
          <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
            {formatCurrency(data.estimatedCost ?? 0, data.currency)}
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 10, color: textMuted }}>
          💡 Hospital and insurer figures more than 50% above this rate are flagged by the objectivity check.
        </p>
      </div>
    </div>
  );
}
