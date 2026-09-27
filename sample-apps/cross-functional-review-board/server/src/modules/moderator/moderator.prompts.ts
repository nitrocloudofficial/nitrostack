import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class ModeratorPrompts {
  @Prompt({
    name: 'moderator_synthesis',
    description: 'Guidance for synthesizing agent outputs into a final decision report',
    arguments: []
  })
  async getSynthesisPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating moderator synthesis prompt');

    return {
      messages: [
        {
          role: 'user' as const,
          content: 'How should the Moderator synthesize the board findings?'
        },
        {
          role: 'assistant' as const,
          content: 'Apply the deterministic Decision Policy (Rules 1-4) strictly. The decision is calculated in code. Use the LLM only to craft executive summary text, unresolved risk descriptions, and required action items.'
        }
      ]
    };
  }
}
