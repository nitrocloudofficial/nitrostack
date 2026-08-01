import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

@Injectable({ deps: [FinanceStore] })
export class HealthScoreTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'compute_health_score',
    description:
      'Compute a 0-100 Financial Health Score from savings rate, spend-to-income ratio, and category concentration. Run analyze_spending (and detect_risks, optionally) first for best results.',
    inputSchema: z.object({
      risk_flag_count: z.number().min(0).default(0).describe('Number of risk flags from detect_risks, if available'),
    }),
  })
  async computeHealthScore(input: any, ctx: ExecutionContext) {
    const income = this.store.getMonthlyIncome();
    const txns = this.store.listTransactions();
    const expenses = txns.filter((t) => t.direction === 'debit');
    const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0);

    if (income === null || income === 0) {
      return {
        status: 'insufficient_data',
        message: 'Set monthly income (set_monthly_income) to compute a health score.',
      };
    }

    const savingsRate = (income - totalSpend) / income;

    const byCategory: Record<string, number> = {};
    for (const t of expenses) {
      const cat = t.category ?? 'Uncategorized';
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
    }
    const maxCategoryShare =
      totalSpend > 0 ? Math.max(...Object.values(byCategory)) / totalSpend : 0;

    const savingsScore = Math.max(0, Math.min(1, savingsRate / 0.2)) * 50;
    const concentrationScore = Math.max(0, Math.min(1, (0.5 - maxCategoryShare) / 0.25)) * 25;
    const riskScore = Math.max(0, 25 - (input.risk_flag_count ?? 0) * 5);

    const totalScore = Math.round(savingsScore + concentrationScore + riskScore);

    const band =
      totalScore >= 80 ? 'Excellent' : totalScore >= 60 ? 'Good' : totalScore >= 40 ? 'Needs Attention' : 'At Risk';

    ctx.logger.info('Computed health score', { totalScore, band });

    return {
      health_score: totalScore,
      band,
      breakdown: {
        savings_score: Math.round(savingsScore),
        concentration_score: Math.round(concentrationScore),
        risk_score: Math.round(riskScore),
      },
      savings_rate_percent: Math.round(savingsRate * 1000) / 10,
      top_category_share_percent: Math.round(maxCategoryShare * 1000) / 10,
    };
  }
}
