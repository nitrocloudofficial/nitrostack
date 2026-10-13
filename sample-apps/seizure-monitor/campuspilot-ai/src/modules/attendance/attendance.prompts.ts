import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class AttendancePrompts {
  @Prompt({
    name: 'attendance_advice',
    description: 'Get personalized advice about whether it is safe to miss a class for a specific subject, considering the minimum attendance requirement.',
    arguments: [
      {
        name: 'subject',
        description: 'The subject to check bunk safety for, e.g. "DBMS", "Operating Systems", "CS503".',
        required: true,
      },
    ],
  })
  async getBunkAdvice(args: { subject: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Can I safely bunk tomorrow's ${args.subject} class?`,
      },
      {
        role: 'assistant' as const,
        content: `Let me check your ${args.subject} attendance record before answering.

I'll call **attendance_calculator(subject="${args.subject}")** to get:
- Your current attendance percentage
- Whether you're above 75% threshold
- How many classes you can safely miss
- My recommendation

This ensures I give you an accurate, data-driven answer rather than a guess.`,
      },
    ];
  }
}
