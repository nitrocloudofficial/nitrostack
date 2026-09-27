import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class EngineeringPrompts {
  @Prompt({
    name: 'engineering_review',
    description: 'Guidance for performing an engineering review of a proposal',
    arguments: []
  })
  async getReviewPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating engineering review prompt');

    return {
      messages: [
        {
          role: 'user' as const,
          content: 'How should I review this proposal from an engineering perspective?'
        },
        {
          role: 'assistant' as const,
          content: 'Size effort independently (small/medium/large/massive), check architectural coupling, scaling cliffs, testing/rollback readiness, and technical debt against the Engineering Baseline. Output JSON with effort_assessment, summary, and concerns.'
        }
      ]
    };
  }
}
