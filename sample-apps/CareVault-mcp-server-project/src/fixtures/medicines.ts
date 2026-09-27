/**
 * Mock medicines/prescriptions for HealthPass Lite
 */

export interface Medicine {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "Once daily", "Twice daily", "Every 8 hours"
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate?: string; // ISO date (YYYY-MM-DD), optional for ongoing
  prescribedBy: string; // Doctor name
}

export const MOCK_MEDICINES: Medicine[] = [
  {
    id: 'med_001',
    patientId: 'patient_001',
    name: 'Lisinopril',
    dosage: '10 mg',
    frequency: 'Once daily',
    startDate: '2026-06-15',
    prescribedBy: 'Dr. Sarah Mitchell'
  },
  {
    id: 'med_002',
    patientId: 'patient_001',
    name: 'Atorvastatin',
    dosage: '20 mg',
    frequency: 'Once daily at bedtime',
    startDate: '2026-06-15',
    prescribedBy: 'Dr. Sarah Mitchell'
  },
  {
    id: 'med_003',
    patientId: 'patient_001',
    name: 'Aspirin',
    dosage: '81 mg',
    frequency: 'Once daily',
    startDate: '2026-06-15',
    endDate: '2026-09-15',
    prescribedBy: 'Dr. Sarah Mitchell'
  },
  {
    id: 'med_004',
    patientId: 'patient_002',
    name: 'Metformin',
    dosage: '500 mg',
    frequency: 'Twice daily with meals',
    startDate: '2026-05-01',
    prescribedBy: 'Dr. James Chen'
  },
  {
    id: 'med_005',
    patientId: 'patient_002',
    name: 'Ibuprofen',
    dosage: '400 mg',
    frequency: 'Every 6-8 hours as needed',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    prescribedBy: 'Dr. Emily Rodriguez'
  },
  {
    id: 'med_006',
    patientId: 'patient_003',
    name: 'Levothyroxine',
    dosage: '50 mcg',
    frequency: 'Once daily in the morning',
    startDate: '2026-03-10',
    prescribedBy: 'Dr. Sarah Mitchell'
  },
  {
    id: 'med_007',
    patientId: 'patient_004',
    name: 'Vitamin B12 Injection',
    dosage: '1000 mcg',
    frequency: 'Once monthly',
    startDate: '2026-07-01',
    prescribedBy: 'Dr. Michael Brown'
  },
  {
    id: 'med_008',
    patientId: 'patient_004',
    name: 'Donepezil',
    dosage: '5 mg',
    frequency: 'Once daily at bedtime',
    startDate: '2026-04-20',
    prescribedBy: 'Dr. Michael Brown'
  }
];

/**
 * Get medicines for a patient
 */
export function getPatientMedicines(patientId: string): Medicine[] {
  return MOCK_MEDICINES.filter(med => med.patientId === patientId);
}
