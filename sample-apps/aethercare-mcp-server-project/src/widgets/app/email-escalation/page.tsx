'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface EmailData {
  escalationStatus?: string;
  caseReferenceId?: string;
  recipients?: string[];
  emailSubject?: string;
  emailBody?: string;
  actionTaken?: string;
}

export default function EmailEscalationWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data: EmailData = rawData?.result || (rawData?.emailSubject ? rawData : (rawData?.output || rawData || {}));
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    if (data?.emailBody) {
      navigator.clipboard.writeText(data.emailBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        📧 Dispatching Emergency Email Escalation to District Collector & NHA...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #450a0a 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '520px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '2px solid #ef4444'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📧</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>District Collector Email Escalation</h3>
            <span style={{ fontSize: '11px', opacity: 0.75 }}>Ref: {data?.caseReferenceId || 'ATH-ESCALATE-882019'}</span>
          </div>
        </div>

        <span style={{
          background: '#ef4444',
          color: 'white',
          fontSize: '11px',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          DISPATCHED
        </span>
      </div>

      {/* Recipients Pill */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
        padding: '10px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        marginBottom: '14px'
      }}>
        <strong style={{ color: '#ef4444' }}>TO OFFICERS:</strong> {data?.recipients?.join(', ') || 'collector.chennai@tn.gov.in, grievance@nha.gov.in'}
      </div>

      {/* Subject Line */}
      <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: isDark ? '#fca5a5' : '#991b1b' }}>
        Subject: {data?.emailSubject}
      </div>

      {/* Body Box */}
      <pre style={{
        background: isDark ? '#090d16' : '#f8fafc',
        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'),
        padding: '12px',
        borderRadius: '12px',
        fontSize: '11px',
        whiteSpace: 'pre-wrap',
        color: isDark ? '#cbd5e1' : '#1e293b',
        lineHeight: 1.4,
        maxHeight: '220px',
        overflowY: 'auto',
        marginBottom: '14px'
      }}>
        {data?.emailBody}
      </pre>

      {/* Copy Button */}
      <button
        onClick={copyEmail}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '10px',
          fontWeight: 800,
          fontSize: '13px',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
        }}
      >
        {copied ? '✓ Email Copied to Clipboard!' : '📋 Copy Emergency Email Memorandum'}
      </button>
    </div>
  );
}
