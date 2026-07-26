import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class ProductPrompts {
  @Prompt({
    name: 'product_review',
    description: 'Guidance for performing a product evaluation of a proposal',
    arguments: []
  })
  async getReviewPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating product review prompt');

    return {
      messages: [
        {
          role: 'user' as const,
          content: 'How should I evaluate this proposal from a product management perspective?'
        },
        {
          role: 'assistant' as const,
          content: 'Evaluate problem-solution fit, success metrics (leading & lagging), RICE opportunity cost, unit economics, and scope discipline against the Product Baseline. Output JSON with verdict, opportunity_cost_estimate, summary, and concerns.'
        }
      ]
    };
  }
}
