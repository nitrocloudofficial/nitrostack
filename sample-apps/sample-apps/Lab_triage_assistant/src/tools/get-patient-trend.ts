/**
 * Get Patient Trend Tool
 *
 * Returns how a patient's test values have changed across visits recorded
 * via run_full_triage. In-memory for this server session — resets on
 * restart, no external database.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { getTrends, getVisitCount } from '../patientHistory.js';

const GetPatientTrendInputSchema = z.object({
  patientId: z.string().describe('Patient identifier used when calling run_full_triage with a patientId')
});

const GetPatientTrendOutputSchema = z.object({
  visitCount: z.number().describe('Number of visits recorded for this patient in this server session'),
  trends: z.array(
    z.object({
      testName: z.string(),
      unit: z.string(),
      values: z.array(z.object({ timestamp: z.string(), value: z.number() })),
      direction: z.enum(['RISING', 'FALLING', 'STABLE', 'INSUFFICIENT_DATA'])
    })
  )
});

export class GetPatientTrendTools {
  @Tool({
    name: 'get_patient_trend',
    description: "Get how a patient's test values have changed across visits recorded via run_full_triage's patientId. In-memory for this server session only.",
    inputSchema: GetPatientTrendInputSchema,
    outputSchema: GetPatientTrendOutputSchema,
    examples: {
      request: { patientId: 'pat_ayesha_123' },
      response: {
        visitCount: 3,
        trends: [
          {
            testName: 'Creatinine',
            unit: 'mg/dL',
            values: [
              { timestamp: '2026-06-01T10:00:00.000Z', value: 1.2 },
              { timestamp: '2026-07-01T10:00:00.000Z', value: 1.4 },
              { timestamp: '2026-07-25T10:00:00.000Z', value: 1.5 }
            ],
            direction: 'RISING'
          }
        ]
      }
    }
  })
  async getPatientTrend(
    input: z.infer<typeof GetPatientTrendInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof GetPatientTrendOutputSchema>> {
    const trends = getTrends(input.patientId);
    const visitCount = getVisitCount(input.patientId);

    ctx.logger.info(`Retrieved trend data for patient ${input.patientId}: ${visitCount} visit(s), ${trends.length} test(s) tracked`);

    return { visitCount, trends };
  }
}
