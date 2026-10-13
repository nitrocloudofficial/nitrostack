import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + 'T00:00:00');
  const end = new Date(endIso + 'T00:00:00');
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months, 0);
}

@Injectable({ deps: [FinanceStore] })
export class GoalsTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'manage_savings_goals',
    description:
      'Unified Savings Goal Engine — Create goals, add money contributions (action: create_goal | add_contribution), or track progress analytics and timelines against target monthly savings rates (action: list_goals | track_progress).',
    inputSchema: z.object({
      action: z
        .enum(['create_goal', 'add_contribution', 'list_goals', 'track_progress'])
        .default('track_progress')
        .describe('Goal management or analytics action'),
      name: z.string().optional().describe('Short name for the goal, e.g. "New laptop" (for create_goal)'),
      target_amount: z.number().positive().optional().describe('Total target amount (for create_goal)'),
      target_date: z.string().optional().describe('Target date YYYY-MM-DD (for create_goal)'),
      saved_so_far: z.number().min(0).default(0).optional().describe('Initial saved amount (for create_goal)'),
      goal_id: z.string().optional().describe('ID of goal (for add_contribution / track_progress)'),
      amount_added: z.number().optional().describe('Amount added (for add_contribution)'),
    }),
  })
  async manageSavingsGoals(input: any, ctx: ExecutionContext) {
    const action = input.action || 'track_progress';
    if (action === 'create_goal' || action === 'add_contribution') {
      return this.manageSavingsGoal(input, ctx);
    } else {
      return this.getGoalAnalytics(input, ctx);
    }
  }

  async manageSavingsGoal(input: any, ctx: ExecutionContext) {
    if (input.action === 'create_goal' || (input.name && input.target_amount && input.target_date)) {
      if (!input.name || !input.target_amount || !input.target_date) {
        throw new Error('name, target_amount, and target_date are required for action: create_goal');
      }
      const goal = this.store.addGoal({
        name: input.name,
        target_amount: input.target_amount,
        target_date: input.target_date,
        saved_so_far: input.saved_so_far ?? 0,
      });
      ctx.logger.info('Setting goal', { name: input.name, target: input.target_amount });
      return { goal };
    } else {
      if (!input.goal_id || input.amount_added === undefined) {
        throw new Error('goal_id and amount_added are required for action: add_contribution');
      }
      const goal = this.store.getGoal(input.goal_id);
      if (!goal) throw new Error(`No goal found with id "${input.goal_id}".`);
      const updated = this.store.updateGoalSaved(input.goal_id, Math.max(0, goal.saved_so_far + input.amount_added));
      ctx.logger.info('Logged contribution', { goal: goal.name, amount: input.amount_added });
      return { goal: updated };
    }
  }

  async getGoalAnalytics(input: any, ctx: ExecutionContext) {
    if (input.action === 'list_goals') {
      const goals = this.store.listGoals();
      ctx.logger.info('Listing goals', { count: goals.length });
      return { count: goals.length, goals };
    } else {
      const goals = input.goal_id
        ? [this.store.getGoal(input.goal_id)].filter(Boolean)
        : this.store.listGoals();

      if (goals.length === 0) {
        return { status: 'no_goals', message: 'No goals set yet — use manage_savings_goals to create one.' };
      }

      const income = this.store.getMonthlyIncome();
      const txns = this.store.listTransactions();
      const totalSpend = txns.filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
      const currentMonthlySavings = income !== null ? income - totalSpend : null;

      const today = new Date().toISOString().slice(0, 10);

      const results = (goals as NonNullable<(typeof goals)[number]>[]).map((goal) => {
        const remaining = Math.max(goal.target_amount - goal.saved_so_far, 0);
        const monthsLeft = Math.max(monthsBetween(today, goal.target_date), 1);
        const requiredMonthlySaving = Math.round((remaining / monthsLeft) * 100) / 100;

        let status: 'achieved' | 'on_track' | 'at_risk' | 'unknown' = 'unknown';
        if (remaining <= 0) status = 'achieved';
        else if (currentMonthlySavings !== null) {
          status = currentMonthlySavings >= requiredMonthlySaving ? 'on_track' : 'at_risk';
        }

        return {
          goal_id: goal.id,
          goal_name: goal.name,
          target_amount: goal.target_amount,
          saved_so_far: goal.saved_so_far,
          remaining_amount: Math.round(remaining * 100) / 100,
          months_left: monthsLeft,
          required_monthly_saving: requiredMonthlySaving,
          current_monthly_savings: currentMonthlySavings,
          status,
          shortfall_per_month:
            status === 'at_risk' && currentMonthlySavings !== null
              ? Math.round((requiredMonthlySaving - currentMonthlySavings) * 100) / 100
              : null,
        };
      });

      ctx.logger.info('Tracked goal progress', { goals: results.length });

      return { goal_count: results.length, goals: results };
    }
  }
}
