import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * TaskManager Prompts
 * 
 * TODO: Add description
 */
export class TaskManagerPrompts {
  @Prompt({
    name: 'taskmanager-help',
    description: 'TODO: Add description',
  })
  async helpPrompt(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'TODO: Add prompt content',
        },
      },
    ];
  }
}
