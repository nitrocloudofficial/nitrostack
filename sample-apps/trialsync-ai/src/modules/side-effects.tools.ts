import { Module, ToolDecorator as Tool, z } from '@nitrostack/core';

@Module({
  name: 'SideEffectsModule',
})
export class SideEffectsTools {
  @Tool({
    name: 'log_side_effects',
    description: 'Logs and evaluates adverse events or side effects reported by a patient',
    inputSchema: z.object({
      patientId: z.string(),
      symptom: z.string(),
      severity: z.enum(['Mild', 'Moderate', 'Severe']),
    }),
  })
  async logSideEffects(input: { patientId: string; symptom: string; severity: string }) {
    return {
      status: 'Logged',
      patientId: input.patientId,
      symptom: input.symptom,
      severity: input.severity,
      actionRequired: input.severity === 'Severe' ? 'Immediate Physician Review' : 'Monitor at next visit',
    };
  }
}