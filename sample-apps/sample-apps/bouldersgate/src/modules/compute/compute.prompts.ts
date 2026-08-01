import { PromptDecorator as Prompt, type ExecutionContext } from '@nitrostack/core';

export class ComputePrompts {
  @Prompt({
    name: 'negotiate_compute',
    description:
      'Guide an agent to state task-derived compute needs, interpret an BouldersGate counter-offer, and adapt or decline without probing for policy limits.',
    arguments: [
      {
        name: 'task',
        description: 'The concrete task that requires compute.',
        required: true,
      },
    ],
  })
  async negotiatePrompt(
    args: Record<string, string>,
    _context: ExecutionContext,
  ) {
    // NitroStack's PromptMessage takes a plain string. An MCP-style
    // `{ type: 'text', text }` block is rejected at request time, not compile
    // time, so this must stay a string.
    return [
      {
        role: 'user' as const,
        content: `Plan compute for this task: ${args.task}

1. Infer the runtime, memory, CPU, duration, and exact outbound hosts from the task itself.
2. Call request_compute once with those genuine needs. Do not guess or probe policy limits.
3. Inspect every returned delta. Decide whether the task can still succeed under the grant.
4. If it can, adapt the plan explicitly and call accept_offer with the returned offerId.
5. If a reduction breaks a hard task requirement, decline the offer and explain the conflict.
6. Execute with argv arrays, preserve outputs needed by the task, then release the environment.`,
      },
    ];
  }
}
