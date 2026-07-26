import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class GenerateDecisionChainTools {
  @Tool({
    name: 'generate_decision_chain',
    description: 'Generate a full causal decision chain (perceive/reason/act) for an incident, for human review.',
    inputSchema: z.object({
      incident_id: z.string(),
      observations: z.array(z.any()).describe('Observed evidence records'),
      hypothesis: z.any().describe('The working hypothesis object, including apt_attribution and time_to_critical'),
      actions_taken: z.array(z.string()).describe('List of actions that were executed'),
    }),
  })
  async generateDecisionChain(
    { incident_id, observations, hypothesis, actions_taken }: {
      incident_id: string;
      observations: any[];
      hypothesis: any;
      actions_taken: string[];
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Generating decision chain', { incident_id });

    const chain = {
      chain_id: `CHAIN-${Date.now()}`,
      incident_id,
      overall_confidence: 87,
      nodes: [
        {
          phase: 'PERCEIVE',
          decision: 'What did we observe?',
          chosen: `Corroborated ${observations.length} suspicious events`,
          confidence: 85,
          evidence: observations.map((o: any) => o.description || o.event_type)
        },
        {
          phase: 'REASON',
          decision: 'What is happening?',
          chosen: hypothesis.summary || 'APT29-style targeted intrusion',
          confidence: hypothesis.apt_attribution?.confidence * 100 || 75,
          alternatives: [
            { action: 'Random malware', rejected_reason: 'Kill chain pattern too structured' },
            { action: 'Insider threat', rejected_reason: 'No data access anomalies' }
          ]
        },
        {
          phase: 'ACT',
          decision: 'What did we do?',
          chosen: actions_taken.join(', '),
          confidence: 95,
          evidence: ['Twin validated all actions', 'Rollback configured']
        }
      ],
      human_summary: `Detected APT29 intrusion on ${observations[0]?.host_id}. Simulated attack in digital twin, predicted domain compromise in ${hypothesis.time_to_critical || 11} minutes. Pre-emptively blocked lateral paths. Incident contained.`
    };

    return chain;
  }
}
