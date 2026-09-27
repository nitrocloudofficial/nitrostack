import { ConsentRecord } from '../auth/auth.types.js';

/**
 * In-memory store for hospital access consents
 * Key: `${patientId}:${hospitalId}`, Value: ConsentRecord
 */
export const consentStore = new Map<string, ConsentRecord>();

/**
 * Initialize with mock consents (for testing)
 */
export function initializeConsents(): void {
  // Patient 001 has granted access to Hospital 001
  consentStore.set('patient_001:hospital_001', {
    hospitalId: 'hospital_001',
    grantedAt: '2026-01-15T10:00:00Z',
  });

  // Patient 002 has granted access to Hospital 002
  consentStore.set('patient_002:hospital_002', {
    hospitalId: 'hospital_002',
    grantedAt: '2026-01-20T14:30:00Z',
  });
}

/**
 * Check if a hospital has consent to access a patient's records
 */
export function hasConsent(patientId: string, hospitalId: string): boolean {
  const key = `${patientId}:${hospitalId}`;
  const record = consentStore.get(key);
  // Consent is valid if granted and not revoked
  return record !== undefined && !record.revokedAt;
}

/**
 * Grant hospital access to a patient's records
 */
export function grantConsent(patientId: string, hospitalId: string): ConsentRecord {
  const key = `${patientId}:${hospitalId}`;
  const record: ConsentRecord = {
    hospitalId,
    grantedAt: new Date().toISOString(),
  };
  consentStore.set(key, record);
  return record;
}

/**
 * Revoke hospital access to a patient's records
 */
export function revokeConsent(patientId: string, hospitalId: string): void {
  const key = `${patientId}:${hospitalId}`;
  const record = consentStore.get(key);
  if (record) {
    record.revokedAt = new Date().toISOString();
  }
}

/**
 * Get all consents for a patient
 */
export function getPatientConsents(patientId: string): ConsentRecord[] {
  const consents: ConsentRecord[] = [];
  for (const [key, record] of consentStore.entries()) {
    if (key.startsWith(`${patientId}:`)) {
      consents.push(record);
    }
  }
  return consents;
}
