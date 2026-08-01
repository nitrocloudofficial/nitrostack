'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

/**
 * PharmaGuard Risk Dashboard Widget
 * Renders the clinical safety report with color-coded risk flags
 */

interface ReportData {
  report: string;
  metadata: {
    patient: string;
    proposedDrug: string;
    overallRisk: string;
    generatedAt: string;
  };
}

export default function RiskDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ expanded: boolean }>(() => ({
    expanded: true
  }));

  const isDark = theme === 'dark';

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: isDark ? '#94a3b8' : '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
        Loading clinical report...
      </div>
    );
  }

  const data = getToolOutput<ReportData>();

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: isDark ? '#94a3b8' : '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
        Waiting for report data...
      </div>
    );
  }

  const risk = data.metadata?.overallRisk || 'unknown';

  const riskConfig: Record<string, { color: string; bg: string; icon: string; label: string; border: string }> = {
    safe: {
      color: '#10b981',
      bg: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
      border: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.25)',
      icon: '✅',
      label: 'SAFE TO PRESCRIBE',
    },
    caution: {
      color: '#f59e0b',
      bg: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
      border: isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.25)',
      icon: '⚠️',
      label: 'PROCEED WITH CAUTION',
    },
    high_risk: {
      color: '#ef4444',
      bg: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
      border: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)',
      icon: '🚨',
      label: 'HIGH RISK — REVIEW REQUIRED',
    },
    unknown: {
      color: '#6b7280',
      bg: isDark ? 'rgba(107,114,128,0.12)' : 'rgba(107,114,128,0.08)',
      border: isDark ? 'rgba(107,114,128,0.3)' : 'rgba(107,114,128,0.25)',
      icon: '❓',
      label: 'ASSESSMENT PENDING',
    },
  };

  const config = riskConfig[risk] || riskConfig.unknown;

  const reportText = data.report || '';

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      maxWidth: '560px',
      borderRadius: '16px',
      overflow: 'hidden',
      border: `1px solid ${config.border}`,
      background: isDark
        ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      boxShadow: isDark
        ? '0 4px 24px rgba(0,0,0,0.4)'
        : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      {/* Header — Risk Level Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${config.color}22, ${config.color}11)`,
        borderBottom: `1px solid ${config.border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>{config.icon}</span>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: config.color,
              marginBottom: '2px',
            }}>
              {config.label}
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}>
              {data.metadata?.proposedDrug || 'Drug'} → {data.metadata?.patient || 'Patient'}
            </div>
          </div>
        </div>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: `${config.color}20`,
          border: `2px solid ${config.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 800,
          color: config.color,
        }}>
          {risk === 'safe' ? '✓' : risk === 'caution' ? '!' : '✕'}
        </div>
      </div>

      {/* Patient Info Bar */}
      <div style={{
        padding: '10px 20px',
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
        color: isDark ? '#94a3b8' : '#64748b',
      }}>
        <span>👤 {data.metadata?.patient}</span>
        <span>💊 {data.metadata?.proposedDrug}</span>
        <span>🕐 {data.metadata?.generatedAt ? new Date(data.metadata.generatedAt).toLocaleTimeString() : 'Now'}</span>
      </div>

      {/* Report Body */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            color: isDark ? '#cbd5e1' : '#475569',
            letterSpacing: '0.05em',
          }}>
            📋 CLINICAL REPORT
          </span>
          <button
            onClick={() => setState({ expanded: !state?.expanded })}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {state?.expanded ? '▲ Collapse' : '▼ Expand'}
          </button>
        </div>

        {state?.expanded && (
          <div style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderRadius: '10px',
            padding: '16px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            fontSize: '13px',
            lineHeight: '1.7',
            color: isDark ? '#cbd5e1' : '#334155',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {reportText || 'No report generated yet.'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px',
        color: isDark ? '#475569' : '#94a3b8',
      }}>
        <span>🛡️ PharmaGuard AI Safety Copilot</span>
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          background: `${config.color}15`,
          color: config.color,
          fontWeight: 700,
          fontSize: '10px',
          letterSpacing: '0.05em',
        }}>
          {risk.toUpperCase().replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
