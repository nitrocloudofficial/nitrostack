import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { actionHistoryResource } from '../../resources/index.js';

export class ExecutePreemptiveBlockTools {
  @Tool({
    name: 'execute_preemptive_block',
    description: 'Execute a pre-emptive containment action (block domain, isolate host, or revoke credential) validated against a digital twin simulation.',
    inputSchema: z.object({
      action: z.enum(['BLOCK_DOMAIN', 'ISOLATE_HOST', 'REVOKE_CRED']).describe('The containment action to execute'),
      target: z.string().describe('Target of the action (domain, host_id, or credential)'),
      justification: z.string().describe('Why this action is being taken'),
      twin_validation_id: z.string().describe('twin_id or simulation result id that validated this action'),
    }),
    annotations: {
      destructiveHint: true,
    },
  })
  async executePreemptiveBlock(
    { action, target, justification, twin_validation_id }: {
      action: 'BLOCK_DOMAIN' | 'ISOLATE_HOST' | 'REVOKE_CRED';
      target: string;
      justification: string;
      twin_validation_id: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Executing preemptive block', { action, target, twin_validation_id });

    await actionHistoryResource.logAction({
      action_id: `ACT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: action,
      target,
      justification,
      twin_validation_id,
      status: 'EXECUTED'
    });

    return {
      status: 'EXECUTED',
      action,
      target,
      twin_validation_id,
      rollback_window_seconds: 300,
      estimated_impact: action === 'ISOLATE_HOST' ? '1 service affected' : '0 services affected'
    };
  }
}
