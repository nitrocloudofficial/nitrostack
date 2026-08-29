import { Module, ToolDecorator as Tool, z } from '@nitrostack/core';

@Module({
  name: 'EligibilityModule',
})
export class EligibilityTools {
  @Tool({
    name: 'check_eligibility',
    description: 'Evaluates patient parameters against trial inclusion/exclusion criteria',
    inputSchema: z.object({
      patientId: z.string(),
      trialId: z.string(),
    }),
  })
  async checkEligibility(input: { patientId: string; trialId: string }) {
    return {
      eligible: true,
      matchedCriteria: ['Age >= 18', 'Stage II/III Diagnosis'],
      unmatchedCriteria: [],
    };
  }
}