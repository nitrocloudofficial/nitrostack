import {
  Injectable,
  PromptDecorator as Prompt,
  type ExecutionContext,
} from '@nitrostack/core';
import { ApplicationStore } from '../../common/store/application.store.js';
import type { Application } from '../../common/types/instantpulse.types.js';

/**
 * The only place an LLM is involved in a decision — and it is downstream of one.
 *
 * Each prompt is handed a decision that has already been computed deterministically
 * and asks the model to explain it. Every prompt carries the same instruction:
 * do not recompute, do not soften, do not invent a factor that is not in the
 * reason codes. The model writes the memo; the engine makes the call.
 */
@Injectable({ deps: [ApplicationStore] })
export class OnboardingPrompts {
  constructor(private readonly store: ApplicationStore) {}

  @Prompt({
    name: 'credit_memo',
    description:
      'Draft an officer-ready credit memo from a scored application. Produces the written record a credit ' +
      'committee expects, grounded strictly in the computed reason codes.',
    arguments: [
      { name: 'applicationId', description: 'The scored application to write up', required: true },
      {
        name: 'tone',
        description: 'concise (one page) or thorough (full committee memo). Defaults to concise.',
        required: false,
      },
    ],
  })
  async creditMemo(args: { applicationId: string; tone?: string }, ctx: ExecutionContext) {
    const application = this.requireScored(args.applicationId);
    const tone = args.tone === 'thorough' ? 'thorough' : 'concise';
    ctx.logger.info('Credit memo prompt issued', { applicationId: args.applicationId, tone });

    return [
      {
        role: 'user' as const,
        content:
          `Write a ${tone} credit memo for the application below.\n\n` +
          `Rules you must follow:\n` +
          `- Every claim must trace to a reason code, blocker, flag or metric in the data. Do not introduce ` +
          `factors that are not there.\n` +
          `- Do not recompute or second-guess the score. It is the output of a fixed, published policy.\n` +
          `- State the recommendation plainly, including the recommended limit and what constrained it.\n` +
          `- If there are blockers or flags, give each one its own line with what would resolve it.\n` +
          `- Write for a credit officer who will sign their name under it.\n\n` +
          `Structure: Summary · Business profile · Financial position · Risk factors · ` +
          `Recommendation · Conditions and next steps.\n\n` +
          `DECISION RECORD:\n${this.serialize(application)}`,
      },
    ];
  }

  @Prompt({
    name: 'explain_decision',
    description:
      'Explain a decision in plain language for a specific audience — the business owner, a credit officer, ' +
      'or a regulator. Use this to deliver an adverse-action explanation on a RED decision.',
    arguments: [
      { name: 'applicationId', description: 'The scored application to explain', required: true },
      {
        name: 'audience',
        description: 'owner | officer | regulator. Defaults to owner.',
        required: false,
      },
    ],
  })
  async explainDecision(args: { applicationId: string; audience?: string }, ctx: ExecutionContext) {
    const application = this.requireScored(args.applicationId);
    const audience = ['owner', 'officer', 'regulator'].includes(args.audience ?? '')
      ? (args.audience as string)
      : 'owner';

    ctx.logger.info('Decision explanation prompt issued', { applicationId: args.applicationId, audience });

    const guidance: Record<string, string> = {
      owner:
        'Write to the business owner. No jargon, no acronyms, no internal code names. Be direct about the ' +
        'outcome, specific about what drove it, and concrete about what they could change. If declined, be ' +
        'respectful and actionable — this person is trying to run a business, not decode a risk model.',
      officer:
        'Write to a credit officer. Technical vocabulary is fine. Lead with what needs their judgement and ' +
        'what the model could not settle on its own.',
      regulator:
        'Write for a compliance reviewer. Emphasise that scoring is deterministic and the policy is published ' +
        'at instantpulse://policy/risk-model. Show how each reason code maps to an observed metric, and state ' +
        'plainly that no automated adverse decision was made without an explicit, listed reason.',
    };

    return [
      {
        role: 'user' as const,
        content:
          `Explain the decision below to this audience: ${audience}.\n\n` +
          `${guidance[audience]}\n\n` +
          `Ground every statement in the reason codes and metrics provided. Do not invent factors, do not ` +
          `speculate about the business beyond what the banking data shows, and do not soften a decline into ` +
          `ambiguity — say what happened and why.\n\n` +
          `DECISION RECORD:\n${this.serialize(application)}`,
      },
    ];
  }

  @Prompt({
    name: 'review_checklist',
    description:
      'Generate the specific verification checklist for a YELLOW application — what an officer should ask ' +
      'for and confirm, derived from that application\'s actual flags rather than a generic list.',
    arguments: [
      { name: 'applicationId', description: 'The application under review', required: true },
    ],
  })
  async reviewChecklist(args: { applicationId: string }, ctx: ExecutionContext) {
    const application = this.requireScored(args.applicationId);
    ctx.logger.info('Review checklist prompt issued', { applicationId: args.applicationId });

    return [
      {
        role: 'user' as const,
        content:
          `Produce a review checklist for the application below.\n\n` +
          `Derive every item from this application's own soft flags, hard blockers and anomalies — not from a ` +
          `generic underwriting template. For each item give:\n` +
          `  1. What to verify\n` +
          `  2. Which document or answer would settle it\n` +
          `  3. What result would clear the flag, and what result would confirm the concern\n\n` +
          `Order by how much each item could move the decision. If a flag is already adequately explained by ` +
          `the data, say so and leave it off rather than padding the list.\n\n` +
          `Close with the single question that would most change the outcome.\n\n` +
          `DECISION RECORD:\n${this.serialize(application)}`,
      },
    ];
  }

  // -------------------------------------------------------------------------

  private requireScored(applicationId: string): Application {
    const application = this.store.getOrThrow(applicationId);
    if (!application.decision) {
      throw new Error(
        `Application "${applicationId}" has not been scored yet. Run decision_run_full_pipeline, or ` +
          `risk_score_application if the bank data is already synced.`,
      );
    }
    return application;
  }

  /** Everything the model needs to write, and nothing it could leak. */
  private serialize(application: Application): string {
    const view = this.store.toPublic(application);
    return JSON.stringify(
      {
        profile: view.profile,
        status: view.status,
        bankConnection: view.plaid,
        dataCoverage: view.snapshotSummary,
        metrics: view.metrics,
        decision: view.decision,
        stripe: view.stripe,
        override: view.override,
        documentRequests: view.documentRequests,
      },
      null,
      2,
    );
  }
}
