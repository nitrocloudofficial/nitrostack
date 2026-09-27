'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface GrievanceData {
  complaintRefNumber?: string;
  dateGenerated?: string;
  hospitalName?: string;
  patientName?: string;
  violationType?: string;
  illegalAmountDemandedINR?: number;
  formalNoticeText?: string;
  submissionPortals?: Array<{ name: string; url?: string; tollFree?: string; email?: string }>;
}

export default function GrievanceNoticeWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data: GrievanceData = rawData?.result || (rawData?.complaintRefNumber ? rawData : (rawData?.output || rawData || {}));
  const portals = Array.isArray(data?.submissionPortals) ? data.submissionPortals : [];

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        ⚖️ Drafting Official NHA Legal Grievance Complaint...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #18181b 0%, #09090b 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f4f4f5 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '2px solid #ef4444'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>📜</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>NHA Legal Complaint Notice</h3>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>Ref: #{data?.complaintRefNumber || 'NHA-GRV-891024'}</span>
          </div>
        </div>

        <span style={{
          background: '#ef4444',
          color: 'white',
          fontSize: '10px',
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: '14px'
        }}>
          OFFICIAL FORM 14555
        </span>
      </div>

      {/* Target Hospital & Violation */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        padding: '10px 12px',
        borderRadius: '10px',
        marginBottom: '12px',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 600 }}>Target: {data?.hospitalName || 'Hospital'}</div>
        <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
          Violation: {data?.violationType} • Demanded: ₹{(data?.illegalAmountDemandedINR || 0).toLocaleString('en-IN')}
        </div>
      </div>

      {/* Formal Notice Box */}
      <div style={{
        background: isDark ? '#000000' : '#ffffff',
        border: '1px solid ' + (isDark ? '#3f3f46' : '#d4d4d8'),
        borderRadius: '8px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '10px',
        lineHeight: 1.4,
        maxHeight: '180px',
        overflowY: 'auto',
        marginBottom: '12px',
        whiteSpace: 'pre-wrap',
        opacity: 0.9
      }}>
        {data?.formalNoticeText || 'Generating legal notice text...'}
      </div>

      {/* Dispatch Action Bar */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
            if (data?.formalNoticeText) {
              navigator.clipboard?.writeText(data.formalNoticeText);
              alert('Copied NHA Legal Notice to Clipboard!');
            }
          }}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontWeight: 600,
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          📋 Copy Notice for Hospital Desk
        </button>

        <a
          href="https://grievance.pmjay.gov.in"
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            background: '#ef4444',
            color: 'white',
            fontWeight: 600,
            fontSize: '11px',
            textAlign: 'center',
            textDecoration: 'none'
          }}
        >
          🚨 File on NHA 14555 Portal
        </a>
      </div>
    </div>
  );
}
