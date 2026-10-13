/**
 * MCP prompts — ready-made conversation openers that drive the bridge properly.
 *
 * These matter more than they look. An agent handed a pile of tools will use
 * them in the wrong order; these prompts encode the correct sequence and the
 * reasoning behind it, so a first-time user gets the full demo path by picking
 * one item from a menu.
 */
import { Injectable, PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { StoreService } from '../../shared/services/store.service.js';

@Injectable({ deps: [StoreService] })
export class BridgePrompts {
  constructor(private store: StoreService) {}

  @Prompt({
    name: 'onboard_ai_to_codebase',
    description:
      'The full bridge workflow: run the swarm over a legacy codebase, resolve any context ' +
      'conflicts with the human, and produce the CLAUDE.md manifest.',
    arguments: [
      {
        name: 'target',
        description: 'Absolute path to the legacy codebase. Omit to use the bundled Aurora fixture.',
        required: false,
      },
    ],
  })
  async onboard(args: { target?: string }, ctx: ExecutionContext) {
    ctx.logger.info('onboard_ai_to_codebase prompt requested', { target: args.target });
    const targetClause = args.target
      ? `the codebase at \`${args.target}\``
      : 'the bundled Aurora Billing legacy fixture';

    return [
      {
        role: 'user' as const,
        content:
          `Onboard yourself to ${targetClause} using the Enterprise Agentic Bridge, then tell me ` +
          `what you learned that you could not have guessed from the source code alone.`,
      },
      {
        role: 'assistant' as const,
        content:
          `I will run the bridge end to end.\n\n` +
          `**Step 1 — reconnaissance.** Call \`run_swarm\`${args.target ? ` with target="${args.target}"` : ''}. ` +
          `That dispatches all seven personas and commits their findings to the durable knowledge base.\n\n` +
          `**Step 2 — conflicts.** The swarm cross-references the Jira sprint against the team chat ` +
          `transcript. If they disagree it pauses in \`awaiting-resolution\` rather than guessing. ` +
          `I will show you each conflict with its alignment and divergence scores and ask you to rule ` +
          `on it — I will not pick for you, because the whole point is that the manifest reflects a ` +
          `validated human decision.\n\n` +
          `**Step 3 — skills.** Where I find a legacy interface with no modern equivalent, I will ` +
          `call \`generate_custom_skill\` to mint a real MCP tool for it rather than writing a ` +
          `paragraph about it.\n\n` +
          `**Step 4 — manifest.** \`synthesize_claude_md\` writes CLAUDE.md, with your rulings in ` +
          `section 0 where they override everything else.\n\n` +
          `Starting with \`run_swarm\` now.`,
      },
    ];
  }

  @Prompt({
    name: 'implement_feature_with_pipeline',
    description:
      "Run a feature request through the administrator's saved SDLC pipeline, grounded in the " +
      'knowledge base rather than guesswork.',
    arguments: [
      { name: 'feature', description: 'What you want built', required: true },
      { name: 'pipeline_name', description: 'Which saved pipeline to use', required: false },
    ],
  })
  async implementFeature(args: { feature: string; pipeline_name?: string }, ctx: ExecutionContext) {
    ctx.logger.info('implement_feature_with_pipeline prompt requested', { feature: args.feature });
    const facts = this.store.all('knowledge').length;
    const pipelines = this.store.all('pipelines');

    return [
      {
        role: 'user' as const,
        content: `Implement this against the legacy codebase: ${args.feature}`,
      },
      {
        role: 'assistant' as const,
        content:
          (facts
            ? `The knowledge base has ${facts} facts, so I can ground this properly.\n\n`
            : `The knowledge base is empty — I will run \`run_swarm\` first, otherwise I would be guessing.\n\n`) +
          (pipelines.length
            ? `Running \`run_pipeline\` with task="${args.feature}"` +
              (args.pipeline_name ? ` and pipeline_name="${args.pipeline_name}"` : ` on "${pipelines[pipelines.length - 1].name}"`) +
              `.\n\n`
            : `No pipeline is saved yet. I will call \`list_pipeline_nodes\` and compose one in the ` +
              `pipeline-builder widget first.\n\n`) +
          `Before I write anything I will check:\n` +
          `- \`find_change_surface\` — what else this change forces me to touch\n` +
          `- the testing contract — framework, spec location, naming, coverage gate\n` +
          `- the design system — approved tokens and existing components, no invented hex values\n` +
          `- the commit convention — CI rejects commits that do not match it\n\n` +
          `Anything with a real side effect (push, deploy, Jira, Slack) I will plan and show you, ` +
          `not execute.`,
      },
    ];
  }

  @Prompt({
    name: 'resolve_context_conflicts',
    description:
      'Walk through every open conflict between the ticket tracker and human consensus, and ' +
      'record an authoritative ruling for each.',
    arguments: [],
  })
  async resolveConflicts(_args: Record<string, never>, ctx: ExecutionContext) {
    const open = this.store.all('conflicts').filter((c) => c.status === 'open');
    ctx.logger.info('resolve_context_conflicts prompt requested', { open: open.length });

    return [
      {
        role: 'user' as const,
        content: 'Walk me through the open context conflicts and help me decide each one.',
      },
      {
        role: 'assistant' as const,
        content: open.length
          ? `There ${open.length === 1 ? 'is' : 'are'} ${open.length} open conflict${open.length === 1 ? '' : 's'}:\n\n` +
            open
              .map(
                (c, i) =>
                  `**${i + 1}. ${c.topic}** (\`${c.kind}\`, alignment ${c.similarity}, divergence ${c.divergence})\n` +
                  `- **A — ${c.sourceA.origin} ${c.sourceA.ref}:** ${c.sourceA.text.slice(0, 220)}\n` +
                  `- **B — ${c.sourceB.origin}:** ${c.sourceB.text.slice(0, 220)}\n` +
                  `- Machine suggestion: **${c.recommendation.toUpperCase()}** — ${c.recommendationReason}`
              )
              .join('\n\n') +
            `\n\nFor each one, tell me A, B, or give me your own directive, and I will record it with ` +
            `\`resolve_conflict\`. Your ruling lands in section 0 of CLAUDE.md and outranks everything else.`
          : `No open conflicts.` +
            (this.store.all('conflicts').length
              ? ` All ${this.store.all('conflicts').length} detected conflict(s) have been resolved.`
              : ` Run \`detect_conflicts\` (or \`run_swarm\`) to cross-reference the sources.`),
      },
    ];
  }
}
