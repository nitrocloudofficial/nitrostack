import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class StudyCoachPrompts {
  @Prompt({
    name: 'smart_study_coach',
    description: 'Activate the Smart Study Coach to get a comprehensive proactive daily briefing that analyzes all academic data and creates a personalized study plan. This is CampusPilot AI\'s flagship agentic feature.',
    arguments: [
      {
        name: 'hours',
        description: 'How many hours are available for studying today (default: 6).',
        required: false,
      },
    ],
  })
  async getSmartStudyCoachPrompt(args: { hours?: string }, ctx: ExecutionContext) {
    const hours = args.hours || '6';

    return [
      {
        role: 'user' as const,
        content: `Activate Smart Study Coach. I have ${hours} hours available today.`,
      },
      {
        role: 'assistant' as const,
        content: `🧠 **CampusPilot Smart Study Coach** activated!

I'm now analyzing all your academic data across multiple sources:
- 📋 Pending assignments and their deadlines
- 📅 Today's class schedule  
- 📊 Attendance status for all subjects
- 📝 Upcoming exam schedule

Calling **get_daily_study_plan(studyHoursAvailable=${hours})** to generate your personalized plan...

This demonstrates true **agentic behavior** — I proactively analyze your entire academic situation and recommend the optimal use of your study time, without you needing to ask about each aspect separately.`,
      },
    ];
  }
}
