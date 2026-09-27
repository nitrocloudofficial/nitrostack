import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { DebateService } from './debate.service.js';
import { BaseDepartmentOutputSchema, ConcernSchema } from '../shared/types.js';

export class DebateTools {
  private debateService: DebateService;

  constructor(debateService?: DebateService) {
    this.debateService = debateService ?? new DebateService();
  }

  @Tool({
    name: 'reconcile_estimates',
    description: 'Synchronizes Engineering authoritative effort sizing into Product provisional opportunity cost estimate.',
    inputSchema: z.object({
      productOutput: BaseDepartmentOutputSchema,
      engineeringOutput: BaseDepartmentOutputSchema
    })
  })
  async reconcile(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Running estimate reconciliation pass');
    const result = this.debateService.reconcileEstimates(input.productOutput, input.engineeringOutput);
    return result;
  }

  @Tool({
    name: 'run_challenge_exchange',
    description: 'Execute a structured challenge round exchange where one agent responds to another agent concern.',
    inputSchema: z.object({
      respondingAgent: z.enum(['product', 'engineering', 'security', 'legal']),
      targetConcern: ConcernSchema,
      proposalText: z.string()
    })
  })
  async challenge(input: any, ctx: ExecutionContext) {
    return this.debateService.executeChallengeExchange(
      input.respondingAgent,
      input.targetConcern,
      input.proposalText,
      ctx
    );
  }
}
