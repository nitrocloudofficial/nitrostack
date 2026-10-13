import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class PlannerPrompts {
  @Prompt({
    name: 'daily_academic_summary',
    description: 'Summarize today\'s academic updates',
    arguments: []
  })
  async getDailySummaryPrompt(args: any, ctx: ExecutionContext) {
    return [{
      role: 'user',
      content: { type: 'text', text: 'Summarize today\'s academic updates.' }
    }];
  }

  @Prompt({
    name: 'weekly_planner',
    description: 'Plan the upcoming week',
    arguments: []
  })
  async getWeeklyPlannerPrompt(args: any, ctx: ExecutionContext) {
    return [{ role: 'user', content: { type: 'text', text: 'Plan my academic week.' } }];
  }
}

