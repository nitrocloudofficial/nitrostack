/**
 * Mock lab reports for HealthPass Lite
 */

export interface LabReport {
  id: string;
  patientId: string;
  testName: string;
  date: string; // ISO date string (YYYY-MM-DD)
  result: number;
  unit: string;
  normalRange: {
    min: number;
    max: number;
  };
  isAbnormal: boolean;
  notes?: string;
}

export const MOCK_LAB_REPORTS: LabReport[] = [
  {
    id: 'lab_001',
    patientId: 'patient_001',
    testName: 'Blood Glucose (Fasting)',
    date: '2026-08-01',
    result: 95,
    unit: 'mg/dL',
    normalRange: { min: 70, max: 100 },
    isAbnormal: false,
    notes: 'Fasting sample collected'
  },
  {
    id: 'lab_002',
    patientId: 'patient_001',
    testName: 'Total Cholesterol',
    date: '2026-08-01',
    result: 220,
    unit: 'mg/dL',
    normalRange: { min: 0, max: 200 },
    isAbnormal: true,
    notes: 'Slightly elevated'
  },
  {
    id: 'lab_003',
    patientId: 'patient_001',
    testName: 'HDL Cholesterol',
    date: '2026-08-01',
    result: 45,
    unit: 'mg/dL',
    normalRange: { min: 40, max: 60 },
    isAbnormal: false
  },
  {
    id: 'lab_004',
    patientId: 'patient_002',
    testName: 'Hemoglobin A1C',
    date: '2026-07-28',
    result: 6.8,
    unit: '%',
    normalRange: { min: 4.0, max: 5.6 },
    isAbnormal: true,
    notes: 'Elevated'
  },
  {
    id: 'lab_005',
    patientId: 'patient_002',
    testName: 'Creatinine',
    date: '2026-07-28',
    result: 1.1,
    unit: 'mg/dL',
    normalRange: { min: 0.7, max: 1.3 },
    isAbnormal: false
  },
  {
    id: 'lab_006',
    patientId: 'patient_003',
    testName: 'Thyroid TSH',
    date: '2026-08-05',
    result: 2.5,
    unit: 'mIU/L',
    normalRange: { min: 0.4, max: 4.0 },
    isAbnormal: false
  },
  {
    id: 'lab_007',
    patientId: 'patient_004',
    testName: 'Vitamin B12',
    date: '2026-08-03',
    result: 180,
    unit: 'pg/mL',
    normalRange: { min: 200, max: 900 },
    isAbnormal: true,
    notes: 'Low'
  }
];

/**
 * Get lab reports for a patient
 */
export function getPatientLabReports(patientId: string): LabReport[] {
  return MOCK_LAB_REPORTS.filter(report => report.patientId === patientId);
}
