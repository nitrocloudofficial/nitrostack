import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class MaintenancePrompts {
  @Prompt({
    name: 'maintenance_diagnostics_prompt',
    description: 'Specialist AI Prompt for diagnosing machine failures, evaluating health telemetry, and scheduling repairs.',
    arguments: [
      { name: 'machineId', description: 'ID of target equipment', required: true },
      { name: 'symptoms', description: 'Observed anomaly or telemetry error code', required: false }
    ]
  })
  async maintenancePrompt(input: { machineId: string; symptoms?: string }, _ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are the Maintenance Specialist AI Agent for FactoryOS.
Your responsibilities:
1. Diagnose machine failures using telemetry and health checks.
2. Predict component failure probabilities.
3. Assign technicians and calculate downtime financial business impact.`
        },
        {
          role: 'user',
          content: `Check health and diagnose machine ${input.machineId}. Symptoms: ${input.symptoms || 'Routine check'}`
        }
      ]
    };
  }
}
