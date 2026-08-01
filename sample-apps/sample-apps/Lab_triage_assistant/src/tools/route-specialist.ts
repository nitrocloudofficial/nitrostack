/**
 * Route Specialist Tool
 *
 * Maps abnormal (BORDERLINE/CRITICAL) lab panels to the appropriate
 * specialist and urgency level.
 * Input: flagged results from flag_critical
 * Output: specialist routing recommendations
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

/**
 * Panel -> specialist mapping
 */
export const SPECIALIST_BY_PANEL: Record<string, string> = {
  CBC: 'Hematologist',
  KFT: 'Nephrologist',
  LFT: 'Hepatologist',
  Lipid: 'Cardiologist',
  Glucose: 'Endocrinologist',
  Thyroid: 'Endocrinologist'
};

export type Urgency = 'SEE TODAY' | 'ROUTINE FOLLOW-UP';

const URGENCY_RANK: Record<Urgency, number> = {
  'ROUTINE FOLLOW-UP': 1,
  'SEE TODAY': 2
};

export interface Routing {
  specialist: string;
  urgency: Urgency;
  reason: string;
}

/**
 * Input schema: flagged tests from flag_critical
 */
const FlaggedTestSchema = z.object({
  testName: z.string(),
  value: z.number(),
  unit: z.string(),
  status: z.enum(['NORMAL', 'BORDERLINE', 'CRITICAL']),
  panel: z.string(),
  normalRange: z.object({ min: z.number(), max: z.number() }).optional(),
  criticalRange: z.object({ min: z.number(), max: z.number() }).optional()
});

const RouteSpecialistInputSchema = z.object({
  flagged: z.array(FlaggedTestSchema).describe('Flagged test results from the flag_critical tool')
});

/**
 * Output schema
 */
const RouteSpecialistOutputSchema = z.object({
  routing: z.array(
    z.object({
      specialist: z.string(),
      urgency: z.enum(['SEE TODAY', 'ROUTINE FOLLOW-UP']),
      reason: z.string()
    })
  )
});

/**
 * Group abnormal tests by specialist, keeping the worst urgency
 * and combining reasons for tests that route to the same specialist.
 */
function routeSpecialists(flagged: z.infer<typeof FlaggedTestSchema>[]): Routing[] {
  const bySpecialist = new Map<string, { urgency: Urgency; reasons: string[] }>();

  for (const test of flagged) {
    if (test.status === 'NORMAL') continue;

    const specialist = SPECIALIST_BY_PANEL[test.panel];
    if (!specialist) continue;

    const urgency: Urgency = test.status === 'CRITICAL' ? 'SEE TODAY' : 'ROUTINE FOLLOW-UP';
    const reasonPart = `${test.testName} is ${test.status.toLowerCase()} (${test.value} ${test.unit})`;

    const existing = bySpecialist.get(specialist);
    if (!existing) {
      bySpecialist.set(specialist, { urgency, reasons: [reasonPart] });
    } else {
      existing.reasons.push(reasonPart);
      if (URGENCY_RANK[urgency] > URGENCY_RANK[existing.urgency]) {
        existing.urgency = urgency;
      }
    }
  }

  return Array.from(bySpecialist.entries()).map(([specialist, { urgency, reasons }]) => ({
    specialist,
    urgency,
    reason: reasons.join('; ')
  }));
}

/**
 * Route Specialist Tool
 *
 * Maps each abnormal panel to a specialist and urgency
 * (SEE TODAY for CRITICAL, ROUTINE FOLLOW-UP for BORDERLINE).
 */
export class RouteSpecialistTools {
  @Tool({
    name: 'route_specialist',
    description: 'Map abnormal (BORDERLINE/CRITICAL) lab panels to the appropriate specialist and urgency. Takes the flagged output from flag_critical.',
    inputSchema: RouteSpecialistInputSchema,
    outputSchema: RouteSpecialistOutputSchema,
    examples: {
      request: {
        flagged: [
          { testName: 'Creatinine', value: 1.5, unit: 'mg/dL', status: 'BORDERLINE', panel: 'KFT' },
          { testName: 'FastingGlucose', value: 250, unit: 'mg/dL', status: 'CRITICAL', panel: 'Glucose' }
        ]
      },
      response: {
        routing: [
          { specialist: 'Nephrologist', urgency: 'ROUTINE FOLLOW-UP', reason: 'Creatinine is borderline (1.5 mg/dL)' },
          { specialist: 'Endocrinologist', urgency: 'SEE TODAY', reason: 'FastingGlucose is critical (250 mg/dL)' }
        ]
      }
    }
  })
  async routeSpecialist(
    input: z.infer<typeof RouteSpecialistInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof RouteSpecialistOutputSchema>> {
    ctx.logger.info(`Routing ${input.flagged.length} flagged tests to specialists`);

    const routing = routeSpecialists(input.flagged);

    ctx.logger.info(`Routed to ${routing.length} specialist(s)`);

    return { routing };
  }
}
