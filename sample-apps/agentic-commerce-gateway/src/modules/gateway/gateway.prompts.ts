import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Reusable instruction sets that drive the gateway's investigation loop.
 */
export class GatewayPrompts {
  @Prompt({
    name: 'triage_agent_order',
    description:
      'Run the full fraud investigation on an incoming agent order and act on the verdict',
    arguments: [
      { name: 'order_id', description: 'The order to investigate, e.g. ord_1002', required: true },
    ],
  })
  async triageAgentOrder(args: { order_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Building triage prompt', { orderId: args.order_id });

    return {
      messages: [
        {
          role: 'user',
          content: `You are the fraud gateway for the NovaGear store. Investigate order ${args.order_id} before it settles.

Steps:
1. Call screen_agent for ${args.order_id} and read every check, not just the summary.
2. Call compute_trust_score for ${args.order_id}.
3. Reason explicitly about any entries in "conflicts" — a valid signature does not make a bulk-drain order legitimate, and high reputation does not excuse abnormal velocity.
4. Act on the verdict:
   - decline -> call blocklist_agent if the evidence shows intent, not just a low score.
   - hold -> explain to the seller exactly which signal sent it to human review.
   - approve -> say what would have changed your mind.
5. Finish with a two-line summary the seller can act on.`,
        },
      ],
    };
  }

  @Prompt({
    name: 'audit_settlement',
    description: 'Verify a settled sale against the chain and act on any mismatch',
    arguments: [
      { name: 'order_id', description: 'The settled order to audit, e.g. ord_1003', required: true },
    ],
  })
  async auditSettlement(args: { order_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Building settlement audit prompt', { orderId: args.order_id });

    return {
      messages: [
        {
          role: 'user',
          content: `Audit the settlement for order ${args.order_id}.

1. Call verify_receipt for ${args.order_id}.
2. Report every mismatched field with both values side by side, and state the rupee exposure.
3. If there is any critical mismatch, call flag_order with the specific field diffs as evidence, then blocklist_agent for the agent on the receipt.
4. Call get_sales_dashboard and report the updated "revenue protected" figure.`,
        },
      ],
    };
  }
}
