'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface DocItem {
  name: string;
  required: boolean;
  status: string;
  note: string;
}

export default function DocumentChecklistWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';

  const data = rawData?.result || (rawData?.documentChecklist ? rawData : (rawData?.output || rawData || {}));
  const docs: DocItem[] = Array.isArray(data?.documentChecklist) ? data.documentChecklist : [];
  const actionSteps: string[] = Array.isArray(data?.actionSteps) ? data.actionSteps : [];
  const el = data?.patientEligibility || {};

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        📋 Generating Pre-Authorization Document Checklist...
      </div>
    );
  }

  const coverageAmount = el?.coverageAmountINR ?? 0;

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#bbf7d0')
    }}>
      {/* Eligibility Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white',
        padding: '14px',
        borderRadius: '14px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
            {el?.isEligiblePMJAY ? '✅ Scheme Entitlement Verified' : 'ℹ️ Standard TPA Admission'}
          </h3>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            ₹{coverageAmount.toLocaleString('en-IN')}
          </span>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
          {el?.primarySchemeName || 'Healthcare Scheme'}
        </p>
      </div>

      {/* Document List */}
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700 }}>
        📋 Pre-Authorization Paperwork Requirements
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {docs.length === 0 ? (
          <div style={{ fontSize: '12px', opacity: 0.7, padding: '8px' }}>No documents required.</div>
        ) : (
          docs.map((doc, idx) => (
            <div key={idx} style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
              border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
              padding: '10px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc?.name || 'Document'}</div>
                <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>{doc?.note || ''}</div>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: doc?.status === 'MANDATORY' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: doc?.status === 'MANDATORY' ? '#ef4444' : '#3b82f6',
                whiteSpace: 'nowrap'
              }}>
                {doc?.status || 'REQUIRED'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Step by Step Action Plan */}
      {actionSteps.length > 0 && (
        <div style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '10px' }}>
          <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', opacity: 0.8 }}>⚡ Immediate Admission Action Steps:</h5>
          <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', opacity: 0.85 }}>
            {actionSteps.map((step, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
