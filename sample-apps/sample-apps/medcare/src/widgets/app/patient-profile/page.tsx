'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneticMarker {
  gene: string;
  variant: string;
  phenotype: string;
}

interface Condition {
  name: string;
  status: string;
  severity: string;
}

interface ActiveMedication {
  name: string;
  dose: string;
  frequency: string;
  ndc?: string;
  indication?: string;
}

interface Allergy {
  substance: string;
  reaction: string;
  severity: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  is_primary: boolean;
}

interface RecentLabResult {
  test: string;
  value: number | string;
  unit: string;
  reference_range: string;
  status: string;
  date: string;
}

interface PatientProfile {
  patient_id: string;
  name: string;
  relationship: string;
  age: number;
  sex: string;
  blood_type: string;
  genetic_markers: GeneticMarker[];
  conditions: Condition[];
  active_medications: ActiveMedication[];
  allergies: Allergy[];
  emergency_contacts: EmergencyContact[];
  recent_lab_results?: RecentLabResult[];
}

interface ExtractHealthDataOutput {
  patient_id: string | null;
  extracted_count: number;
  entries: Array<{
    test_name: string;
    value: string | number;
    unit: string;
    reference_range: string;
    status: string;
    date: string;
  }>;
  parsing_notes: string;
  parsed_at: string;
}

type WidgetData = PatientProfile | ExtractHealthDataOutput | { profiles?: PatientProfile[]; patients?: PatientProfile[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityColor(severity: string): string {
  if (severity === 'high' || severity === 'severe') return '#da1e28';
  if (severity === 'moderate') return '#f1c21b';
  if (severity === 'mild' || severity === 'low') return '#24a148';
  return '#8d8d8d';
}

function labStatusColor(status: string): string {
  if (status === 'critical') return '#da1e28';
  if (status === 'above_range' || status === 'below_range') return '#f1c21b';
  if (status === 'normal') return '#24a148';
  return '#8d8d8d';
}

function labStatusLabel(status: string): string {
  if (status === 'above_range') return '↑ High';
  if (status === 'below_range') return '↓ Low';
  if (status === 'critical') return '⚠ Critical';
  if (status === 'normal') return '✓ Normal';
  return status;
}

// ---------------------------------------------------------------------------
// Single Patient Card
// ---------------------------------------------------------------------------

function PatientCard({ patient, isDark }: { patient: PatientProfile; isDark: boolean }) {
  const bgColor = isDark ? '#161616' : '#ffffff';
  const textColor = isDark ? '#f4f4f4' : '#161616';
  const secondaryColor = isDark ? '#c6c6c6' : '#525252';
  const borderColor = isDark ? '#393939' : '#e0e0e0';

  return (
    <div style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      fontFamily: 'sans-serif',
      maxWidth: '480px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      marginBottom: '12px'
    }}>
      {/* Patient header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          backgroundColor: '#0f62fe22',
          color: '#0f62fe',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          {patient.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {patient.name}
          </div>
          <div style={{ fontSize: '12px', color: secondaryColor, marginTop: '2px' }}>
            {patient.relationship} · Age {patient.age} · {patient.sex} · Blood Type: <strong>{patient.blood_type}</strong>
          </div>
        </div>
      </div>

      {/* Genetic markers */}
      {patient.genetic_markers?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: secondaryColor, fontWeight: 'bold', marginBottom: '6px' }}>
            🧬 Genetic Markers
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {patient.genetic_markers.map((m) => (
              <span key={m.gene} title={m.phenotype} style={{
                backgroundColor: '#0043ce22',
                color: '#0043ce',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {m.gene}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active conditions */}
      {patient.conditions?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: secondaryColor, fontWeight: 'bold', marginBottom: '6px' }}>
            Conditions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {patient.conditions.map((c, i) => (
              <span key={i} title={`Status: ${c.status}`} style={{
                backgroundColor: `${severityColor(c.severity)}22`,
                color: severityColor(c.severity),
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active medications */}
      {patient.active_medications?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: secondaryColor, fontWeight: 'bold', marginBottom: '6px' }}>
            💊 Active Medications
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {patient.active_medications.map((m, i) => (
              <span key={i} title={`${m.dose} — ${m.frequency}${m.indication ? ' | ' + m.indication : ''}`} style={{
                backgroundColor: '#24a14822',
                color: '#24a148',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {m.name} {m.dose}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      {patient.allergies?.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: secondaryColor, fontWeight: 'bold', marginBottom: '6px' }}>
            Allergies
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {patient.allergies.map((a, i) => (
              <span key={i} title={`${a.reaction} (${a.severity})`} style={{
                backgroundColor: a.severity === 'severe' ? '#da1e2822' : '#8a3ffc22',
                color: a.severity === 'severe' ? '#da1e28' : '#8a3ffc',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                🚫 {a.substance}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No conditions / no medications */}
      {patient.conditions?.length === 0 && patient.active_medications?.length === 0 && (
        <p style={{ fontSize: '13px', color: secondaryColor, margin: '4px 0 10px' }}>
          No active conditions or medications on file.
        </p>
      )}

      {/* Emergency contact */}
      {patient.emergency_contacts?.length > 0 && (
        <div style={{ marginTop: '8px', borderTop: `1px solid ${borderColor}`, paddingTop: '8px' }}>
          {patient.emergency_contacts.filter(c => c.is_primary).map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: secondaryColor }}>
                Emergency: <strong>{c.name}</strong> ({c.relationship}) — <span style={{ color: '#da1e28' }}>{c.phone}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracted Lab Data View
// ---------------------------------------------------------------------------

function LabDataView({ data, isDark }: { data: ExtractHealthDataOutput; isDark: boolean }) {
  const bgColor = isDark ? '#161616' : '#ffffff';
  const textColor = isDark ? '#f4f4f4' : '#161616';
  const secondaryColor = isDark ? '#c6c6c6' : '#525252';
  const borderColor = isDark ? '#393939' : '#e0e0e0';

  return (
    <div style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      fontFamily: 'sans-serif',
      maxWidth: '480px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      marginBottom: '12px'
    }}>
      <div style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 'bold' }}>
        Lab Report Extraction
        {data.patient_id && <span style={{ fontWeight: 'normal', color: secondaryColor }}> — {data.patient_id}</span>}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: secondaryColor }}>
        {data.parsing_notes}
      </p>
      {data.entries.length > 0 && (
        <div style={{ borderTop: `1px solid ${borderColor}` }}>
          {data.entries.map((entry, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${borderColor}`, padding: '8px 0', display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, paddingRight: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{entry.test_name}</div>
                <div style={{ fontSize: '12px', color: secondaryColor }}>{entry.date}</div>
              </div>
              <div style={{ width: '120px', paddingRight: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {entry.value} {entry.unit}
                </div>
                {entry.reference_range && (
                  <div style={{ fontSize: '12px', color: secondaryColor }}>
                    [{entry.reference_range}]
                  </div>
                )}
              </div>
              <div style={{ width: '90px', textAlign: 'right' }}>
                <span style={{
                  backgroundColor: `${labStatusColor(entry.status)}22`,
                  color: labStatusColor(entry.status),
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}>
                  {labStatusLabel(entry.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dev fallback data
// ---------------------------------------------------------------------------

const DEV_MOCK: PatientProfile = {
  patient_id: 'P001',
  name: 'Arthur Krishnamurthy',
  relationship: 'Grandfather',
  age: 74,
  sex: 'Male',
  blood_type: 'A+',
  genetic_markers: [
    { gene: 'CYP2C19', variant: 'poor_metabolizer', phenotype: 'Poor Metabolizer' },
    { gene: 'SLCO1B1', variant: 'risk_variant', phenotype: 'Decreased Function' },
  ],
  conditions: [
    { name: 'Type 2 Diabetes Mellitus', status: 'active', severity: 'moderate' },
    { name: 'Hypertension', status: 'active', severity: 'moderate' },
    { name: 'Atrial Fibrillation', status: 'active', severity: 'high' },
  ],
  active_medications: [
    { name: 'Metformin', dose: '500mg', frequency: 'twice daily', ndc: '0093-1075-01', indication: 'Diabetes' },
    { name: 'Warfarin', dose: '5mg', frequency: 'once daily', ndc: '0056-0173-75', indication: 'AF — stroke prevention' },
  ],
  allergies: [
    { substance: 'Sulfa drugs', reaction: 'Severe rash, angioedema', severity: 'severe' },
  ],
  emergency_contacts: [
    { name: 'Mary Krishnamurthy', relationship: 'Daughter', phone: '+91-9876-543210', is_primary: true },
  ],
};

// ---------------------------------------------------------------------------
// Main Widget
// ---------------------------------------------------------------------------

export default function PatientProfileWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const liveData = getToolOutput<WidgetData>();
  const rawData = liveData ?? (isReady ? null : DEV_MOCK);
  const isDark = theme === 'dark';

  if (!rawData) {
    return <div style={{ padding: 16 }}>No data received from tool.</div>;
  }

  const isLabData = 'extracted_count' in rawData && 'entries' in rawData;
  const hasProfiles = 'profiles' in rawData || 'patients' in rawData;
  const isSinglePatient = 'patient_id' in rawData && 'name' in rawData && !isLabData;

  return (
    <div>
      {isLabData && <LabDataView data={rawData as ExtractHealthDataOutput} isDark={isDark} />}

      {isSinglePatient && (
        <PatientCard patient={rawData as PatientProfile} isDark={isDark} />
      )}

      {hasProfiles && (
        <>
          {((rawData as { profiles?: PatientProfile[]; patients?: PatientProfile[] }).profiles ||
            (rawData as { profiles?: PatientProfile[]; patients?: PatientProfile[] }).patients || [])
            .map((p) => (
              <PatientCard key={p.patient_id} patient={p} isDark={isDark} />
            ))}
        </>
      )}
    </div>
  );
}
