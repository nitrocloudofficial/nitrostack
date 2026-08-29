import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { Role } from '../../auth/auth.types.js';
import { AuthService } from '../../auth/auth.service.js';
import { MOCK_PATIENTS, Patient } from '../../fixtures/patients.js';
import { assignNominee, getNominee } from '../../fixtures/nominees.js';
import { verifyNomineeBloodGroupMock } from '../../fixtures/users.js';

/**
 * Nominee assignment and verification tools
 * Only senior citizens can assign nominees
 */

const assignNomineeSchema = z.object({
  patientId: z.string().describe('Patient ID (must be senior citizen)'),
  nomineeAadharId: z.string().describe('Nominee Aadhaar ID'),
  relationship: z.string().describe('Relationship to patient (e.g., son, daughter, spouse)'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

const verifyNomineeBloodGroupSchema = z.object({
  nomineeAadharId: z.string().describe('Nominee Aadhaar ID'),
  declaredBloodGroup: z.string().describe('Blood group declared by nominee (e.g., O+, A-, AB+)'),
});

@Injectable({ deps: [AuthService] })
export class NomineeTools {
  constructor(private authService: AuthService) {}

  @Tool({
    name: 'assignNominee',
    description:
      'Assign a nominee for a senior citizen patient. Only senior citizens can assign nominees. Nominee must pass blood group verification.',
    inputSchema: assignNomineeSchema,
  })
  async assignNominee(input: z.infer<typeof assignNomineeSchema>, ctx: ExecutionContext) {
    const { patientId, nomineeAadharId, relationship, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Check role: only patient can assign nominee
    if (session.role !== Role.PATIENT) {
      return {
        success: false,
        error: `Access denied: only patients can assign nominees. Your role: ${session.role}`,
      };
    }

    // Check if patient is accessing their own record
    if (session.patientId !== patientId) {
      return {
        success: false,
        error: 'Access denied: you can only assign a nominee for your own record.',
      };
    }

    // Check if patient is senior citizen
    const patient = MOCK_PATIENTS[patientId];
    if (!patient || !patient.isSeniorCitizen) {
      return {
        success: false,
        error: 'Only senior citizens can assign nominees.',
      };
    }

    // Nominee must be verified before assignment
    // For now, store unverified; verification happens separately
    assignNominee(patientId, {
      nomineeAadharId,
      relationship,
      verified: false,
      bloodGroup: '', // Will be populated after verification
    });

    ctx.logger.info(`Nominee assigned for patient ${patientId}: ${nomineeAadharId} (${relationship})`);

    return {
      success: true,
      message: `Nominee ${nomineeAadharId} assigned as ${relationship}. Verification required before access is granted.`,
      nomineeAadharId,
      relationship,
      verified: false,
    };
  }

  @Tool({
    name: 'verifyNomineeBloodGroup',
    description:
      'Verify nominee blood group against Aadhaar records. Returns match/mismatch. Nominee access is only granted after successful verification.',
    inputSchema: verifyNomineeBloodGroupSchema,
  })
  async verifyNomineeBloodGroup(
    input: z.infer<typeof verifyNomineeBloodGroupSchema>,
    ctx: ExecutionContext
  ) {
    const { nomineeAadharId, declaredBloodGroup } = input;

    // Verify against mock Aadhaar lookup
    const isVerified = verifyNomineeBloodGroupMock(nomineeAadharId, declaredBloodGroup);

    if (isVerified) {
      ctx.logger.info(`Nominee ${nomineeAadharId} verified: blood group matches`);
      return {
        success: true,
        verified: true,
        message: 'Blood group verification successful. Nominee access is now granted.',
        nomineeAadharId,
        bloodGroup: declaredBloodGroup,
      };
    } else {
      ctx.logger.warn(`Nominee ${nomineeAadharId} verification failed: blood group mismatch`);
      return {
        success: false,
        verified: false,
        error: 'Blood group verification failed. Declared blood group does not match Aadhaar records.',
        nomineeAadharId,
      };
    }
  }
}
