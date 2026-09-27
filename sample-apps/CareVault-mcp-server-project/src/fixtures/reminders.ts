/**
 * In-memory reminder store for HealthPass Lite
 * Stores medicine reminder schedules keyed by patientId + medicineId
 */

export interface MedicineReminder {
  patientId: string;
  medicineId: string;
  times: string[]; // Array of HH:MM format times
  createdAt: string; // ISO timestamp
}

// In-memory store (persists during session)
export const REMINDER_STORE: Map<string, MedicineReminder> = new Map();

/**
 * Generate a key for storing reminders
 */
function getReminderKey(patientId: string, medicineId: string): string {
  return `${patientId}:${medicineId}`;
}

/**
 * Set a medicine reminder
 */
export function setMedicineReminder(
  patientId: string,
  medicineId: string,
  times: string[]
): MedicineReminder {
  const key = getReminderKey(patientId, medicineId);
  const reminder: MedicineReminder = {
    patientId,
    medicineId,
    times,
    createdAt: new Date().toISOString()
  };
  REMINDER_STORE.set(key, reminder);
  return reminder;
}

/**
 * Get a medicine reminder
 */
export function getMedicineReminder(
  patientId: string,
  medicineId: string
): MedicineReminder | undefined {
  const key = getReminderKey(patientId, medicineId);
  return REMINDER_STORE.get(key);
}

/**
 * Get all reminders for a patient
 */
export function getPatientReminders(patientId: string): MedicineReminder[] {
  const reminders: MedicineReminder[] = [];
  REMINDER_STORE.forEach((reminder) => {
    if (reminder.patientId === patientId) {
      reminders.push(reminder);
    }
  });
  return reminders;
}

/**
 * Delete a medicine reminder
 */
export function deleteMedicineReminder(
  patientId: string,
  medicineId: string
): boolean {
  const key = getReminderKey(patientId, medicineId);
  return REMINDER_STORE.delete(key);
}
