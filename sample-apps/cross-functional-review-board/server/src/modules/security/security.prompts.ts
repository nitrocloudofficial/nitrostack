import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class SecurityPrompts {
  @Prompt({
    name: 'security_review',
    description: 'Guidance for performing a contextual security review of a proposal',
    arguments: []
  })
  async getReviewPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating security review prompt');

    return {
      messages: [
        {
          role: 'user' as const,
          content: 'How should I review this proposal from a security standpoint?'
        },
        {
          role: 'assistant' as const,
          content: 'Evaluate only what the proposal actually states against the retrieved security baseline sections. Cite specific proposal text as evidence for each concern. Where the proposal is silent on something material, set requested_context rather than asserting a control is absent.'
        }
      ]
    };
  }
}