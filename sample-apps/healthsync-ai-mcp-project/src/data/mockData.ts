export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  activeMedications: { name: string; dosage: string }[];
  timeline: { year: string; title: string; location: string; category: string; notes: string }[];
  labTrends: { test: string; value: string; status: string; note: string }[];
}

export const PATIENT_RECORD: PatientRecord = {
  id: 'PAT-101',
  name: 'Saksham Neupane',
  age: 22,
  gender: 'Male',
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Sulfa Drugs'],
  chronicConditions: ['Type-2 Diabetes', 'Hypertension'],
  activeMedications: [
    { name: 'Metformin 500mg', dosage: 'Once daily (Morning)' },
    { name: 'Enalapril 10mg', dosage: 'Once daily (Night)' }
  ],
  timeline: [
    {
      year: '2022',
      title: 'Appendix Surgery (Appendectomy)',
      location: 'SRM Hospital',
      category: 'Surgery',
      notes: 'Laparoscopic procedure, full recovery.'
    },
    {
      year: '2023',
      title: 'Type-2 Diabetes Diagnosed',
      location: 'City Care Clinic',
      category: 'Diagnosis',
      notes: 'HbA1c was 7.8%. Started on Metformin.'
    },
    {
      year: '2024',
      title: 'Lumbar Spine MRI Scan',
      location: 'Apollo Diagnostics',
      category: 'Imaging',
      notes: 'Mild L4-L5 disc bulge observed.'
    },
    {
      year: '2025',
      title: 'Hypertension Treatment Initiated',
      location: 'Fortis Healthcare',
      category: 'Medication',
      notes: 'BP recorded at 145/92. Prescribed Enalapril.'
    }
  ],
  labTrends: [
    { test: 'HbA1c', value: '7.2%', status: 'IMPROVING', note: 'Down from 7.8% last year' },
    { test: 'Hemoglobin', value: '11.8 g/dL', status: 'DECREASING', note: 'Dropped 18% in last 8 months' },
    { test: 'Fasting Blood Sugar', value: '135 mg/dL', status: 'STABLE', note: 'Controlled with medication' }
  ]
};

export const PHARMACY_DATABASE: Record<string, any> = {
  'Atorvastatin 20mg': {
    drugName: 'Atorvastatin 20mg',
    brandName: 'Lipitor',
    hospitalStock: 0,
    hospitalPrice: 1200,
    apolloPrice: 1050,
    nearbyStorePrice: 980,
    genericOption: {
      name: 'Atorvastatin Calcium (Generic)',
      price: 450,
      savings: '62% cheaper',
      doctorApproved: true
    },
    deliveryEstimate: '35 minutes',
    refillDaysRemaining: 28
  },
  'Sumatriptan 50mg': {
    drugName: 'Sumatriptan 50mg',
    brandName: 'Imitrex',
    hospitalStock: 10,
    hospitalPrice: 85,
    apolloPrice: 75,
    nearbyStorePrice: 70,
    genericOption: {
      name: 'Sumatriptan Succinate (Generic)',
      price: 22.75,
      savings: '73% cheaper',
      doctorApproved: true
    },
    deliveryEstimate: '20 minutes',
    refillDaysRemaining: 14
  }
};