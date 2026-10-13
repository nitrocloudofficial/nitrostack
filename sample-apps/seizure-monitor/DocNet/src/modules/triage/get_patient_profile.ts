/**
 * Get Patient Profile MCP Tool
 *
 * Purpose: Retrieves long-term patient data (age, allergies, medical history) at the beginning
 * of a session or on-demand to hydrate the LLM with persistent context.
 *
 * Security:
 * - Patient ID resolved from ExecutionContext (never from user input)
 * - Graceful fallback if no profile exists
 * - Returns structured JSON for LLM consumption
 *
 * Architecture:
 * 1. Resolve patient_id from ExecutionContext
 * 2. Query patient_profiles table
 * 3. Return structured JSON or graceful "no history" message
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

// ============================================================================
// ZOD SCHEMA
// ============================================================================

const GetPatientProfileSchema = z.object({
  include_full_history: z.boolean().optional()
    .describe('If true, include full medical history. If false, return only essential fields (age, allergies).'),
});

type GetPatientProfileInput = z.infer<typeof GetPatientProfileSchema>;

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
// MCP TOOL: GET PATIENT PROFILE
// ============================================================================

/**
 * GetPatientProfileTool
 *
 * Purpose:
 *   Retrieves long-term patient data (age, allergies, medical history) to hydrate
 *   the LLM with persistent context. Called at session start or on-demand.
 *
 * Security:
 *   - Extracts patient_id from ExecutionContext metadata (never from user input).
 *   - Prevents LLM from querying arbitrary patient records.
 *
 * Error Handling:
 *   - Graceful fallback if no profile exists: "No prior medical history on file. Proceed with standard baseline questions."
 *   - Returns explicit error strings (not exceptions) so the LLM can handle missing data.
 *
 * Returns:
 *   - On success: JSON string with patient profile data
 *   - On no history: "No prior medical history on file. Proceed with standard baseline questions."
 *   - On error: "Error: [Human-readable error message]"
 */
export class GetPatientProfileTool {
  @Tool({
    name: 'get_patient_profile',
    description:
      'Retrieves long-term patient data (age, allergies, medical history) to hydrate the LLM with persistent context. ' +
      'Patient ID is resolved from ExecutionContext (never from user input). ' +
      'Returns structured JSON or graceful "no history" message if no profile exists.',
    inputSchema: GetPatientProfileSchema,
  })
  async getPatientProfile(
    input: GetPatientProfileInput,
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

      ctx.logger.info('[get_patient_profile] Processing request', {
        patient_id,
        session_id,
        include_full_history: input.include_full_history ?? false,
      });

      // ============================================================
      // VALIDATION: Zod will catch invalid input
      // ============================================================
      const validated = GetPatientProfileSchema.safeParse(input);
      if (!validated.success) {
        const errorMessages = validated.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        ctx.logger.warn('[get_patient_profile] Validation failed', { errors: errorMessages });
        return `Error: Invalid request. ${errorMessages}. Please retry.`;
      }

      // ============================================================
      // DATABASE: Query patient_profiles table
      // In production, this would use Supabase.
      // For demo, we use the mock database.
      // ============================================================
      let profile: PatientProfile | undefined;

      try {
        // Production: Use Supabase query
        // const { data, error } = await supabase
        //   .from('patient_profiles')
        //   .select('*')
        //   .eq('patient_id', patient_id)
        //   .single();
        //
        // if (error && error.code !== 'PGRST116') {
        //   // PGRST116 = no rows found (expected for new patients)
        //   ctx.logger.error('[get_patient_profile] Supabase query failed', { error: error.message });
        //   return `Error: Failed to retrieve profile data. Details: ${error.message}. Please retry or contact support.`;
        // }
        //
        // profile = data;

        // Demo: Use mock database
        profile = mockPatientProfiles[patient_id];

        ctx.logger.info('[get_patient_profile] Profile query completed', {
          patient_id,
          found: !!profile,
        });
      } catch (dbError) {
        const errorMsg = dbError instanceof Error ? dbError.message : 'Unknown error';
        ctx.logger.error('[get_patient_profile] Database error', { error: errorMsg });
        return `Error: Failed to retrieve profile data. Details: ${errorMsg}. Please retry or contact support.`;
      }

      // ============================================================
      // GRACEFUL FALLBACK: No profile exists
      // ============================================================
      if (!profile) {
        ctx.logger.info('[get_patient_profile] No profile found (new patient)', {
          patient_id,
          session_id,
        });
        return 'No prior medical history on file. Proceed with standard baseline questions.';
      }

      // ============================================================
      // RESPONSE: Format profile data for LLM
      // ============================================================
      const includeFullHistory = input.include_full_history ?? false;

      let responseData: Record<string, unknown>;

      if (includeFullHistory) {
        // Full history: all fields
        responseData = {
          patient_id: profile.patient_id,
          age: profile.age,
          chronic_conditions: profile.chronic_conditions || [],
          allergies: profile.allergies || [],
          past_surgeries: profile.past_surgeries || [],
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
      } else {
        // Essential fields only: age and allergies
        responseData = {
          patient_id: profile.patient_id,
          age: profile.age,
          allergies: profile.allergies || [],
        };
      }

      const responseJson = JSON.stringify(responseData);

      // ============================================================
      // AUDIT LOGGING
      // ============================================================
      ctx.logger.info('[get_patient_profile] Profile retrieved successfully', {
        patient_id,
        session_id,
        include_full_history: includeFullHistory,
        fields_returned: Object.keys(responseData),
      });

      // ============================================================
      // RETURN SUCCESS
      // ============================================================
      return responseJson;
    } catch (err) {
      // ============================================================
      // CATCH-ALL: Unexpected errors are logged but not thrown
      // Return a generic error message so the LLM can retry.
      // ============================================================
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      ctx.logger.error('[get_patient_profile] Unexpected error', {
        error: errorMessage,
      });
      return `Error: An unexpected error occurred while retrieving profile. Please try again or contact support.`;
    }
  }
}
