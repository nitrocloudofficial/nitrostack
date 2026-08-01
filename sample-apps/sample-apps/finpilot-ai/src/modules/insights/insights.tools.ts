import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[0-9]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

@Injectable({ deps: [FinanceStore] })
export class InsightsTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'analyze_recurring_and_purchase_impact',
    description:
      'Unified Insights Engine — Scan for recurring charges/subscriptions (mode: recurring_charges) or simulate the financial & goal-delay impact of a hypothetical purchase (mode: purchase_impact).',
    inputSchema: z.object({
      mode: z
        .enum(['recurring_charges', 'purchase_impact'])
        .default('recurring_charges')
        .describe('Operation mode'),
      amount_tolerance_percent: z
        .number()
        .min(0)
        .max(50)
        .default(10)
        .optional()
        .describe('Tolerance % for recurring charges'),
      amount: z.number().positive().optional().describe('Hypothetical purchase amount (for purchase_impact)'),
      description: z.string().optional().describe('Purchase description (for purchase_impact)'),
      goal_id: z.string().optional().describe('Goal ID (for purchase_impact)'),
    }),
  })
  async analyzeRecurringAndPurchaseImpact(input: any, ctx: ExecutionContext) {
    const mode = input.mode || 'recurring_charges';

    if (mode === 'purchase_impact') {
      if (!input.amount) throw new Error('amount is required for mode: purchase_impact');
      const income = this.store.getMonthlyIncome();
      const txns = this.store.listTransactions();
      const totalSpend = txns.filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
      const currentMonthlySavings = income !== null ? income - totalSpend : null;

      if (currentMonthlySavings === null) {
        return {
          status: 'insufficient_data',
          message: 'Set monthly income (set_monthly_income) to simulate purchase impact.',
        };
      }

      const savingsAfterPurchase = currentMonthlySavings - input.amount;
      const wouldCauseDeficit = savingsAfterPurchase < 0;

      const allGoals = this.store.listGoals();
      const goals = input.goal_id ? allGoals.filter((g) => g.id === input.goal_id) : allGoals;

      const goalImpacts = goals.map((goal) => {
        const remaining = Math.max(goal.target_amount - goal.saved_so_far, 0);
        const requiredMonthlySaving = remaining > 0 ? remaining / 12 : 0;
        const delayMonths = requiredMonthlySaving > 0 ? Math.round((input.amount / requiredMonthlySaving) * 10) / 10 : 0;
        return {
          goal_id: goal.id,
          goal_name: goal.name,
          estimated_delay_months: delayMonths,
        };
      });

      ctx.logger.info('Simulated purchase impact', { amount: input.amount, wouldCauseDeficit });

      return {
        purchase_amount: input.amount,
        description: input.description ?? null,
        current_monthly_savings: Math.round(currentMonthlySavings * 100) / 100,
        monthly_savings_after_purchase: Math.round(savingsAfterPurchase * 100) / 100,
        would_cause_deficit: wouldCauseDeficit,
        goal_impacts: goalImpacts,
        recommendation: wouldCauseDeficit
          ? 'This purchase would push the month into a deficit — consider waiting or reducing the amount.'
          : goalImpacts.some((g) => g.estimated_delay_months >= 1)
          ? 'This purchase is affordable this month but would meaningfully delay at least one goal — worth weighing against how much the purchase matters.'
          : 'This purchase looks affordable without meaningfully affecting current goals.',
      };
    } else {
      // recurring_charges
      const expenses = this.store.listTransactions().filter((t) => t.direction === 'debit');
      const tolerance = (input.amount_tolerance_percent ?? 10) / 100;

      const byDescription = new Map<string, typeof expenses>();
      for (const t of expenses) {
        const key = normalizeDescription(t.description);
        if (!key) continue;
        const list = byDescription.get(key) ?? [];
        list.push(t);
        byDescription.set(key, list);
      }

      const recurring: {
        description: string;
        occurrences: number;
        average_amount: number;
        estimated_monthly_cost: number;
        dates: string[];
      }[] = [];

      for (const [, group] of byDescription) {
        if (group.length < 2) continue;
        const amounts = group.map((t) => t.amount).sort((a, b) => a - b);
        const median = amounts[Math.floor(amounts.length / 2)];
        const cluster = group.filter((t) => Math.abs(t.amount - median) <= median * tolerance);
        if (cluster.length < 2) continue;

        const avg = cluster.reduce((s, t) => s + t.amount, 0) / cluster.length;
        recurring.push({
          description: cluster[0].description,
          occurrences: cluster.length,
          average_amount: Math.round(avg * 100) / 100,
          estimated_monthly_cost: Math.round(avg * 100) / 100,
          dates: cluster.map((t) => t.date).sort(),
        });
      }

      recurring.sort((a, b) => b.estimated_monthly_cost - a.estimated_monthly_cost);
      const totalRecurringMonthly = recurring.reduce((s, r) => s + r.estimated_monthly_cost, 0);

      ctx.logger.info('Detected recurring charges', { count: recurring.length });

      return {
        recurring_charge_count: recurring.length,
        recurring_charges: recurring,
        total_estimated_monthly_recurring_cost: Math.round(totalRecurringMonthly * 100) / 100,
        note:
          recurring.length === 0
            ? 'No repeating charges found yet — needs at least 2 occurrences of a similar transaction to detect a pattern.'
            : undefined,
      };
    }
  }

  // Programmatic helper methods
  async detectRecurringCharges(input: any, ctx: ExecutionContext) {
    return this.analyzeRecurringAndPurchaseImpact({ mode: 'recurring_charges', ...input }, ctx);
  }

  async simulatePurchaseImpact(input: any, ctx: ExecutionContext) {
    return this.analyzeRecurringAndPurchaseImpact({ mode: 'purchase_impact', ...input }, ctx);
  }
}
