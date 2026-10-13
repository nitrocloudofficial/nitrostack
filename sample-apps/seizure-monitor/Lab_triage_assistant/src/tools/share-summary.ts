/**
 * Share Summary Tool
 *
 * Combines flag_critical's flagged results and route_specialist's routing
 * into a single plain-text block formatted for sharing over WhatsApp/SMS —
 * useful in low-resource settings where a patient forwards results to a
 * family member or community health worker rather than using an app.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const FlaggedTestSchema = z.object({
  testName: z.string(),
  value: z.number(),
  unit: z.string(),
  status: z.enum(['NORMAL', 'BORDERLINE', 'CRITICAL']),
  panel: z.string(),
  normalRange: z.object({ min: z.number(), max: z.number() }).optional(),
  criticalRange: z.object({ min: z.number(), max: z.number() }).optional()
});

const RoutingSchema = z.object({
  specialist: z.string(),
  urgency: z.enum(['SEE TODAY', 'ROUTINE FOLLOW-UP']),
  reason: z.string()
});

const ShareSummaryInputSchema = z.object({
  flagged: z.array(FlaggedTestSchema).describe('Flagged test results from the flag_critical tool'),
  overallTriage: z.enum(['NORMAL', 'BORDERLINE', 'CRITICAL']).describe('Overall triage level from flag_critical'),
  routing: z.array(RoutingSchema).default([]).describe('Specialist routing from the route_specialist tool (empty if all results are normal)')
});

const ShareSummaryOutputSchema = z.object({
  summaryText: z.string().describe('Plain-text summary formatted for pasting into WhatsApp, SMS, or similar')
});

/**
 * Share Summary Tool
 *
 * Formats lab triage results as a single plain-text block a patient can
 * copy and send to a family member, community health worker, or clinic.
 */
export class ShareSummaryTools {
  @Tool({
    name: 'share_summary',
    description: 'Format flag_critical and route_specialist results into a single plain-text summary suitable for sharing over WhatsApp or SMS.',
    inputSchema: ShareSummaryInputSchema,
    outputSchema: ShareSummaryOutputSchema,
    examples: {
      request: {
        flagged: [
          { testName: 'Creatinine', value: 1.5, unit: 'mg/dL', status: 'BORDERLINE', panel: 'KFT' },
          { testName: 'FastingGlucose', value: 250, unit: 'mg/dL', status: 'CRITICAL', panel: 'Glucose' }
        ],
        overallTriage: 'CRITICAL',
        routing: [
          { specialist: 'Nephrologist', urgency: 'ROUTINE FOLLOW-UP', reason: 'Creatinine is borderline (1.5 mg/dL)' },
          { specialist: 'Endocrinologist', urgency: 'SEE TODAY', reason: 'FastingGlucose is critical (250 mg/dL)' }
        ]
      },
      response: {
        summaryText: '*Lab Result Summary — CRITICAL*\n\nResults:\n- Creatinine: 1.5 mg/dL (BORDERLINE)\n- FastingGlucose: 250 mg/dL (CRITICAL)\n\nRecommended follow-up:\n- Nephrologist — *ROUTINE FOLLOW-UP* (Creatinine is borderline (1.5 mg/dL))\n- Endocrinologist — *SEE TODAY* (FastingGlucose is critical (250 mg/dL))\n\nThis is not a diagnosis. Please discuss these results with a doctor.'
      }
    }
  })
  async shareSummary(
    input: z.infer<typeof ShareSummaryInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof ShareSummaryOutputSchema>> {
    ctx.logger.info(`Building share summary for overallTriage=${input.overallTriage}`);

    const resultLines = input.flagged
      .map((t) => `- ${t.testName}: ${t.value} ${t.unit} (${t.status})`)
      .join('\n');

    const routingSection = input.routing.length > 0
      ? `\n\nRecommended follow-up:\n${input.routing
          .map((r) => `- ${r.specialist} — *${r.urgency}* (${r.reason})`)
          .join('\n')}`
      : '';

    const summaryText = `*Lab Result Summary — ${input.overallTriage}*\n\nResults:\n${resultLines}${routingSection}\n\nThis is not a diagnosis. Please discuss these results with a doctor.`;

    return { summaryText };
  }
}
