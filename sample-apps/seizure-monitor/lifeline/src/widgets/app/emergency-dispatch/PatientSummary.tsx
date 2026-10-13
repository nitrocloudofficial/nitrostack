'use client';

import { PatientContextData } from './types';

interface PatientSummaryProps {
  patient: PatientContextData | null;
  requiredCapability: string;
  confidence: number | null;
  triageReasoning: string | null;
  origin: { latitude: number; longitude: number } | null;
  isDark: boolean;
}

function Field({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const mutedColor = isDark ? 'rgba(241,245,249,0.6)' : 'rgba(15,23,42,0.55)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: mutedColor, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: textColor }}>{value}</div>
    </div>
  );
}

export default function PatientSummary({ patient, requiredCapability, confidence, triageReasoning, origin, isDark }: PatientSummaryProps) {
  const panelBg = isDark ? '#111827' : '#ffffff';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const mutedColor = isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';

  const hasAnyPatientDetail = !!(patient?.symptoms || patient?.age || patient?.gender);

  return (
    <div
      style={{
        margin: '10px 16px 0',
        padding: '12px 14px',
        borderRadius: 10,
        background: panelBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: 8 }}>🧾 Patient Summary</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {patient?.age !== undefined && <Field label="Age" value={String(patient.age)} isDark={isDark} />}
        {patient?.gender && <Field label="Gender" value={patient.gender} isDark={isDark} />}
        <Field label="AI Diagnosis" value={requiredCapability} isDark={isDark} />
        {confidence !== null && <Field label="Triage Confidence" value={`${Math.round(confidence * 100)}%`} isDark={isDark} />}
        {origin && <Field label="Coordinates" value={`${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}`} isDark={isDark} />}
      </div>

      {patient?.symptoms && (
        <div style={{ marginTop: 10, fontSize: 12, color: mutedColor, fontStyle: 'italic' }}>“{patient.symptoms}”</div>
      )}
      {triageReasoning && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: mutedColor }}>
          <strong>Triage reasoning:</strong> {triageReasoning}
        </div>
      )}
      {!hasAnyPatientDetail && !triageReasoning && (
        <div style={{ marginTop: 4, fontSize: 11.5, color: mutedColor }}>
          Patient details weren't included with this dispatch — showing what's available (diagnosis and coordinates).
        </div>
      )}
    </div>
  );
}
