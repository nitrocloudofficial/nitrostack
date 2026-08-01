import { PromptDecorator as Prompt, ExecutionContext, z } from '@nitrostack/core';

export class DecisionTwinPrompts {
  @Prompt({
    name: 'investigate_anomaly',
    description: 'Decompose machine sensor anomaly into investigation sub-goals and evidence requests.',
    arguments: [
      { name: 'machineId', description: 'Machine ID experiencing anomaly (e.g. M-004)', required: true },
      { name: 'anomalyType', description: 'Type of anomaly detected (e.g. high_vibration, thermal_spike)', required: false }
    ]
  })
  async investigateAnomaly(input: { machineId: string; anomalyType?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating investigate_anomaly prompt', { machineId: input.machineId });
    return {
      messages: [
        {
          role: 'system',
          content: 'You are the Planner Agent in Decision Twin. Decompose the operational event into concrete investigation steps using available MCP tools (get_sensor_data, check_machine_health, check_inventory, estimate_downtime_cost, calculate_risk).'
        },
        {
          role: 'user',
          content: `Investigate sensor anomaly for machine ${input.machineId} (type: ${input.anomalyType || 'unspecified'}). Gather telemetry, check machine health score, evaluate spare parts availability, project downtime cost, calculate risk, and generate a work order if required.`
        }
      ]
    };
  }
}
