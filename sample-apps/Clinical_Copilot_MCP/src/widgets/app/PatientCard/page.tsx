'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface PatientData {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  allergies?: string[];
  chronicConditions?: string[];
  vitals?: {
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
  };
}

/**
 * Clinical Copilot - PatientCard Widget
 *
 * Displays patient demographics, allergies, chronic conditions, and vital signs.
 */
export default function PatientCardWidget() {
  const theme = useTheme();
  const { getToolOutput, isReady } = useWidgetSDK();
  const data = getToolOutput<PatientData>();

  if (!isReady) {
    return <div style={{ padding: '16px', textAlign: 'center' }}>Connecting to host...</div>;
  }

  if (!data) {
    return <div style={{ padding: '16px', textAlign: 'center' }}>No patient data available.</div>;
  }

  const isDark = theme === 'dark';

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '420px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>👤 {data.firstName} {data.lastName}</h3>
        <span style={{ fontSize: '12px', background: isDark ? '#3b82f6' : '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
          ID: {data.patientId}
        </span>
      </div>

      <div style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.85 }}>
        <div><strong>DOB:</strong> {data.dateOfBirth} | <strong>Gender:</strong> {data.gender}</div>
      </div>

      {data.vitals && (
        <div style={{
          background: isDark ? '#0f172a' : '#f1f5f9',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', opacity: 0.7 }}>Vital Signs</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div>❤️ HR: <strong>{data.vitals.heartRate ?? 'N/A'} BPM</strong></div>
            <div>🩸 BP: <strong>{data.vitals.bloodPressureSystolic}/{data.vitals.bloodPressureDiastolic} mmHg</strong></div>
            <div>🫁 SpO2: <strong>{data.vitals.oxygenSaturation ?? 'N/A'}%</strong></div>
            <div>🌡️ Temp: <strong>{data.vitals.temperature ?? 'N/A'} °C</strong></div>
          </div>
        </div>
      )}

      {data.allergies && data.allergies.length > 0 && (
        <div style={{ marginBottom: '8px', fontSize: '13px' }}>
          <strong>⚠️ Allergies:</strong> {data.allergies.join(', ')}
        </div>
      )}

      {data.chronicConditions && data.chronicConditions.length > 0 && (
        <div style={{ fontSize: '13px' }}>
          <strong>📋 Conditions:</strong> {data.chronicConditions.join(', ')}
        </div>
      )}
    </div>
  );
}
