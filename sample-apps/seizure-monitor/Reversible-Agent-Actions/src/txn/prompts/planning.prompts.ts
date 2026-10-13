import { PromptDecorator as Prompt } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';

// Not re-exported from '@nitrostack/core' despite being part of the internal
// PromptDefinition handler signature (types.ts: PromptArgumentValue).
type PromptArgumentValue = string | number | boolean | null;

const PLAN_TEXT = `Before beginning a multi-step operation that writes to external systems, follow this protocol:

1. PREFLIGHT: Call preflight_plan with your intended steps. Review the reversibility class of each step. Note the pivot index (first irreversible step) if any.
2. REORDER if safe: If pivotIndex is not null and reorderRecommended is true, consider moving TERMINAL steps to the end — but only if data dependencies allow it.
3. OPEN: Call begin_transaction with a descriptive label and the scope of systems you will touch.
4. EXECUTE: Perform your planned steps. Each call is journalled automatically.
5. ON SUCCESS: Call commit_transaction to close the boundary.
6. ON FAILURE: Call rollback_transaction with a clear reason. Review the returned report — any notReversed items require human attention. Do not ignore PARTIAL status.

The transaction boundary is your safety net. Use it for every multi-step write operation.`;

/** Prompts guiding an agent through the safe multi-step transaction protocol. */
export class PlanningPrompts {
  @Prompt({
    name: 'safe_multi_step_plan',
    description:
      'Instructions for planning and executing a reversible multi-step agent operation. Use this whenever you are about to call multiple write tools in sequence.',
  })
  async safePlan(_args: Record<string, PromptArgumentValue>, _ctx: ExecutionContext) {
    // @nitrostack/core's Prompt handler is invoked as (args, context) and each
    // message must be { role, content: string } — not the { type, text } shape
    // shown in some of the SDK's own JSDoc examples (confirmed via prompt.js's
    // validateMessageFormat, which throws on anything else).
    return [{ role: 'user' as const, content: PLAN_TEXT }];
  }
}
