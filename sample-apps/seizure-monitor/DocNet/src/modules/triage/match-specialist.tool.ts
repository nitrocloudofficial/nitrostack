import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

/**
 * Specialty Catalog (Enum-Validated)
 * Prevents LLM hallucination of fake medical specialties.
 * In production, this would be fetched from Supabase or a config service.
 */
const VALID_SPECIALTIES = [
  'cardiology',
  'neurology',
  'orthopedics',
  'dermatology',
  'gastroenterology',
  'pulmonology',
  'rheumatology',
  'endocrinology',
  'psychiatry',
  'general_practice',
] as const;

/**
 * Urgency Level Enum
 * Constrains the LLM to valid triage urgency levels.
 */
const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

/**
 * Input Schema for match_specialist
 * Strict Zod validation ensures the LLM cannot pass invalid specialties or urgency levels.
 */
const MatchSpecialistInputSchema = z.object({
  specialty: z.enum(VALID_SPECIALTIES, {
    errorMap: () => ({
      message: `Invalid specialty. Must be one of: ${VALID_SPECIALTIES.join(', ')}`,
    }),
  }),
  urgency_level: z.enum(URGENCY_LEVELS, {
    errorMap: () => ({
      message: `Invalid urgency level. Must be one of: ${URGENCY_LEVELS.join(', ')}`,
    }),
  }),
  clinical_summary: z.string().min(10).max(500).optional(),
});

/**
 * Mock Supabase Doctors Catalog
 * In production, this would be a real Supabase query.
 * Structure: { id, name, specialty, available_slots, contact_email }
 */
const MOCK_DOCTORS_CATALOG = [
  {
    id: 'doc_001',
    name: 'Dr. Sarah Chen',
    specialty: 'cardiology',
    available_slots: ['2025-08-05T10:00Z', '2025-08-05T14:00Z'],
    contact_email: 'sarah.chen@directtriage.local',
  },
  {
    id: 'doc_002',
    name: 'Dr. James Mitchell',
    specialty: 'neurology',
    available_slots: ['2025-08-05T11:00Z', '2025-08-05T15:30Z'],
    contact_email: 'james.mitchell@directtriage.local',
  },
  {
    id: 'doc_003',
    name: 'Dr. Priya Patel',
    specialty: 'orthopedics',
    available_slots: ['2025-08-05T09:00Z', '2025-08-05T13:00Z'],
    contact_email: 'priya.patel@directtriage.local',
  },
  {
    id: 'doc_004',
    name: 'Dr. Michael O\'Brien',
    specialty: 'general_practice',
    available_slots: ['2025-08-05T10:30Z', '2025-08-05T16:00Z'],
    contact_email: 'michael.obrien@directtriage.local',
  },
];

/**
 * match_specialist Tool
 *
 * Purpose:
 *   Matches a synthesized clinical summary to an available specialist in the catalog.
 *   Acts as an anti-hallucination shield by strictly validating specialty and urgency.
 *
 * Security:
 *   - Extracts patient_id from ExecutionContext metadata (never from user input).
 *   - Prevents LLM from injecting arbitrary patient IDs.
 *
 * Error Handling:
 *   - Catches validation and logic errors.
 *   - Returns explicit error strings (not exceptions) so the LLM can self-correct.
 *   - If specialty is invalid, instructs LLM to call trigger_gp_fallback.
 *
 * Returns:
 *   - On success: { status: 'success', doctor_name, specialty, time_slot, booking_id }
 *   - On error: { status: 'error', error: 'Human-readable error message' }
 */
export class MatchSpecialistTool {
  @Tool({
    name: 'match_specialist',
    description:
      'Matches the patient clinical summary to an available specialist. ' +
      'Validates specialty against a strict catalog to prevent hallucination. ' +
      'Returns doctor details and booking slot, or a self-correcting error message.',
    inputSchema: MatchSpecialistInputSchema,
  })
  async matchSpecialist(
    input: z.infer<typeof MatchSpecialistInputSchema>,
    ctx: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    try {
      // ============================================================
      // SECURITY: Extract identity from ExecutionContext
      // The LLM never supplies patient_id directly; it is resolved
      // from the authenticated session/metadata.
      // ============================================================
      const patient_id = ctx.metadata?.patient_id || ctx.metadata?.user_id || 'patient_unknown';
      const session_id = ctx.metadata?.session_id || 'session_unknown';

      ctx.logger.info('[match_specialist] Processing request', {
        patient_id,
        session_id,
        specialty: input.specialty,
        urgency_level: input.urgency_level,
      });

      // ============================================================
      // VALIDATION: Zod will catch invalid specialty/urgency
      // If validation fails, we catch it and return a self-correcting error.
      // ============================================================
      const validated = MatchSpecialistInputSchema.safeParse(input);
      if (!validated.success) {
        const errorMessages = validated.error.errors
          .map((e) => e.message)
          .join('; ');
        ctx.logger.warn('[match_specialist] Validation failed', { errors: errorMessages });
        return {
          status: 'error',
          error: `Error: ${errorMessages}. If the specialty is not available, please call trigger_gp_fallback.`,
        };
      }

      const { specialty, urgency_level } = validated.data;

      // ============================================================
      // LOGIC: Query mock Supabase doctors catalog
      // Filter by specialty and check availability.
      // ============================================================
      const availableDoctors = MOCK_DOCTORS_CATALOG.filter(
        (doc) => doc.specialty === specialty && doc.available_slots.length > 0,
      );

      if (availableDoctors.length === 0) {
        ctx.logger.warn('[match_specialist] No available doctors', { specialty });
        return {
          status: 'error',
          error: `Error: No available specialists in ${specialty} at this time. Please call trigger_gp_fallback to route to a General Practitioner.`,
        };
      }

      // ============================================================
      // SELECTION: Pick the first available doctor and slot
      // In production, this could use urgency_level to prioritize.
      // ============================================================
      const selectedDoctor = availableDoctors[0];
      const selectedSlot = selectedDoctor.available_slots[0];

      // Generate a deterministic booking ID (in production, this would be a DB insert)
      const booking_id = `booking_${patient_id}_${Date.now()}`;

      // ============================================================
      // LOG & RETURN: Success payload for widget rendering
      // ============================================================
      ctx.logger.info('[match_specialist] Match successful', {
        patient_id,
        doctor_name: selectedDoctor.name,
        specialty,
        time_slot: selectedSlot,
        booking_id,
      });

      return {
        status: 'success',
        doctor_name: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        time_slot: selectedSlot,
        booking_id,
      };
    } catch (err) {
      // ============================================================
      // CATCH-ALL: Unexpected errors are logged but not thrown
      // Return a generic error message so the LLM can retry or fallback.
      // ============================================================
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      ctx.logger.error('[match_specialist] Unexpected error', {
        error: errorMessage,
      });
      return {
        status: 'error',
        error: `Error: An unexpected error occurred. Please try again or call trigger_gp_fallback.`,
      };
    }
  }
}
