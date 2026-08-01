import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class TimetablePrompts {
  @Prompt({
    name: 'study_plan',
    description: 'Generate a personalized daily study plan combining today\'s timetable, pending assignments, and attendance status. Use this when the student asks "Plan my day" or "Help me study today".',
    arguments: [
      {
        name: 'focus',
        description: 'Optional focus area: "assignments", "exams", "attendance", or "balanced". Defaults to "balanced".',
        required: false,
      },
    ],
  })
  async getStudyPlan(args: { focus?: string }, ctx: ExecutionContext) {
    const focus = args.focus || 'balanced';

    return [
      {
        role: 'user' as const,
        content: `Create a ${focus} study plan for me today.`,
      },
      {
        role: 'assistant' as const,
        content: `I'll build your personalized study plan! Let me gather all the information:

1. First, I'll call **get_timetable(day="today")** to see your classes.
2. Then **get_assignments(status="pending")** to check pending work.
3. Then **attendance_calculator()** to see which subjects need attention.
4. Finally, I'll synthesize everything into a time-blocked study plan.

Your plan will include:
- ⏰ Class schedule for today
- 📚 Study blocks for pending assignments (prioritized by deadline)
- ⚠️ Attendance alerts for at-risk subjects  
- 🎯 Focus: ${focus}

Calling tools now...`,
      },
    ];
  }
}
