import { Nominee } from '../auth/auth.types.js';

/**
 * In-memory store for patient nominees
 * Key: patientId, Value: Nominee
 */
export const nomineeStore = new Map<string, Nominee>();

/**
 * Initialize with mock nominees (for testing)
 */
export function initializeNominees(): void {
  // Bob Smith (patient_002, senior citizen) has assigned his son as nominee
  nomineeStore.set('patient_002', {
    nomineeAadharId: 'aadhaar_001',
    relationship: 'son',
    verified: true,
    bloodGroup: 'O+',
  });
}

/**
 * Get nominee for a patient
 */
export function getNominee(patientId: string): Nominee | undefined {
  return nomineeStore.get(patientId);
}

/**
 * Assign a nominee to a patient
 */
export function assignNominee(patientId: string, nominee: Nominee): void {
  nomineeStore.set(patientId, nominee);
}

/**
 * Check if a nominee is verified
 */
export function isNomineeVerified(patientId: string): boolean {
  const nominee = nomineeStore.get(patientId);
  return nominee?.verified ?? false;
}
