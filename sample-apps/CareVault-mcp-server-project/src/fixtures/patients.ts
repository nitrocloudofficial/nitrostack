/**
 * Mock patient records for HealthPass Lite
 */

export interface Patient {
  id: string;
  name: string;
  age: number;
  bloodGroup: string;
  allergies: string[];
  email: string;
  isSeniorCitizen?: boolean;
}

export const MOCK_PATIENTS: Record<string, Patient> = {
  'patient_001': {
    id: 'patient_001',
    name: 'Alice Johnson',
    age: 34,
    bloodGroup: 'O+',
    allergies: ['Penicillin', 'Shellfish'],
    email: 'alice.johnson@example.com'
  },
  'patient_002': {
    id: 'patient_002',
    name: 'Bob Smith',
    age: 52,
    bloodGroup: 'A-',
    allergies: ['Aspirin'],
    email: 'bob.smith@example.com'
  },
  'patient_003': {
    id: 'patient_003',
    name: 'Carol Davis',
    age: 28,
    bloodGroup: 'B+',
    allergies: [],
    email: 'carol.davis@example.com'
  },
  'patient_004': {
    id: 'patient_004',
    name: 'David Wilson',
    age: 61,
    bloodGroup: 'AB+',
    allergies: ['Latex', 'Iodine'],
    email: 'david.wilson@example.com'
  }
};
