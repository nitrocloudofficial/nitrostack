import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { Role } from '../../auth/auth.types.js';
import { AuthService } from '../../auth/auth.service.js';
import { MOCK_PATIENTS } from '../../fixtures/patients.js';
import {
  hasConsent,
  grantConsent,
  revokeConsent,
  getPatientConsents,
} from '../../fixtures/consents.js';
import {
  getPatientAppointments,
  Appointment,
} from '../../fixtures/appointments.js';
import { getPatientLabReports } from '../../fixtures/labReports.js';
import { getPatientMedicines } from '../../fixtures/medicines.js';

/**
 * Consent and hospital access management tools
 * Patients grant/revoke; hospitals request; doctors read with consent
 */

const requestPatientAccessSchema = z.object({
  hospitalId: z.string().describe('Hospital ID requesting access'),
  patientId: z.string().describe('Patient ID'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

const grantHospitalAccessSchema = z.object({
  patientId: z.string().describe('Patient ID'),
  hospitalId: z.string().describe('Hospital ID to grant access to'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

const revokeHospitalAccessSchema = z.object({
  patientId: z.string().describe('Patient ID'),
  hospitalId: z.string().describe('Hospital ID to revoke access from'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

const getMedicalHistorySchema = z.object({
  patientId: z.string().describe('Patient ID'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

@Injectable({ deps: [AuthService] })
export class ConsentTools {
  constructor(private authService: AuthService) {}

  @Tool({
    name: 'requestPatientAccess',
    description:
      'Hospital requests access to a patient\'s medical records. Patient must grant access separately.',
    inputSchema: requestPatientAccessSchema,
  })
  async requestPatientAccess(
    input: z.infer<typeof requestPatientAccessSchema>,
    ctx: ExecutionContext
  ) {
    const { hospitalId, patientId, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Check role: only doctor can request access
    if (session.role !== Role.DOCTOR) {
      return {
        success: false,
        error: `Access denied: only doctors can request patient access. Your role: ${session.role}`,
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
      `Access request: Hospital ${hospitalId} requesting access to patient ${patientId}`
    );

    return {
      success: true,
      message: `Access request submitted. Patient will be notified and can grant or deny access.`,
      hospitalId,
      patientId,
      status: 'pending',
    };
  }

  @Tool({
    name: 'grantHospitalAccess',
    description:
      'Patient grants a hospital access to their medical records. Only the patient can call this.',
    inputSchema: grantHospitalAccessSchema,
  })
  async grantHospitalAccess(
    input: z.infer<typeof grantHospitalAccessSchema>,
    ctx: ExecutionContext
  ) {
    const { patientId, hospitalId, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Check role: only patient can grant access
    if (session.role !== Role.PATIENT) {
      return {
        success: false,
        error: `Access denied: only patients can grant access. Your role: ${session.role}`,
      };
    }

    // Check if patient is accessing their own record
    if (session.patientId !== patientId) {
      return {
        success: false,
        error: 'Access denied: you can only grant access to your own records.',
      };
    }

    // Grant consent
    const record = grantConsent(patientId, hospitalId);

    ctx.logger.info(`Consent granted: Patient ${patientId} granted access to Hospital ${hospitalId}`);

    return {
      success: true,
      message: `Access granted to Hospital ${hospitalId}. They can now view your medical records.`,
      patientId,
      hospitalId,
      grantedAt: record.grantedAt,
    };
  }

  @Tool({
    name: 'revokeHospitalAccess',
    description:
      'Patient revokes a hospital\'s access to their medical records. Only the patient can call this.',
    inputSchema: revokeHospitalAccessSchema,
  })
  async revokeHospitalAccess(
    input: z.infer<typeof revokeHospitalAccessSchema>,
    ctx: ExecutionContext
  ) {
    const { patientId, hospitalId, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Check role: only patient can revoke access
    if (session.role !== Role.PATIENT) {
      return {
        success: false,
        error: `Access denied: only patients can revoke access. Your role: ${session.role}`,
      };
    }

    // Check if patient is accessing their own record
    if (session.patientId !== patientId) {
      return {
        success: false,
        error: 'Access denied: you can only revoke access to your own records.',
      };
    }

    // Revoke consent
    revokeConsent(patientId, hospitalId);

    ctx.logger.info(`Consent revoked: Patient ${patientId} revoked access from Hospital ${hospitalId}`);

    return {
      success: true,
      message: `Access revoked from Hospital ${hospitalId}. They can no longer view your medical records.`,
      patientId,
      hospitalId,
      revokedAt: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'getMedicalHistory',
    description:
      'Get a patient\'s medical history (appointments, lab reports, medicines). Doctors must have consent; patients can access their own records.',
    inputSchema: getMedicalHistorySchema,
  })
  async getMedicalHistory(input: z.infer<typeof getMedicalHistorySchema>, ctx: ExecutionContext) {
    const { patientId, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Validate patient exists
    if (!MOCK_PATIENTS[patientId]) {
      return {
        success: false,
        error: `Patient ${patientId} not found.`,
      };
    }

    // Check access based on role
    if (session.role === Role.PATIENT) {
      // Patient can access own records
      if (session.patientId !== patientId) {
        return {
          success: false,
          error: 'Access denied: you can only access your own medical history.',
        };
      }
    } else if (session.role === Role.DOCTOR) {
      // Doctor must have consent
      if (!session.hospitalId) {
        return {
          success: false,
          error: 'Access denied: doctor must have a hospital ID.',
        };
      }

      if (!hasConsent(patientId, session.hospitalId)) {
        ctx.logger.warn(
          `Access denied: Doctor from Hospital ${session.hospitalId} lacks consent for patient ${patientId}`
        );
        return {
          success: false,
          error: `Access denied: consent not granted. Patient ${patientId} has not granted access to Hospital ${session.hospitalId}.`,
        };
      }
    } else {
      // Lab assistants cannot read full medical history
      return {
        success: false,
        error: `Access denied: ${session.role} cannot read full medical history.`,
      };
    }

    // Fetch medical history
    const appointments = getPatientAppointments(patientId);
    const labReports = getPatientLabReports(patientId);
    const medicines = getPatientMedicines(patientId);

    ctx.logger.info(
      `Medical history retrieved for patient ${patientId} by ${session.role} (${sessionUserId})`
    );

    return {
      success: true,
      patientId,
      appointments: appointments.map((apt: Appointment) => ({
        id: apt.id,
        doctorName: apt.doctorName,
        specialty: apt.specialty,
        date: apt.date,
        time: apt.time,
        status: apt.status,
      })),
      labReports: labReports.map((report) => ({
        id: report.id,
        testName: report.testName,
        date: report.date,
        result: report.result,
        unit: report.unit,
        isAbnormal: report.isAbnormal,
      })),
      medicines: medicines.map((med) => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        prescribedBy: med.prescribedBy,
      })),
      summary: {
        totalAppointments: appointments.length,
        totalLabReports: labReports.length,
        totalMedicines: medicines.length,
      },
    };
  }
}
