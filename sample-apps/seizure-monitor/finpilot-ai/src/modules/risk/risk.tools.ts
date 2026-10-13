import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore, RiskFlag } from '../../services/finance-store.service.js';

@Injectable({ deps: [FinanceStore] })
export class RiskTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'detect_risks',
    description:
      'Scan spending for financial risk signals: overspending vs income, one category dominating the budget, unusually large single transactions. Run analyze_spending first.',
    inputSchema: z.object({
      large_transaction_threshold_percent_of_income: z
        .number()
        .min(1)
        .max(100)
        .default(15)
        .describe('Flag a single transaction if it exceeds this % of monthly income'),
      category_dominance_threshold_percent: z
        .number()
        .min(10)
        .max(100)
        .default(40)
        .describe('Flag a category if it exceeds this % of total spend'),
    }),
  })
  async detectRisks(input: any, ctx: ExecutionContext) {
    const txns = this.store.listTransactions();
    const income = this.store.getMonthlyIncome();
    const expenses = txns.filter((t) => t.direction === 'debit');
    const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0);

    const flags: RiskFlag[] = [];

    if (income !== null && totalSpend > income) {
      flags.push({
        severity: 'high',
        message: `Spending (${totalSpend.toFixed(2)}) exceeds monthly income (${income.toFixed(2)}) — running a deficit.`,
      });
    }

    const byCategory: Record<string, number> = {};
    for (const t of expenses) {
      const cat = t.category ?? 'Uncategorized';
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
    }
    for (const [category, amount] of Object.entries(byCategory)) {
      const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
      if (pct >= (input.category_dominance_threshold_percent ?? 40)) {
        flags.push({
          severity: 'medium',
          message: `"${category}" makes up ${pct.toFixed(1)}% of total spending — a single category dominating the budget.`,
        });
      }
    }

    if (income !== null) {
      const threshold = (income * (input.large_transaction_threshold_percent_of_income ?? 15)) / 100;
      for (const t of expenses) {
        if (t.amount >= threshold) {
          flags.push({
            severity: 'low',
            message: `Large transaction: "${t.description}" (${t.amount.toFixed(2)}) on ${t.date} — ${(
              (t.amount / income) *
              100
            ).toFixed(1)}% of monthly income in one transaction.`,
          });
        }
      }
    }

    if (income === null) {
      flags.push({
        severity: 'low',
        message: 'No monthly income set — risk detection is limited without it. Use set_monthly_income for full analysis.',
      });
    }

    ctx.logger.info('Detected risks', { flagCount: flags.length });

    return {
      risk_count: flags.length,
      flags,
      overall_risk_level: flags.some((f) => f.severity === 'high')
        ? 'high'
        : flags.some((f) => f.severity === 'medium')
        ? 'medium'
        : flags.length > 0
        ? 'low'
        : 'none',
    };
  }
}
