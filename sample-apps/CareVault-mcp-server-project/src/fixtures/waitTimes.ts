import { WaitTimeEntry } from '../auth/auth.types.js';

/**
 * In-memory store for hospital wait times
 * Key: `${hospitalId}:${departmentId}`, Value: WaitTimeEntry
 */
export const waitTimeStore = new Map<string, WaitTimeEntry>();

/**
 * Initialize with mock wait times (for testing)
 */
export function initializeWaitTimes(): void {
  // Hospital 001 - Emergency: 15 minutes
  waitTimeStore.set('hospital_001:emergency', {
    hospitalId: 'hospital_001',
    departmentId: 'emergency',
    estimatedMinutes: 15,
    lastUpdated: new Date().toISOString(),
  });

  // Hospital 001 - Cardiology: 45 minutes
  waitTimeStore.set('hospital_001:cardiology', {
    hospitalId: 'hospital_001',
    departmentId: 'cardiology',
    estimatedMinutes: 45,
    lastUpdated: new Date().toISOString(),
  });

  // Hospital 002 - Lab: 10 minutes
  waitTimeStore.set('hospital_002:lab', {
    hospitalId: 'hospital_002',
    departmentId: 'lab',
    estimatedMinutes: 10,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Get wait time for a hospital department
 */
export function getWaitTime(hospitalId: string, departmentId: string): WaitTimeEntry | undefined {
  const key = `${hospitalId}:${departmentId}`;
  return waitTimeStore.get(key);
}

/**
 * Update wait time for a hospital department
 */
export function updateWaitTime(
  hospitalId: string,
  departmentId: string,
  estimatedMinutes: number
): WaitTimeEntry {
  const key = `${hospitalId}:${departmentId}`;
  const entry: WaitTimeEntry = {
    hospitalId,
    departmentId,
    estimatedMinutes,
    lastUpdated: new Date().toISOString(),
  };
  waitTimeStore.set(key, entry);
  return entry;
}

/**
 * Get all wait times for a hospital
 */
export function getHospitalWaitTimes(hospitalId: string): WaitTimeEntry[] {
  const times: WaitTimeEntry[] = [];
  for (const entry of waitTimeStore.values()) {
    if (entry.hospitalId === hospitalId) {
      times.push(entry);
    }
  }
  return times;
}
