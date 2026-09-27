'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function EmergencyContent() {
  const searchParams = useSearchParams();
  const stateStr = searchParams.get('state');
  const state = stateStr ? JSON.parse(decodeURIComponent(stateStr)) : null;

  return (
    <div
      style={{
        backgroundColor: '#fee2e2',
        border: '1px solid #ef4444',
        borderRadius: '12px',
        padding: '16px',
        color: '#991b1b',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '24px' }}>🚨</span> EMERGENCY PROTOCOL ACTIVE
      </h2>
      <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.4' }}>
        You reported a potential emergency condition: <strong>{state?.emergencyType || 'Unknown'}</strong>.
        Please seek immediate medical attention.
      </p>

      <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, marginBottom: '4px' }}>Nearest Hospital</div>
        <div style={{ fontWeight: '600', fontSize: '15px' }}>{state?.nearestHospital || 'Finding nearest facility...'}</div>
        
        <div style={{ marginTop: '12px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, marginBottom: '4px' }}>Emergency Number</div>
        <div style={{ fontWeight: 'bold', fontSize: '24px', color: '#dc2626' }}>{state?.emergencyNumber || '102 / 108'}</div>
      </div>
    </div>
  );
}

export default function EmergencyWidget() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmergencyContent />
    </Suspense>
  );
}
