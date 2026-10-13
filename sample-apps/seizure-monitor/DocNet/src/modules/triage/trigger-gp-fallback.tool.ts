import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

/**
 * Input Schema for trigger_gp_fallback
 * Minimal schema: only requires a reason string for audit/logging.
 * This is the deterministic escape hatch—no complex validation needed.
 */
const TriggerGpFallbackInputSchema = z.object({
  reason_for_fallback: z
    .string()
    .min(5)
    .max(200)
    .describe(
      'Reason for routing to GP (e.g., "3-turn limit reached", "low confidence in specialist match", "specialist unavailable")',
    ),
});

/**
 * Mock Supabase Default GP
 * In production, this would be fetched from a config or database.
 */
const DEFAULT_GP = {
  id: 'gp_default_001',
  name: 'Dr. Michael O\'Brien',
  specialty: 'general_practice',
  contact_email: 'michael.obrien@directtriage.local',
  queue_position: 3,
  estimated_wait_minutes: 45,
};

/**
 * trigger_gp_fallback Tool
 *
 * Purpose:
 *   The ultimate "fail-closed" deterministic escape hatch.
 *   Bypasses specialist matching entirely and routes the patient to the default GP queue.
 *   Called when:
 *     - LLM reaches the 3-turn triage limit
 *     - LLM has low confidence in a specialist match
 *     - match_specialist fails or returns an error
 *
 * Security:
 *   - Extracts patient_id from ExecutionContext (never from user input).
 *   - Minimal input validation (only reason string).
 *   - No specialist matching logic—deterministic and fail-closed.
 *
 * Error Handling:
 *   - Catches unexpected errors and returns error strings (not exceptions).
 *   - Always succeeds in routing to GP (no failure path).
 *
 * Returns:
 *   - On success: { status: 'success', gp_name, queue_position, estimated_wait_minutes, booking_id }
 *   - On error: { status: 'error', error: 'Human-readable error message' }
 */
export class TriggerGpFallbackTool {
  @Tool({
    name: 'trigger_gp_fallback',
    description:
      'Routes the patient to the default General Practitioner queue. ' +
      'This is the fail-closed escape hatch when specialist matching fails or confidence is low. ' +
      'Bypasses all specialist logic and guarantees a GP booking.',
    inputSchema: TriggerGpFallbackInputSchema,
  })
  async triggerGpFallback(
    input: z.infer<typeof TriggerGpFallbackInputSchema>,
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

      ctx.logger.info('[trigger_gp_fallback] Processing fallback request', {
        patient_id,
        session_id,
        reason: input.reason_for_fallback,
      });

      // ============================================================
      // VALIDATION: Minimal validation on reason string
      // ============================================================
      const validated = TriggerGpFallbackInputSchema.safeParse(input);
      if (!validated.success) {
        const errorMessages = validated.error.errors
          .map((e) => e.message)
          .join('; ');
        ctx.logger.warn('[trigger_gp_fallback] Validation failed', { errors: errorMessages });
        return {
          status: 'error',
          error: `Error: ${errorMessages}. Please provide a valid reason for fallback.`,
        };
      }

      const { reason_for_fallback } = validated.data;

      // ============================================================
      // LOGIC: Deterministic routing to default GP
      // No specialist matching, no complex logic—just route to GP.
      // In production, this would:
      //   1. Insert a record into the patient_routing table
      //   2. Set routed_to = 'gp', gp_id = DEFAULT_GP.id
      //   3. Log the fallback_reason for audit
      //   4. Trigger a booking confirmation email to the patient
      // ============================================================
      const booking_id = `gp_booking_${patient_id}_${Date.now()}`;

      ctx.logger.info('[trigger_gp_fallback] Routing to GP', {
        patient_id,
        gp_id: DEFAULT_GP.id,
        gp_name: DEFAULT_GP.name,
        fallback_reason: reason_for_fallback,
        booking_id,
      });

      // ============================================================
      // RETURN: Success payload for GP booking widget
      // ============================================================
      return {
        status: 'success',
        gp_name: DEFAULT_GP.name,
        gp_specialty: DEFAULT_GP.specialty,
        queue_position: DEFAULT_GP.queue_position,
        estimated_wait_minutes: DEFAULT_GP.estimated_wait_minutes,
        booking_id,
        fallback_reason: reason_for_fallback,
        message: `Patient ${patient_id} successfully routed to ${DEFAULT_GP.name}. Queue position: ${DEFAULT_GP.queue_position}. Estimated wait: ${DEFAULT_GP.estimated_wait_minutes} minutes.`,
      };
    } catch (err) {
      // ============================================================
      // CATCH-ALL: Unexpected errors are logged but not thrown
      // Even in error state, we attempt to return a graceful message.
      // ============================================================
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      ctx.logger.error('[trigger_gp_fallback] Unexpected error', {
        error: errorMessage,
      });
      return {
        status: 'error',
        error: `Error: An unexpected error occurred during GP fallback routing. Please contact support.`,
      };
    }
  }
}
