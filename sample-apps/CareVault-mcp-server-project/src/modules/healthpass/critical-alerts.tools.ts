import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { Role } from '../../auth/auth.types.js';
import { AuthService } from '../../auth/auth.service.js';
import { MOCK_PATIENTS } from '../../fixtures/patients.js';
import { createCriticalAlert, markAlertNotified, getPatientCriticalAlerts } from '../../fixtures/alerts.js';

/**
 * Critical report upload and alert notification tools
 * Lab assistants upload reports; critical reports trigger alerts
 */

const uploadMedicalReportSchema = z.object({
  patientId: z.string().describe('Patient ID'),
  reportType: z.string().describe('Type of report (e.g., "CT Scan", "Blood Test", "X-Ray")'),
  severity: z.enum(['normal', 'critical']).describe('Report severity level'),
  fileRef: z.string().describe('Reference to uploaded file (mock)'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

const sendCriticalReportAlertSchema = z.object({
  patientId: z.string().describe('Patient ID'),
  doctorId: z.string().describe('Doctor ID to notify'),
  reportType: z.string().describe('Type of report'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

@Injectable({ deps: [AuthService] })
export class CriticalAlertsTools {
  constructor(private authService: AuthService) {}

  @Tool({
    name: 'uploadMedicalReport',
    description:
      'Upload a medical report (lab/radiology). If severity is "critical", automatically triggers alert notification to patient and doctor.',
    inputSchema: uploadMedicalReportSchema,
  })
  async uploadMedicalReport(input: z.infer<typeof uploadMedicalReportSchema>, ctx: ExecutionContext) {
    const { patientId, reportType, severity, fileRef, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Check role: only lab_assistant can upload reports
    if (session.role !== Role.LAB_ASSISTANT) {
      return {
        success: false,
        error: `Access denied: only lab assistants can upload reports. Your role: ${session.role}`,
      };
    }

    // Validate patient exists
    if (!MOCK_PATIENTS[patientId]) {
      return {
        success: false,
        error: `Patient ${patientId} not found.`,
      };
    }

    ctx.logger.info(
      `Medical report uploaded: ${reportType} for patient ${patientId}, severity: ${severity}, file: ${fileRef}`
    );

    // If critical, trigger alert (doctor ID is mocked as the first doctor in the system)
    if (severity === 'critical') {
      const doctorId = 'doc_101'; // Mock doctor ID
      const alert = createCriticalAlert(patientId, doctorId, reportType);
      markAlertNotified(alert.alertId);

      ctx.logger.warn(
        `CRITICAL ALERT: ${reportType} for patient ${patientId} - notifying doctor ${doctorId}`
      );

      return {
        success: true,
        message: `Report uploaded successfully. CRITICAL severity detected - alert sent to patient and doctor.`,
        reportType,
        severity,
        fileRef,
        alertTriggered: true,
        alertId: alert.alertId,
      };
    }

    return {
      success: true,
      message: `Report uploaded successfully.`,
      reportType,
      severity,
      fileRef,
      alertTriggered: false,
    };
  }

  @Tool({
    name: 'sendCriticalReportAlert',
    description:
      'Send a critical report alert notification to both patient and doctor. Logs as a distinct notification type.',
    inputSchema: sendCriticalReportAlertSchema,
  })
  async sendCriticalReportAlert(
    input: z.infer<typeof sendCriticalReportAlertSchema>,
    ctx: ExecutionContext
  ) {
    const { patientId, doctorId, reportType, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Check role: only lab_assistant or doctor can send alerts
    if (session.role !== Role.LAB_ASSISTANT && session.role !== Role.DOCTOR) {
      return {
        success: false,
        error: `Access denied: only lab assistants or doctors can send alerts. Your role: ${session.role}`,
      };
    }

    // Validate patient and doctor exist
    if (!MOCK_PATIENTS[patientId]) {
      return {
        success: false,
        error: `Patient ${patientId} not found.`,
      };
    }

    // Create and log the alert
    const alert = createCriticalAlert(patientId, doctorId, reportType);
    markAlertNotified(alert.alertId);

    ctx.logger.warn(
      `CRITICAL ALERT SENT: ${reportType} for patient ${patientId} to doctor ${doctorId} (Alert ID: ${alert.alertId})`
    );

    return {
      success: true,
      message: `Critical alert sent to patient ${patientId} and doctor ${doctorId}.`,
      alertId: alert.alertId,
      patientId,
      doctorId,
      reportType,
      timestamp: alert.timestamp,
      notified: true,
    };
  }
}
