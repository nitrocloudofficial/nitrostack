'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Allergy {
  substance: string;
  reaction: string;
  severity: string;
  cross_reactions?: string[];
}

interface Condition {
  name: string;
  icd10?: string;
  status: string;
  severity: string;
}

interface ActiveMedication {
  name: string;
  dose: string;
  frequency: string;
  indication?: string;
}

interface GeneticAlert {
  gene: string;
  phenotype: string;
  emergency_relevance: string;
  clinical_note?: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  is_primary: boolean;
}

interface EmergencyCardData {
  patient_id: string;
  name: string;
  relationship: string;
  age: number;
  sex: string;
  blood_type: string;
  weight_kg: number;
  height_cm: number;
  critical_allergies: Allergy[];
  critical_conditions: Condition[];
  all_conditions: Condition[];
  active_medications: ActiveMedication[];
  genetic_alerts: GeneticAlert[];
  emergency_contacts: EmergencyContact[];
  care_warnings: string[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Dev fallback data
// ---------------------------------------------------------------------------

const DEV_MOCK: EmergencyCardData = {
  patient_id: 'P001',
  name: 'Arthur Krishnamurthy',
  relationship: 'Grandfather',
  age: 74,
  sex: 'Male',
  blood_type: 'A+',
  weight_kg: 72,
  height_cm: 168,
  critical_allergies: [
    { substance: 'Sulfa drugs', reaction: 'Severe rash, angioedema', severity: 'severe' },
  ],
  critical_conditions: [
    { name: 'Atrial Fibrillation', status: 'active', severity: 'high' },
    { name: 'Type 2 Diabetes Mellitus', status: 'active', severity: 'moderate' },
  ],
  all_conditions: [],
  active_medications: [
    { name: 'Warfarin', dose: '5mg', frequency: 'once daily', indication: 'AF - stroke prevention' },
    { name: 'Metformin', dose: '500mg', frequency: 'twice daily', indication: 'Diabetes' },
  ],
  genetic_alerts: [
    {
      gene: 'CYP2C19',
      phenotype: 'Poor Metabolizer',
      emergency_relevance: 'Avoid Clopidogrel (ineffective). Warfarin dosing may require adjustment. Inform treating physician before antiplatelet therapy.',
    },
  ],
  emergency_contacts: [
    { name: 'Mary Krishnamurthy', relationship: 'Daughter', phone: '+91-9876-543210', is_primary: true },
  ],
  care_warnings: [
    '🚫 SEVERE ALLERGY: Sulfa drugs — Severe rash, angioedema.',
    '⚠️ ANTICOAGULANT: Patient is on Warfarin. Increased bleeding risk. Check INR before any invasive procedures.',
    'ℹ️ ELDERLY PATIENT: Apply Beers Criteria. Monitor for polypharmacy interactions.',
  ],
  generated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Widget Component
// ---------------------------------------------------------------------------

export default function EmergencyCardWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const liveData = getToolOutput<EmergencyCardData>();
  const data = liveData ?? (isReady ? null : DEV_MOCK);
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#161616' : '#ffffff';
  const textColor = isDark ? '#f4f4f4' : '#161616';
  const secondaryColor = isDark ? '#c6c6c6' : '#525252';
  const borderColor = isDark ? '#393939' : '#e0e0e0';

  if (!data) {
    return <div style={{ padding: 16 }}>No data received from tool.</div>;
  }

  return (
    <div style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      fontFamily: 'sans-serif',
      maxWidth: '520px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
    }}>
      {/* Emergency Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '14px',
        padding: '10px 12px',
        backgroundColor: '#fff1f1',
        border: '1px solid #da1e28',
        borderRadius: '4px',
        color: '#161616'
      }}>
        <div style={{
          backgroundColor: '#da1e28',
          color: '#fff',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          flexShrink: 0,
          fontSize: '20px'
        }}>
          +
        </div>
        <div>
          <div style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#da1e28', fontWeight: 'bold' }}>
            Emergency Medical Card
          </div>
          <div style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 'bold' }}>
            {data.name}
          </div>
        </div>
      </div>

      {/* Critical vitals — Blood Type prominent */}
      <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '8px', marginBottom: '14px' }}>
        <table style={{ width: '100%', fontSize: '14px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${borderColor}55` }}>
              <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}><strong>Blood Type</strong></th>
              <td style={{ padding: '8px 0' }}>
                <span style={{ backgroundColor: '#da1e2822', color: '#da1e28', padding: '2px 8px', borderRadius: '4px', fontSize: '15px', fontWeight: 'bold' }}>
                  {data.blood_type}
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${borderColor}55` }}>
              <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>Age / Sex</th>
              <td style={{ padding: '8px 0', fontWeight: '500' }}>{data.age} years · {data.sex}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${borderColor}55` }}>
              <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>Weight / Height</th>
              <td style={{ padding: '8px 0', fontWeight: '500' }}>{data.weight_kg} kg · {data.height_cm} cm</td>
            </tr>
            <tr>
              <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>Relationship</th>
              <td style={{ padding: '8px 0', fontWeight: '500' }}>{data.relationship}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Critical Allergies */}
      {data.critical_allergies?.length > 0 && (
        <div style={{ marginTop: '14px', padding: '10px 12px', backgroundColor: '#fff1f1', borderRadius: '4px', border: '1px solid #da1e28', color: '#161616' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: '#da1e28', marginBottom: '8px' }}>
            ⚠️ Allergies ({data.critical_allergies.length})
          </div>
          {data.critical_allergies.map((a, i) => (
            <div key={i} style={{ marginBottom: i < data.critical_allergies.length - 1 ? '8px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: a.severity === 'severe' ? '#da1e28' : '#8d8d8d', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  {a.severity.toUpperCase()}
                </span>
                <strong style={{ fontSize: '14px' }}>{a.substance}</strong>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#525252' }}>
                Reaction: {a.reaction}
                {a.cross_reactions?.length ? ` · Cross-reactive: ${a.cross_reactions.join(', ')}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Care Warnings */}
      {data.care_warnings?.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: secondaryColor, marginBottom: '6px' }}>
            🚨 Care Warnings
          </div>
          {data.care_warnings.map((w, i) => (
            <p key={i} style={{
              margin: '4px 0',
              fontSize: '13px',
              color: textColor,
              padding: '6px 10px',
              backgroundColor: isDark ? '#262626' : '#f4f4f4',
              borderRadius: '4px',
              borderLeft: '3px solid #f1c21b',
            }}>{w}</p>
          ))}
        </div>
      )}

      {/* Active Medications */}
      {data.active_medications?.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: secondaryColor, marginBottom: '6px' }}>
            💊 Active Medications
          </div>
          <div style={{ borderTop: `1px solid ${borderColor}` }}>
            {data.active_medications.map((m, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${borderColor}`, padding: '8px 0', display: 'flex' }}>
                <div style={{ flex: 1, paddingRight: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  {m.name}
                </div>
                <div style={{ flex: 1, paddingRight: '8px', fontSize: '14px' }}>
                  {m.dose} · {m.frequency}
                </div>
                <div style={{ flex: 1, fontSize: '12px', color: secondaryColor }}>
                  {m.indication || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genetic Alerts */}
      {data.genetic_alerts?.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: secondaryColor, marginBottom: '6px' }}>
            🧬 Genetic Alerts for Emergency Care
          </div>
          {data.genetic_alerts.map((g, i) => (
            <div key={i} style={{
              padding: '8px 10px',
              backgroundColor: isDark ? '#262626' : '#f4f4f4',
              borderRadius: '4px',
              borderLeft: '3px solid #0f62fe',
              marginBottom: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ backgroundColor: '#0f62fe22', color: '#0f62fe', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{g.gene}</span>
                <span style={{ fontSize: '12px', color: secondaryColor }}>{g.phenotype}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: textColor }}>
                {g.emergency_relevance}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Emergency Contacts */}
      {data.emergency_contacts?.length > 0 && (
        <div style={{
          marginTop: '14px',
          borderTop: '2px solid #da1e28',
          paddingTop: '10px',
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold', color: '#da1e28', marginBottom: '8px' }}>
            📞 Emergency Contacts
          </div>
          {data.emergency_contacts.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <strong style={{ fontSize: '14px' }}>{c.name}</strong>
                <span style={{ fontSize: '12px', color: secondaryColor, marginLeft: '6px' }}>({c.relationship})</span>
                {c.is_primary && <span style={{ backgroundColor: '#da1e2822', color: '#da1e28', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginLeft: '6px' }}>Primary</span>}
              </div>
              <strong style={{ fontSize: '14px', color: '#0f62fe' }}>{c.phone}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ margin: '10px 0 0', fontSize: '11px', color: secondaryColor, borderTop: `1px solid ${borderColor}`, paddingTop: '6px' }}>
        Generated: {new Date(data.generated_at).toLocaleString()} · ID: {data.patient_id}
      </div>
    </div>
  );
}
