import { User, Role } from '../auth/auth.types.js';

/**
 * Mock users with roles for testing
 */
export const mockUsers: User[] = [
  // Patients
  {
    userId: 'user_p001',
    name: 'Alice Johnson',
    role: Role.PATIENT,
    patientId: 'patient_001',
    isSeniorCitizen: false,
  },
  {
    userId: 'user_p002',
    name: 'Bob Smith',
    role: Role.PATIENT,
    patientId: 'patient_002',
    isSeniorCitizen: true, // Senior citizen — can assign nominee
  },
  {
    userId: 'user_p003',
    name: 'Carol Davis',
    role: Role.PATIENT,
    patientId: 'patient_003',
    isSeniorCitizen: false,
  },

  // Doctors
  {
    userId: 'user_d001',
    name: 'Dr. John Wilson',
    role: Role.DOCTOR,
    hospitalId: 'hospital_001',
  },
  {
    userId: 'user_d002',
    name: 'Dr. Lisa Park',
    role: Role.DOCTOR,
    hospitalId: 'hospital_001',
  },
  {
    userId: 'user_d003',
    name: 'Dr. Michael Chen',
    role: Role.DOCTOR,
    hospitalId: 'hospital_002',
  },

  // Lab Assistants
  {
    userId: 'user_lab001',
    name: 'Lab Tech Sarah',
    role: Role.LAB_ASSISTANT,
    hospitalId: 'hospital_001',
  },
  {
    userId: 'user_lab002',
    name: 'Lab Tech James',
    role: Role.LAB_ASSISTANT,
    hospitalId: 'hospital_002',
  },
];

/**
 * Mock Aadhaar → blood group lookup table
 * Deterministic: hash-based matching for verification
 */
export const aadharBloodGroupLookup: Record<string, string> = {
  'aadhaar_001': 'O+',
  'aadhaar_002': 'A+',
  'aadhaar_003': 'B+',
  'aadhaar_004': 'AB+',
  'aadhaar_005': 'O-',
  'aadhaar_006': 'A-',
};

/**
 * Verify nominee blood group against Aadhaar lookup
 * Returns true if declared blood group matches Aadhaar record
 */
export function verifyNomineeBloodGroupMock(
  nomineeAadharId: string,
  declaredBloodGroup: string
): boolean {
  const aadharBloodGroup = aadharBloodGroupLookup[nomineeAadharId];
  if (!aadharBloodGroup) {
    // Aadhaar not found in mock database
    return false;
  }
  return aadharBloodGroup === declaredBloodGroup;
}
