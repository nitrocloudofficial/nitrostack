import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { getSecureDataGateway } from '../../gateway/container.js';
import { Action, ResourceType, Role, RouteTarget } from '../../types/gateway.types.js';

/**
 * GatewayTools — MCP surface for the Secure Data Gateway architecture.
 *
 * These tools are additive: they sit alongside the existing Health,
 * Medication, and Emergency agents (unchanged) and demonstrate calling
 * the same underlying clinical logic through the new authenticated,
 * authorized, audited, encrypted-at-rest pipeline described in
 * src/gateway/SecureDataGateway.ts.
 *
 * Callers authenticate with a JWT issued by `secure_issue_session_token`
 * (a stand-in for a real login flow) and pass it as `session_token` on
 * every subsequent secure_* call.
 */
export class GatewayTools {
  @Tool({
    name: 'secure_issue_session_token',
    description:
      'Issues a JWT session token for the Secure Data Gateway. In production this would sit behind a real login/OAuth flow — provided here so the gateway tools below are callable end-to-end.',
    inputSchema: z.object({
      user_id: z.string().describe('Caller identifier (e.g. "doctor-emma", "caregiver-sri")'),
      role: z.enum(['patient', 'doctor', 'caregiver', 'pharmacist', 'administrator']),
      patient_ids: z.array(z.string()).optional().describe('Patient IDs this identity is scoped to, e.g. ["P001"]')
    })
  })
  async issueSessionToken(input: { user_id: string; role: string; patient_ids?: string[] }, ctx: ExecutionContext) {
    // Token issuance itself goes through AuthenticationService directly
    // (there is no "identity" yet to authenticate against the gateway
    // pipeline with) — this is the one legitimate bypass, scoped to login,
    // and mirrors how a real /login endpoint would sit in front of the
    // gateway rather than behind it.
    const { createAuthenticationServiceFromEnv } = await import('../../services/AuthenticationService.js');
    const auth = createAuthenticationServiceFromEnv(process.env);
    const role = input.role as Role;
    const token = await auth.issueJwt(input.user_id, role, input.patient_ids);
    ctx.logger.info('Issued gateway session token', { user_id: input.user_id, role: input.role });
    return { session_token: token, expires_in_seconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600) };
  }

  @Tool({
    name: 'secure_check_drug_safety',
    description:
      'Runs pharmacogenomics + drug-interaction analysis through the full Secure Data Gateway pipeline (auth, RBAC, rate limiting, data-minimized AI Gateway routing, audit logging). Requires a session_token from secure_issue_session_token.',
    inputSchema: z.object({
      session_token: z.string().describe('JWT from secure_issue_session_token'),
      patient_id: z.string().describe('Patient ID, e.g. P001'),
      prescription: z.string().describe('Medication name to check'),
      diagnosis: z.string().optional()
    })
  })
  async secureCheckDrugSafety(
    input: { session_token: string; patient_id: string; prescription: string; diagnosis?: string },
    ctx: ExecutionContext
  ) {
    const gateway = getSecureDataGateway();

    // Fetch the minimal pharmacogenomics context needed for this check.
    // (Reuses the existing read-only resource loader — this demo does not
    // migrate the sample family dataset into the encrypted store.)
    const { loadJSON } = await import('../../shared/resource-loader.js');
    const patientDB = loadJSON<import('../../shared/shared.types.js').PatientDB>(
      'patient_profile.json',
      'patient profiles'
    );
    const pgxDB = loadJSON<import('../../shared/shared.types.js').PharmacogenomicsDB>(
      'pharmacogenomics_db.json',
      'pharmacogenomics database'
    );

    const patient = patientDB.patients.find(p => p.patient_id === input.patient_id);
    if (!patient) {
      throw new Error(`Patient "${input.patient_id}" not found.`);
    }

    const drugLower = input.prescription.toLowerCase();
    const geneConflicts = patient.genetic_markers.flatMap(marker => {
      const variant = pgxDB.markers[marker.gene]?.variants[marker.variant];
      return (variant?.conflicts ?? [])
        .filter(c => c.drug.toLowerCase() === drugLower)
        .map(c => ({
          drug: c.drug,
          severity: c.severity,
          risk: c.risk,
          recommendation: c.recommendation,
          fdaBoxedWarning: c.fda_boxed_warning
        }));
    });

    ctx.logger.info('Routing secure_check_drug_safety through Secure Data Gateway', {
      patient_id: input.patient_id
    });

    const response = await gateway.handle({
      credential: { type: 'jwt', value: input.session_token },
      target: RouteTarget.AI_GATEWAY,
      resource: ResourceType.MEDICATION,
      action: Action.READ,
      patientId: input.patient_id,
      payload: {
        task: 'medicine-analysis',
        context: {
          patientRecord: {
            name: patient.name, // stripped by AIGateway before reaching MedicineAI
            diagnosis: input.diagnosis,
            geneConflicts,
            activeMedications: patient.active_medications.map(m => m.name),
            allergies: patient.allergies.map(a => ({ substance: a.substance }))
          },
          prescription: input.prescription,
          knownInteractions: []
        }
      }
    });

    if (!response.success) {
      throw new Error(`${response.error?.code}: ${response.error?.message}`);
    }
    return response.data;
  }
}
