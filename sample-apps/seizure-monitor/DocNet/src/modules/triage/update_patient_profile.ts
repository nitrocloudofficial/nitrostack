/**
 * Update Patient Profile MCP Tool
 *
 * Purpose: Safely extracts and persists long-term patient data (age, allergies, medical history)
 * during triage. Called by the LLM when the patient mentions persistent medical information.
 *
 * Security:
 * - Patient ID resolved from ExecutionContext (never from user input)
 * - Zod validation on all inputs
 * - Graceful error handling with explicit messages for LLM self-correction
 *
 * Architecture:
 * 1. Resolve patient_id from ExecutionContext
 * 2. Validate input via Zod schema
 * 3. UPSERT into patient_profiles table
 * 4. Return success message to LLM
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

// ============================================================================
// ZOD SCHEMA
// ============================================================================

const UpdatePatientProfileSchema = z.object({
  age: z.number().int().min(0).max(150).optional()
    .describe('Patient age in years (0-150)'),
  chronic_conditions: z.array(z.string().min(1).max(100)).optional()
    .describe('List of chronic medical conditions (e.g., ["diabetes", "hypertension"])'),
  allergies: z.array(z.string().min(1).max(100)).optional()
    .describe('List of known allergies (e.g., ["penicillin", "shellfish"])'),
  past_surgeries: z.array(z.string().min(1).max(200)).optional()
    .describe('List of past surgical procedures (e.g., ["appendectomy 2015", "knee arthroscopy 2019"])'),
});

type UpdatePatientProfileInput = z.infer<typeof UpdatePatientProfileSchema>;

// ============================================================================
// MOCK DATABASE (for demo; production uses Supabase)
// ============================================================================

interface PatientProfile {
  patient_id: string;
  age?: number;
  chronic_conditions?: string[];
  allergies?: string[];
  past_surgeries?: string[];
  created_at: string;
  updated_at: string;
}

const mockPatientProfiles: Record<string, PatientProfile> = {
  'patient_001': {
    patient_id: 'patient_001',
    age: 45,
    chronic_conditions: ['Type 2 Diabetes', 'Hypertension'],
    allergies: ['Penicillin'],
    past_surgeries: ['Appendectomy 2015'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
};

// ============================================================================
// MCP TOOL: UPDATE PATIENT PROFILE
// ============================================================================

/**
 * UpdatePatientProfileTool
 *
 * Purpose:
 *   Safely extracts and persists long-term patient data (age, allergies, medical history)
 *   to the patient profile. Called by the LLM when the patient mentions persistent data.
 *
 * Security:
 *   - Extracts patient_id from ExecutionContext metadata (never from user input).
 *   - Prevents LLM from injecting arbitrary patient IDs.
 *
 * Error Handling:
 *   - Catches validation and logic errors.
 *   - Returns explicit error strings (not exceptions) so the LLM can self-correct.
 *
 * Returns:
 *   - On success: "Profile updated successfully."
 *   - On error: "Error: [Human-readable error message]"
 */
export class UpdatePatientProfileTool {
  @Tool({
    name: 'update_patient_profile',
    description:
      'Safely extracts and persists long-term patient data (age, allergies, medical history) to the patient profile. ' +
      'Patient ID is resolved from ExecutionContext (never from user input). ' +
      'Returns success message to LLM.',
    inputSchema: UpdatePatientProfileSchema,
  })
  async updatePatientProfile(
    input: UpdatePatientProfileInput,
    ctx: ExecutionContext,
  ): Promise<string> {
    try {
      // ============================================================
      // SECURITY: Extract identity from ExecutionContext
      // The LLM never supplies patient_id directly; it is resolved
      // from the authenticated session/metadata.
      // ============================================================
      const patient_id = String(ctx.metadata?.patient_id || ctx.metadata?.user_id || 'patient_unknown');
      const session_id = String(ctx.metadata?.session_id || 'session_unknown');

      // Track which fields are being updated
      const updatedFields: string[] = [];
      if (input.age !== undefined) updatedFields.push('age');
      if (input.chronic_conditions !== undefined) updatedFields.push('chronic_conditions');
      if (input.allergies !== undefined) updatedFields.push('allergies');
      if (input.past_surgeries !== undefined) updatedFields.push('past_surgeries');

      ctx.logger.info('[update_patient_profile] Processing request', {
        patient_id: String(patient_id),
        session_id: String(session_id),
        fields: updatedFields as string[],
      });

      // ============================================================
      // VALIDATION: Zod will catch invalid input
      // If validation fails, we catch it and return a self-correcting error.
      // ============================================================
      const validated = UpdatePatientProfileSchema.safeParse(input);
      if (!validated.success) {
        const errorMessages = validated.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        ctx.logger.warn('[update_patient_profile] Validation failed', { errors: errorMessages });
        return `Error: Invalid profile data. ${errorMessages}. Please provide valid values.`;
      }

      // ============================================================
      // BUSINESS LOGIC: Prepare profile update
      // ============================================================
      const now = new Date().toISOString();

      // ============================================================
      // DATABASE: UPSERT into patient_profiles table
      // In production, this would use Supabase.
      // For demo, we use the mock database.
      // ============================================================
      try {
        // Production: Use Supabase UPSERT
        // const { error } = await supabase
        //   .from('patient_profiles')
        //   .upsert({
        //     patient_id,
        //     age: input.age,
        //     chronic_conditions: input.chronic_conditions,
        //     allergies: input.allergies,
        //     past_surgeries: input.past_surgeries,
        //     updated_at: now,
        //   }, { onConflict: 'patient_id' });
        //
        // if (error) {
        //   ctx.logger.error('[update_patient_profile] Supabase UPSERT failed', { error: error.message });
        //   return `Error: Failed to save profile data. Details: ${error.message}. Please retry or contact support.`;
        // }

        // Demo: Use mock database
        const existingProfile = mockPatientProfiles[String(patient_id)];
        const updatedProfile: PatientProfile = {
          patient_id,
          age: input.age !== undefined ? input.age : existingProfile?.age,
          chronic_conditions: input.chronic_conditions !== undefined ? input.chronic_conditions : existingProfile?.chronic_conditions,
          allergies: input.allergies !== undefined ? input.allergies : existingProfile?.allergies,
          past_surgeries: input.past_surgeries !== undefined ? input.past_surgeries : existingProfile?.past_surgeries,
          created_at: existingProfile?.created_at || now,
          updated_at: now,
        };

        mockPatientProfiles[String(patient_id)] = updatedProfile;

        ctx.logger.info('[update_patient_profile] Profile updated in mock database', {
          patient_id: String(patient_id),
          fields: updatedFields as string[],
        });
      } catch (dbError) {
        const errorMsg = dbError instanceof Error ? dbError.message : 'Unknown error';
        ctx.logger.error('[update_patient_profile] Database error', { error: errorMsg });
        return `Error: Failed to save profile data. Details: ${errorMsg}. Please retry or contact support.`;
      }

      // ============================================================
      // AUDIT LOGGING
      // ============================================================
      ctx.logger.info('[update_patient_profile] Profile update successful', {
        patient_id: String(patient_id),
        session_id: String(session_id),
        fields: updatedFields as string[],
        timestamp: String(now),
      });

      // ============================================================
      // RETURN SUCCESS
      // ============================================================
      return 'Profile updated successfully.';
    } catch (err) {
      // ============================================================
      // CATCH-ALL: Unexpected errors are logged but not thrown
      // Return a generic error message so the LLM can retry.
      // ============================================================
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      ctx.logger.error('[update_patient_profile] Unexpected error', {
        error: errorMessage,
      });
      return `Error: An unexpected error occurred while updating profile. Please try again or contact support.`;
    }
  }
}
