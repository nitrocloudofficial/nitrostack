import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class AssignmentPrompts {
  @Prompt({
    name: 'assignment_reminder',
    description: 'Generate a smart assignment reminder and action plan for the student based on pending deadlines.',
    arguments: [
      {
        name: 'urgency',
        description: 'Focus urgency level: "today", "this-week", or "all". Defaults to "this-week".',
        required: false,
      },
    ],
  })
  async getAssignmentReminder(args: { urgency?: string }, ctx: ExecutionContext) {
    const urgency = args.urgency || 'this-week';

    return [
      {
        role: 'user' as const,
        content: `Show me all my ${urgency === 'today' ? 'assignments due today' : urgency === 'all' ? 'all pending assignments' : 'assignments due this week'} and help me plan my time.`,
      },
      {
        role: 'assistant' as const,
        content: `I'll check your assignment deadlines and help you create an action plan.

First, let me retrieve your assignments using the get_assignments tool. Then I'll:
1. List all ${urgency}-deadline assignments sorted by priority
2. Estimate time needed for each
3. Suggest a study schedule
4. Warn you about any risk of missing deadlines

Call get_assignments now to see the current status.`,
      },
    ];
  }
}
