'use client';

import React from 'react';

export default function MatchResultsWidget() {
  const patient = {
    id: 'PAT-1042',
    disease: 'Breast Cancer',
    stage: 'Stage II (HER2+)',
    age: 45
  };

  const matchedTrials = [
    {
      id: 'NCT001',
      title: 'Phase III Evaluation of Herceptin for Early Breast Cancer',
      score: 94,
      confidence: 'High Confidence',
      phase: 'III',
      location: 'New York, USA'
    },
    {
      id: 'NCT002',
      title: 'Combination Therapy with Tamoxifen for Advanced Stage II Breast Cancer',
      score: 82,
      confidence: 'Moderate Confidence',
      phase: 'II',
      location: 'Boston, USA'
    }
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px', backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: '12px' }}>
      <h2 style={{ fontSize: '18px', margin: '0 0 12px 0', color: '#38bdf8' }}>🩺 TrialSync AI — Patient Match Report</h2>
      
      {/* Patient Summary Card */}
      <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#94a3b8' }}>PATIENT PROFILE</p>
        <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>
          {patient.id} • {patient.disease} ({patient.stage}) • Age {patient.age}
        </p>
      </div>

      {/* Matched Trials List */}
      <h3 style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '8px' }}>Matched Clinical Trials</h3>
      {matchedTrials.map((trial) => (
        <div key={trial.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#a7f3d0', fontWeight: 'bold' }}>{trial.id} (Phase {trial.phase})</span>
            <span style={{ fontSize: '14px', color: '#34d399', fontWeight: 'bold' }}>{trial.score}% Match</span>
          </div>
          <p style={{ margin: '4px 0', fontSize: '13px', color: '#f1f5f9' }}>{trial.title}</p>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>📍 {trial.location} • {trial.confidence}</span>
        </div>
      ))}
    </div>
  );
}