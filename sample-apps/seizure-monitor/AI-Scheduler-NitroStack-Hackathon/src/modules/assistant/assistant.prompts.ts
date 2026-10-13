import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class AssistantPrompts {
  @Prompt({
    name: 'daily_summary_prompt',
    description: 'Generate a polished daily summary from assistant activity.'
  })
  async dailySummaryPrompt(_input: unknown, ctx: ExecutionContext) {
    ctx.logger.info('Generating daily summary prompt');

    return {
      prompt: 'Summarize today\'s completed tasks, missed opportunities, habits, and expense highlights in a concise executive format.'
    };
  }
}
