'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Objectivity Report Widget
 * Bound to: build_objective_case_report, reconcile_case
 *
 * Visualises the objectivity check result — consistent vs flagged,
 * with each inconsistency called out clearly. This is the "neutral
 * third party" view that both hospital and insurer can trust.
 * Also accepts the reconcile_case_by_id/get_live_case_status field names
 * (patientName, procedure, caseId, flags, objectivitySummary) below —
 * that pair's primary widget is case-summary, but this stays defensive
 * in case one is ever routed here directly.
 */

interface ObjectivityReportData {
  // From build_objective_case_report
  patientId?: string;
  procedureCode?: string;
  cghsBenchmark?: number | null;
  hospitalBilledAmount?: number;
  insurerClaim?: {
    claimId: string;
    cashlessStatus: string;
    approvedAmount: number | null;
  } | null;
  isConsistent: boolean;
  inconsistencies?: string[];

  // From reconcile_case_by_id / get_live_case_status
  caseId?: string;
  patientName?: string;
  procedure?: string;
  objectivitySummary?: string;
  flags?: string[];

  // From reconcile_case
  coverageGap?: number;
}

function formatCurrency(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function ObjectivityReport() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<ObjectivityReportData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
        <p style={{ margin: 0 }}>No objectivity report yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>
          Call <code>build_objective_case_report</code> or <code>reconcile_case_by_id</code>.
        </p>
      </div>
    );
  }

  // Normalise: flags can come from two field names
  const flags: string[] = data.inconsistencies ?? data.flags ?? [];
  const isClean = data.isConsistent && flags.length === 0;
  const summary = data.objectivitySummary ?? (
    isClean
      ? 'Submission is consistent across hospital records, diagnosis codes, and policy terms.'
      : 'Inconsistencies were found that require attention before the claim can be approved.'
  );

  const accentColor = isClean ? '#16a34a' : '#dc2626';
  const accentBg = isClean ? '#f0fdf4' : '#fff1ee';
  const accentBorder = isClean ? '#86efac' : '#fca5a5';

  // Identity line
  const identity = [
    data.patientName ?? data.patientId,
    data.procedure ?? data.procedureCode,
    data.caseId,
  ]
    .filter(Boolean)
    .join(' · ');

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
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
        borderBottom: `1px solid ${accentBorder}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>{isClean ? '✅' : '⚠️'}</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
            Objectivity Report
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: accentColor }}>
            {isClean ? 'Consistent — No Issues Found' : `${flags.length} Issue${flags.length !== 1 ? 's' : ''} Detected`}
          </p>
          {identity && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>{identity}</p>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Summary */}
        <div style={{
          background: accentBg,
          border: `1px solid ${accentBorder}`,
          borderRadius: 10,
          padding: '10px 14px',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: accentColor, lineHeight: 1.5 }}>{summary}</p>
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>
              Flagged Issues
            </p>
            {flags.map((flag, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                background: '#fff7ed',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                padding: '8px 12px',
              }}>
                <span style={{ color: '#d97706', fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>⚡</span>
                <p style={{ margin: 0, fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{flag}</p>
              </div>
            ))}
          </div>
        )}

        {/* Benchmarks grid */}
        {(data.cghsBenchmark !== undefined || data.hospitalBilledAmount !== undefined) && (
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>
              Cost Benchmarks
            </p>
            <div style={{
              background: surfaceAlt,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
            }}>
              {data.cghsBenchmark != null && (
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: textMuted }}>CGHS Benchmark</p>
                  <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#2563eb' }}>
                    {formatCurrency(data.cghsBenchmark)}
                  </p>
                </div>
              )}
              {data.hospitalBilledAmount !== undefined && (
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Hospital Billed</p>
                  <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: textPrimary }}>
                    {formatCurrency(data.hospitalBilledAmount)}
                  </p>
                </div>
              )}
              {data.cghsBenchmark != null && data.hospitalBilledAmount !== undefined && data.hospitalBilledAmount > data.cghsBenchmark && (
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Overbilled by</p>
                  <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#dc2626' }}>
                    {formatCurrency(data.hospitalBilledAmount - data.cghsBenchmark)}
                    {' '}
                    <span style={{ fontSize: 11, fontFamily: 'system-ui', fontWeight: 400 }}>
                      ({Math.round(((data.hospitalBilledAmount - data.cghsBenchmark) / data.cghsBenchmark) * 100)}% above)
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insurer claim status */}
        {data.insurerClaim != null && (
          <div style={{
            background: surfaceAlt,
            borderRadius: 10,
            padding: '10px 14px',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>
              Insurer Claim ({data.insurerClaim.claimId})
            </p>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Status</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: textPrimary }}>
                  {data.insurerClaim.cashlessStatus}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Approved Amount</p>
                <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: textPrimary }}>
                  {data.insurerClaim.approvedAmount != null
                    ? formatCurrency(data.insurerClaim.approvedAmount)
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        <p style={{ margin: 0, fontSize: 10, color: textMuted, textAlign: 'right' }}>
          🔍 Care Mediator Objectivity Agent
        </p>
      </div>
    </div>
  );
}
