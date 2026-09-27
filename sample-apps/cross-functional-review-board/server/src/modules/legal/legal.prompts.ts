import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class LegalPrompts {
  @Prompt({
    name: 'legal_review',
    description: 'Guidance for performing a legal review of a proposal',
    arguments: []
  })
  async getReviewPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating legal review prompt');

    return {
      messages: [
        {
          role: 'user' as const,
          content: 'How should I review this proposal from a legal perspective?'
        },
        {
          role: 'assistant' as const,
          content: 'Evaluate regulatory & licensing triggers, IP ownership, liability & indemnification, lawful basis for data processing, and governing law against Legal Baseline. Avoid reflexive hedging — cite specific triggers, exposures, and required next steps.'
        }
      ]
    };
  }
}
