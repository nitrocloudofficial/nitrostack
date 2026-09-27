'use client';

import { type CSSProperties } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ConsentLogData {
  patientId?: string;
  entries?: Array<{
    patientId: string;
    timestamp: string;
    actor: string;
    action: string;
    tool: string;
    reason: string;
  }>;
  summaryText?: string;
}

const cardStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.08)',
  marginBottom: '12px',
};

export default function MedBridgeConsentLog() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ConsentLogData>();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#111827';

  if (!data) {
    return <div style={{ padding: 24, color: textColor }}>Loading consent log...</div>;
  }

  return (
    <div style={{ padding: 24, color: textColor, minHeight: '100vh' }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Consent log</h2>
      <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 16 }}>
        Audit trail of consent events and data access.
      </p>
      {(data.entries ?? []).map((entry, index) => (
        <div key={`${entry.timestamp}-${index}`} style={cardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{entry.action}</div>
          <div style={{ opacity: 0.85, marginBottom: 4 }}>When: {entry.timestamp}</div>
          <div style={{ opacity: 0.85, marginBottom: 4 }}>Actor: {entry.actor}</div>
          <div style={{ opacity: 0.85, marginBottom: 4 }}>Tool: {entry.tool}</div>
          <div style={{ opacity: 0.85 }}>Reason: {entry.reason}</div>
        </div>
      ))}
      {data.summaryText && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
          {data.summaryText}
        </pre>
      )}
    </div>
  );
}
