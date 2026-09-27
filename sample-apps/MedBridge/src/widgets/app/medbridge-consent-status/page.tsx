'use client';

import { type CSSProperties } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ConsentStatusData {
  patientId?: string;
  grantedTo?: string;
  scope?: string[];
  grantedAt?: string;
  expiresAt?: string;
  summaryText?: string;
}

const cardStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.08)',
  marginBottom: '12px',
};

export default function MedBridgeConsentStatus() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ConsentStatusData>();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#111827';

  if (!data) {
    return <div style={{ padding: 24, color: textColor }}>Loading consent status...</div>;
  }

  return (
    <div style={{ padding: 24, color: textColor, minHeight: '100vh' }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Consent status</h2>
      <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 16 }}>
        Patient consent grant details and expiry.
      </p>
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Patient: {data.patientId ?? 'Unknown'}</div>
        <div style={{ opacity: 0.85, marginBottom: 4 }}>Granted to: {data.grantedTo ?? '—'}</div>
        <div style={{ opacity: 0.85, marginBottom: 4 }}>Scope: {(data.scope ?? []).join(', ') || '—'}</div>
        <div style={{ opacity: 0.85, marginBottom: 4 }}>Granted at: {data.grantedAt ?? '—'}</div>
        <div style={{ opacity: 0.85 }}>Expires at: {data.expiresAt ?? '—'}</div>
      </div>
      {data.summaryText && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
          {data.summaryText}
        </pre>
      )}
    </div>
  );
}
