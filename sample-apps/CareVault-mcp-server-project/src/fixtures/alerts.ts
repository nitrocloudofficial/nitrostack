import { CriticalAlert } from '../auth/auth.types.js';

/**
 * In-memory store for critical alerts
 * Key: alertId, Value: CriticalAlert
 */
export const criticalAlertStore = new Map<string, CriticalAlert>();

let alertIdCounter = 1;

/**
 * Create a critical alert and log it
 */
export function createCriticalAlert(
  patientId: string,
  doctorId: string,
  reportType: string
): CriticalAlert {
  const alertId = `alert_${alertIdCounter++}`;
  const alert: CriticalAlert = {
    alertId,
    patientId,
    doctorId,
    reportType,
    severity: 'critical',
    timestamp: new Date().toISOString(),
    notified: false,
  };
  criticalAlertStore.set(alertId, alert);
  return alert;
}

/**
 * Mark an alert as notified
 */
export function markAlertNotified(alertId: string): void {
  const alert = criticalAlertStore.get(alertId);
  if (alert) {
    alert.notified = true;
  }
}

/**
 * Get all critical alerts for a patient
 */
export function getPatientCriticalAlerts(patientId: string): CriticalAlert[] {
  const alerts: CriticalAlert[] = [];
  for (const alert of criticalAlertStore.values()) {
    if (alert.patientId === patientId) {
      alerts.push(alert);
    }
  }
  return alerts;
}

/**
 * Get all critical alerts for a doctor
 */
export function getDoctorCriticalAlerts(doctorId: string): CriticalAlert[] {
  const alerts: CriticalAlert[] = [];
  for (const alert of criticalAlertStore.values()) {
    if (alert.doctorId === doctorId) {
      alerts.push(alert);
    }
  }
  return alerts;
}

/**
 * Get all critical alerts (for audit)
 */
export function getAllCriticalAlerts(): CriticalAlert[] {
  return Array.from(criticalAlertStore.values());
}
