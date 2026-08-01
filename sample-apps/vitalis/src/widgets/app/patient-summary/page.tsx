'use client';

import React, { useState } from 'react';
import { useWidgetSDK, useTheme, useWidgetState } from '@nitrostack/widgets';

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;
  const width = 76;
  const height = 22;

  const points = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function PatientSummaryWidget() {
  const { getToolOutput, callTool, requestFullscreen } = useWidgetSDK();
  const data = getToolOutput<any>();
  const theme = useTheme();
  const [widgetState, setWidgetState] = useWidgetState(() => ({ activeTab: 'overview' }));
  const [handoff, setHandoff] = useState<any>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const isDark = theme === 'dark';
  const activeTab = (widgetState?.activeTab ?? 'overview') as 'overview' | 'conditions' | 'meds' | 'vitals' | 'allergies' | 'immunizations' | 'timeline';
  const setActiveTab = (tab: typeof activeTab) => setWidgetState({ ...widgetState, activeTab });

  const bg = isDark ? '#111827' : '#ffffff';
  const cardBg = isDark ? '#1f2937' : '#f9fafb';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const mutedText = isDark ? '#9ca3af' : '#4b5563';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const primaryColor = '#2563eb';

  // Sample data fallback for NitroStudio preview when data isn't loaded yet
  const summaryData = data ?? {
    patient: {
      fhir_id: '12345',
      name: 'Alex Morgan',
      gender: 'male',
      birth_date: '1980-05-15',
      age: 46,
      mrn: 'MRN-884920',
      address: '742 Evergreen Terrace, Springfield, OR',
    },
    active_conditions: [
      { code: 'E11.9', display: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', status: 'active', onset_date: '2018-04-12' },
      { code: 'I10', display: 'Essential (primary) Hypertension', icd10: 'I10', status: 'active', onset_date: '2020-11-05' },
    ],
    active_medications: [
      { name: 'Metformin 500 MG Oral Tablet', rxcui: '860975', dosage: '500 mg twice daily', status: 'active' },
      { name: 'Warfarin Sodium 5 MG Oral Tablet', rxcui: '855332', dosage: '5 mg once daily', status: 'active' },
    ],
    recent_vitals: [
      { code: '8480-6', display: 'Systolic Blood Pressure', value: 138, unit: 'mmHg', flag: 'high', history: [122, 128, 134, 138] },
      { code: '8462-4', display: 'Diastolic Blood Pressure', value: 88, unit: 'mmHg', flag: 'normal', history: [80, 82, 85, 88] },
      { code: '8837-1', display: 'Heart Rate', value: 72, unit: 'bpm', flag: 'normal', history: [70, 75, 68, 72] },
      { code: '4548-4', display: 'Glycated Hemoglobin (HbA1c)', value: 8.2, unit: '%', flag: 'high', history: [7.1, 7.5, 7.9, 8.2] },
    ],
    allergies: [
      { substance: 'Penicillin G', category: 'medication', criticality: 'high', reaction: 'Hives & Anaphylaxis', status: 'active' },
    ],
    immunizations: [
      { vaccine_name: 'Influenza, seasonal', date: '2024-10-15', status: 'completed' },
      { vaccine_name: 'COVID-19 mRNA Vaccine', date: '2024-01-10', status: 'completed' },
    ],
    recent_encounters: [
      { type: 'Outpatient Follow-up Visit', status: 'finished', period_start: '2025-01-15', reason: 'Diabetes Management' },
      { type: 'Annual Wellness Examination', status: 'finished', period_start: '2024-06-20', reason: 'Routine Checkup' },
    ],
    synthetic_data: true,
  };

  const p = summaryData.patient ?? {};
  const sectionsFailed: string[] = summaryData.sections_failed ?? [];
  const requestHandoff = async () => {
    if (!p.fhir_id || handoffLoading) return;
    setHandoffLoading(true);
    try {
      const response = await callTool('care_generate_handoff', { patient_id: p.fhir_id, format: 'sbar' });
      setHandoff(response.structuredContent ?? JSON.parse(response.result));
    } catch {
      setHandoff({ error: 'Unable to generate handoff. Please try again.' });
    } finally {
      setHandoffLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: bg, color: textColor, fontFamily: 'system-ui, sans-serif', padding: '16px', borderRadius: '12px', border: `1px solid ${borderColor}`, maxWidth: '640px' }}>
      {/* Synthetic Banner */}
      <div style={{ backgroundColor: '#f59e0b20', color: '#d97706', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span>⚠️ SYNTHETIC DATA ONLY — ZERO PHI (Synthea HAPI R4)</span>
      </div>

      {/* Patient Header Card */}
      <div style={{ backgroundColor: cardBg, padding: '16px', borderRadius: '8px', border: `1px solid ${borderColor}`, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{p.name ?? 'Unknown Patient'}</h2>
            <div style={{ color: mutedText, fontSize: '13px', marginTop: '4px' }}>
              {p.age ? `${p.age} y/o` : ''} • {p.gender} • DOB: {p.birth_date ?? 'N/A'} • MRN: {p.mrn ?? 'N/A'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ backgroundColor: '#2563eb20', color: primaryColor, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
              FHIR R4
            </span>
            <button onClick={() => void requestFullscreen()} style={{ border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, borderRadius: '5px', padding: '4px 7px', fontSize: '11px', cursor: 'pointer' }}>
              Fullscreen
            </button>
          </div>
        </div>
      </div>

      {sectionsFailed.length > 0 && (
        <div style={{ backgroundColor: '#f59e0b20', color: isDark ? '#fbbf24' : '#92400e', border: '1px solid #f59e0b60', borderRadius: '8px', padding: '8px 10px', marginBottom: '12px', fontSize: '12px' }}>
          Partial data: {sectionsFailed.join(', ')} could not be loaded.
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        {(['overview', 'conditions', 'meds', 'vitals', 'allergies', 'immunizations', 'timeline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === tab ? primaryColor : 'transparent',
              color: activeTab === tab ? '#ffffff' : textColor,
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '11px',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ marginBottom: '12px' }}>
          <button onClick={() => void requestHandoff()} disabled={handoffLoading} style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', cursor: handoffLoading ? 'wait' : 'pointer' }}>
            {handoffLoading ? 'Generating handoff…' : 'Generate SBAR handoff'}
          </button>
          {handoff && (
            <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '10px', marginTop: '8px', fontSize: '11px' }}>
              {handoff.error ?? JSON.stringify(handoff.sbar ?? handoff, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: primaryColor }}>Active Conditions ({summaryData.active_conditions?.length ?? 0})</h4>
            <div style={{ fontSize: '13px' }}>
              {summaryData.active_conditions?.map((c: any, i: number) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: i < summaryData.active_conditions.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                  <strong>{c.display}</strong> {c.icd10 && <span style={{ color: mutedText }}>({c.icd10})</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: primaryColor }}>Active Medications ({summaryData.active_medications?.length ?? 0})</h4>
            <div style={{ fontSize: '13px' }}>
              {summaryData.active_medications?.map((m: any, i: number) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: i < summaryData.active_medications.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                  <strong>{m.name}</strong> — <span style={{ color: mutedText }}>{m.dosage ?? 'As prescribed'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'conditions' && (
        <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${borderColor}`, textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>Condition</th>
                <th style={{ padding: '6px' }}>ICD-10</th>
                <th style={{ padding: '6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.active_conditions?.map((c: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <td style={{ padding: '6px', fontWeight: '600' }}>{c.display}</td>
                  <td style={{ padding: '6px', color: mutedText }}>{c.icd10 ?? '-'}</td>
                  <td style={{ padding: '6px' }}>
                    <span style={{ backgroundColor: '#10b98120', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'meds' && (
        <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${borderColor}`, textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>Medication</th>
                <th style={{ padding: '6px' }}>RxCUI</th>
                <th style={{ padding: '6px' }}>Dosage</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.active_medications?.map((m: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <td style={{ padding: '6px', fontWeight: '600' }}>{m.name}</td>
                  <td style={{ padding: '6px', color: mutedText }}>{m.rxcui ?? '-'}</td>
                  <td style={{ padding: '6px' }}>{m.dosage ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'vitals' && (
        <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {summaryData.recent_vitals?.map((v: any, i: number) => {
              const strokeColor = v.flag === 'high' ? '#ef4444' : '#10b981';
              const historyVals: number[] = v.history ?? [v.value * 0.9, v.value * 0.95, v.value * 0.98, v.value];
              return (
                <div key={i} style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: isDark ? '#111827' : '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: mutedText }}>{v.display}</div>
                    {v.flag === 'high' && (
                      <span style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>HIGH</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {v.value} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>{v.unit}</span>
                    </div>
                    <Sparkline values={historyVals} color={strokeColor} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'allergies' && (
        <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          {summaryData.allergies && summaryData.allergies.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {summaryData.allergies.map((alg: any, i: number) => (
                <div key={i} style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: isDark ? '#111827' : '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px' }}>{alg.substance}</strong>
                    <span style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {alg.criticality ?? 'ACTIVE'}
                    </span>
                  </div>
                  {alg.reaction && <div style={{ fontSize: '12px', color: mutedText, marginTop: '4px' }}>Reaction: {alg.reaction}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: mutedText }}>No active allergy records found in FHIR profile.</div>
          )}
        </div>
      )}

      {activeTab === 'immunizations' && (
        <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          {summaryData.immunizations && summaryData.immunizations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {summaryData.immunizations.map((imm: any, i: number) => (
                <div key={i} style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: isDark ? '#111827' : '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '13px' }}>{imm.vaccine_name}</strong>
                    <span style={{ backgroundColor: '#10b98120', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {imm.status}
                    </span>
                  </div>
                  {imm.date && <div style={{ fontSize: '12px', color: mutedText, marginTop: '2px' }}>Administered: {imm.date}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: mutedText }}>No immunization records found.</div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div style={{ backgroundColor: cardBg, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summaryData.recent_encounters?.map((e: any, i: number) => (
              <div key={i} style={{ borderLeft: `3px solid ${primaryColor}`, paddingLeft: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{e.type}</div>
                <div style={{ fontSize: '11px', color: mutedText }}>{e.period_start ?? 'Date N/A'} • Reason: {e.reason ?? 'General'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
