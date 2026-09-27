/**
 * Authentication & Authorization Types
 */

export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  LAB_ASSISTANT = 'lab_assistant'
}

export interface SessionContext {
  userId: string;
  role: Role;
  hospitalId?: string; // For doctor/lab_assistant
  patientId?: string; // For patient role
  name: string;
}

export interface RoleCheckOptions {
  allowedRoles?: Role[];
  requiredRoles?: Role[];
  resourceOwnerId?: string; // For ownership checks (e.g., patient accessing own record)
  hospitalId?: string; // For hospital-scoped access
  requireHospitalId?: boolean;
}

export interface AadhaarRecord {
  aadhaarId: string;
  name: string;
  bloodGroup: string;
  dateOfBirth: string;
}

/**
 * User type for mock users
 */
export interface User {
  userId: string;
  name: string;
  role: Role;
  patientId?: string; // For patients
  hospitalId?: string; // For doctors/lab_assistants
  isSeniorCitizen?: boolean; // For patients
}

/**
 * Nominee type for senior citizen access delegation
 */
export interface Nominee {
  nomineeAadharId: string;
  relationship: string;
  verified: boolean;
  bloodGroup: string;
}

/**
 * Consent record for hospital access
 */
export interface ConsentRecord {
  hospitalId: string;
  grantedAt: string;
  revokedAt?: string;
}

/**
 * Critical alert for medical reports
 */
export interface CriticalAlert {
  alertId: string;
  patientId: string;
  doctorId: string;
  reportType: string;
  severity: 'critical' | 'normal';
  timestamp: string;
  notified: boolean;
}

/**
 * Wait time entry for hospital departments
 */
export interface WaitTimeEntry {
  hospitalId: string;
  departmentId: string;
  estimatedMinutes: number;
  lastUpdated: string;
}
