import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

@Injectable({ deps: [FinanceStore] })
export class AnalysisTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'analyze_spending',
    description:
      'Compute spending totals, category breakdown, and month-over-month trend from categorized transactions. Run categorize_expenses first for best results.',
    inputSchema: z.object({}),
  })
  async analyzeSpending(_input: any, ctx: ExecutionContext) {
    const txns = this.store.listTransactions();
    const income = this.store.getMonthlyIncome();

    const expenses = txns.filter((t) => t.direction === 'debit');
    const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0);

    const byCategory: Record<string, number> = {};
    for (const t of expenses) {
      const cat = t.category ?? 'Uncategorized';
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
    }
    const categoryBreakdown = Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percent_of_spend: totalSpend > 0 ? Math.round((amount / totalSpend) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Month-over-month, keyed by YYYY-MM
    const byMonth: Record<string, number> = {};
    for (const t of expenses) {
      const month = t.date.slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + t.amount;
    }
    const monthlyTrend = Object.entries(byMonth)
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));

    ctx.logger.info('Analyzed spending', { totalSpend, categories: categoryBreakdown.length });

    return {
      total_spend: Math.round(totalSpend * 100) / 100,
      monthly_income: income,
      spend_to_income_ratio: income ? Math.round((totalSpend / income) * 1000) / 10 : null,
      category_breakdown: categoryBreakdown,
      monthly_trend: monthlyTrend,
      top_category: categoryBreakdown[0] ?? null,
    };
  }
}
