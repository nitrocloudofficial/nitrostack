'use client';

import React from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export default function MedReconciliationWidget() {
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<any>();
  const theme = useTheme();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111827' : '#ffffff';
  const cardBg = isDark ? '#1f2937' : '#f9fafb';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const mutedText = isDark ? '#9ca3af' : '#4b5563';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  const recon = data ?? {
    labels: { list_a: 'EHR Active List', list_b: 'Patient Reported List' },
    continued: ['Metformin 500 MG', 'Warfarin 5 MG'],
    added: ['Ibuprofen 400 MG'],
    removed: [],
    possible_duplicates: [
      { a: 'Warfarin 5 MG', b: 'Ibuprofen 400 MG', reason: 'High bleeding risk interaction' },
    ],
    discrepancy_count: 2,
  };

  return (
    <div style={{ backgroundColor: bg, color: textColor, fontFamily: 'system-ui, sans-serif', padding: '16px', borderRadius: '12px', border: `1px solid ${borderColor}`, maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Medication Reconciliation Diff</h3>
        <span style={{ backgroundColor: recon.discrepancy_count > 0 ? '#f9731620' : '#10b98120', color: recon.discrepancy_count > 0 ? '#f97316' : '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
          {recon.discrepancy_count} Discrepancies
        </span>
      </div>

      {/* Duplicate Warning Row */}
      {recon.possible_duplicates && recon.possible_duplicates.length > 0 && (
        <div style={{ backgroundColor: '#ef444415', border: '1px solid #ef444440', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>⚠️ Duplicate / Therapeutic Conflict Warning:</div>
          {recon.possible_duplicates.map((dup: any, idx: number) => (
            <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
              <strong>{dup.a}</strong> ↔ <strong>{dup.b}</strong>: {dup.reason}
            </div>
          ))}
        </div>
      )}

      {recon.duplicate_detection_note && (
        <div style={{ color: mutedText, fontSize: '10px', marginBottom: '10px' }}>{recon.duplicate_detection_note}</div>
      )}

      {/* 3-Column Diff */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {/* Continued */}
        <div style={{ backgroundColor: cardBg, padding: '10px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>CONTINUED ({recon.continued?.length ?? 0})</div>
          {recon.continued?.map((m: string, i: number) => (
            <div key={i} style={{ fontSize: '12px', padding: '4px 0', borderBottom: `1px solid ${borderColor}` }}>{m}</div>
          ))}
        </div>

        {/* Added */}
        <div style={{ backgroundColor: cardBg, padding: '10px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', marginBottom: '8px' }}>ADDED ({recon.added?.length ?? 0})</div>
          {recon.added?.map((m: string, i: number) => (
            <div key={i} style={{ fontSize: '12px', padding: '4px 0', borderBottom: `1px solid ${borderColor}` }}>+ {m}</div>
          ))}
        </div>

        {/* Removed */}
        <div style={{ backgroundColor: cardBg, padding: '10px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>REMOVED ({recon.removed?.length ?? 0})</div>
          {recon.removed?.map((m: string, i: number) => (
            <div key={i} style={{ fontSize: '12px', padding: '4px 0', borderBottom: `1px solid ${borderColor}` }}>- {m}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
