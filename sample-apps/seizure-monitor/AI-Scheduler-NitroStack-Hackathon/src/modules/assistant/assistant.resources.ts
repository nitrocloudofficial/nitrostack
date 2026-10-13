import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { HabitModel } from '../../models/habit.model.js';
import { ExpenseModel } from '../../models/expense.model.js';
import { DailySummaryModel } from '../../models/daily-summary.model.js';

export class AssistantResources {
  @Resource({
    name: 'daily_summary',
    uri: 'assistant://daily-summary',
    description: 'Return a demo daily summary payload for the dashboard.'
  })
  async getDailySummary(_input: unknown, ctx: ExecutionContext) {
    ctx.logger.info('Serving daily summary resource');

    return DailySummaryModel.create({
      userId: 'demo-user',
      date: new Date().toISOString(),
      metrics: {
        tasksCompleted: 4,
        totalHoursLogged: 6.5,
        expensesTotal: 89.2
      },
      summaryText: 'You completed 4 tasks and stayed on track with your plan.',
      insights: ['Focus on deep work in the morning.', 'Keep expenses under your weekly target.']
    });
  }

  @Resource({
    name: 'habit_snapshot',
    uri: 'assistant://habit-snapshot',
    description: 'Return a habit snapshot for analytics.'
  })
  async getHabitSnapshot(_input: unknown, ctx: ExecutionContext) {
    ctx.logger.info('Serving habit snapshot');

    return HabitModel.create({
      userId: 'demo-user',
      name: 'Meditation',
      frequency: 'daily',
      streakCount: 7,
      history: [{ date: '2026-07-25', completed: true }]
    });
  }

  @Resource({
    name: 'expense_snapshot',
    uri: 'assistant://expense-snapshot',
    description: 'Return recent expense insights.'
  })
  async getExpenseSnapshot(_input: unknown, ctx: ExecutionContext) {
    ctx.logger.info('Serving expense snapshot');

    return [
      ExpenseModel.create({ userId: 'demo-user', amount: 12, category: 'food', description: 'Lunch', date: '2026-07-25' }),
      ExpenseModel.create({ userId: 'demo-user', amount: 24, category: 'transport', description: 'Train', date: '2026-07-25' })
    ];
  }
}
