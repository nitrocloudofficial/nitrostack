'use client';

import { type CSSProperties } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface PatientListData {
  patients?: Array<{
    patientId: string;
    name: string;
    abhaId: string;
    consentActive: boolean;
  }>;
  summaryText?: string;
}

const cardStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.08)',
  marginBottom: '12px',
};

export default function MedBridgePatientList() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PatientListData>();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#111827';

  if (!data) {
    return <div style={{ padding: 24, color: textColor }}>Loading patient list...</div>;
  }

  return (
    <div style={{ padding: 24, color: textColor, minHeight: '100vh' }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Patients</h2>
      <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 16 }}>
        Known patients with their ABHA ID and consent status.
      </p>
      {(data.patients ?? []).map((patient) => (
        <div key={patient.patientId} style={cardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{patient.name} ({patient.patientId})</div>
          <div style={{ opacity: 0.85, marginBottom: 4 }}>ABHA: {patient.abhaId}</div>
          <div style={{ color: patient.consentActive ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
            Consent: {patient.consentActive ? 'active' : 'not granted'}
          </div>
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
