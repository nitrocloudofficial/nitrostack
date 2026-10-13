'use client';

import React, { useState, useEffect } from 'react';

const INITIAL_PATIENT = {
  name: 'Saksham Neupane',
  age: 22,
  gender: 'Male',
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Sulfa Drugs'],
  timeline: [
    { year: '2022', title: 'Appendix Surgery (Appendectomy)', location: 'SRM Hospital', notes: 'Laparoscopic procedure, full recovery.' },
    { year: '2023', title: 'Type-2 Diabetes Diagnosed', location: 'City Care Clinic', notes: 'HbA1c was 7.8%. Started on Metformin.' },
    { year: '2024', title: 'Lumbar Spine MRI Scan', location: 'Apollo Diagnostics', notes: 'Mild L4-L5 disc bulge observed.' },
    { year: '2025', title: 'Hypertension Treatment Initiated', location: 'Fortis Healthcare', notes: 'BP recorded at 145/92. Prescribed Enalapril.' }
  ]
};

export default function PatientTimelineCard() {
  const [data, setData] = useState<any>(INITIAL_PATIENT);

  useEffect(() => {
    // Force immediate sync with OpenAI iframe global object
    try {
      const gData = (window as any)?.openai?.toolOutput || (window as any)?.__INITIAL_DATA__;
      if (gData && (gData.timeline || gData.name)) {
        setData(gData);
      }
    } catch (e) {
      // Fallback to static state if sandbox blocks window access
    }

    const handleMsg = (e: MessageEvent) => {
      if (e.data) {
        const payload = e.data.payload || e.data.data || e.data;
        if (payload && (payload.timeline || payload.name)) {
          setData(payload);
        }
      }
    };

    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  return (
    <div style={{
      width: '100%',
      minHeight: '260px',
      padding: '16px',
      boxSizing: 'border-box',
      background: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'block',
      visibility: 'visible',
      opacity: 1
    }}>
      {/* Header Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '15px' }}>🏥 HealthSync Profile: {data.name}</h3>
        <span style={{ background: '#0284c7', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
          {data.bloodGroup} | {data.gender}, {data.age} yrs
        </span>
      </div>

      {/* Allergies Box */}
      <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#1e293b', borderRadius: '8px', fontSize: '12px' }}>
        <strong style={{ color: '#ef4444' }}>Known Allergies: </strong>
        <span>{Array.isArray(data.allergies) ? data.allergies.join(', ') : 'Penicillin, Sulfa Drugs'}</span>
      </div>

      {/* Medical Timeline */}
      <h4 style={{ margin: '12px 0 8px 0', color: '#94a3b8', fontSize: '13px' }}>Medical History Timeline</h4>
      <div style={{ borderLeft: '2px solid #38bdf8', paddingLeft: '12px' }}>
        {data.timeline?.map((item: any, idx: number) => (
          <div key={idx} style={{ marginBottom: '10px' }}>
            <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold' }}>{item.year}</span> — 
            <span style={{ color: '#cbd5e1', fontSize: '11px' }}> {item.location}</span>
            <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', fontSize: '12px', color: '#ffffff' }}>{item.title}</p>
            <small style={{ color: '#94a3b8', fontSize: '11px' }}>{item.notes}</small>
          </div>
        ))}
      </div>
    </div>
  );
}