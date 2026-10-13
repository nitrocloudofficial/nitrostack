import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import { NotificationTools } from '../notification/notification.tools.js';

@Injectable({ deps: [FinanceStore] })
export class BehaviourTools {
  private notificationTools: NotificationTools;

  constructor(private store: FinanceStore) {
    this.notificationTools = new NotificationTools(store);
  }

  @Tool({
    name: 'analyze_spending_behaviour',
    description:
      'Financial Behaviour AI — Detect psychological spending patterns correlated with triggers (post-salary spending surge, weekend entertainment spikes, micro-transaction leakage). Auto-sends non-judgmental awareness alerts via Notification module.',
    inputSchema: z.object({
      timeframe_days: z.number().positive().default(60).describe('Timeframe window in days to analyze'),
    }),
  })
  async analyzeSpendingBehaviour(input: any, ctx: ExecutionContext) {
    const txns = this.store.listTransactions();
    const debits = txns.filter((t) => t.direction === 'debit');
    const credits = txns.filter((t) => t.direction === 'credit');

    const patterns: Array<{
      pattern_type: string;
      title: string;
      description: string;
      detected: boolean;
      impact_amount: number;
    }> = [];

    // 1. Post-Salary Credit Surge
    let postSalarySpikeAmount = 0;
    if (credits.length > 0) {
      for (const c of credits) {
        const creditDate = new Date(c.date).getTime();
        const postSalaryExpenses = debits.filter((d) => {
          const debitDate = new Date(d.date).getTime();
          const diffDays = (debitDate - creditDate) / (1000 * 3600 * 24);
          return diffDays >= 0 && diffDays <= 3 && (d.category === 'Shopping' || d.category === 'Food & Dining');
        });
        postSalarySpikeAmount += postSalaryExpenses.reduce((s, d) => s + d.amount, 0);
      }
    }

    patterns.push({
      pattern_type: 'post_salary_surge',
      title: 'Post-Salary Credit Spending Surge',
      description: `You tend to spend heavily on Shopping/Dining within 3 days of receiving income (average surge: ₹${postSalarySpikeAmount.toLocaleString('en-IN')}).`,
      detected: postSalarySpikeAmount > 2000,
      impact_amount: postSalarySpikeAmount,
    });

    // 2. Weekend Spend Surge (Saturday / Sunday)
    let weekendSpend = 0;
    let weekdaySpend = 0;
    for (const d of debits) {
      const day = new Date(d.date).getDay();
      if (day === 0 || day === 6) {
        weekendSpend += d.amount;
      } else {
        weekdaySpend += d.amount;
      }
    }
    const totalSpend = weekendSpend + weekdaySpend;
    const weekendRatio = totalSpend > 0 ? Math.round((weekendSpend / totalSpend) * 100) : 0;

    patterns.push({
      pattern_type: 'weekend_spike',
      title: 'Weekend Entertainment & Dining Spike',
      description: `Weekend spending accounts for ${weekendRatio}% of your total budget (${weekendSpend.toLocaleString('en-IN')} on Sat/Sun).`,
      detected: weekendRatio > 35,
      impact_amount: weekendSpend,
    });

    // 3. Micro-Transaction Leakage (< ₹300)
    const microTxns = debits.filter((d) => d.amount > 0 && d.amount <= 300);
    const microTotal = microTxns.reduce((s, d) => s + d.amount, 0);

    patterns.push({
      pattern_type: 'micro_leakage',
      title: 'Micro-Transaction Budget Leakage',
      description: `Small everyday expenses (< ₹300 like canteen/coffee/snacks) accumulated to ₹${microTotal.toLocaleString('en-IN')} across ${microTxns.length} transactions.`,
      detected: microTxns.length >= 3,
      impact_amount: microTotal,
    });

    const detectedPatterns = patterns.filter((p) => p.detected);

    // Auto-trigger awareness notification
    let awarenessNotif = null;
    if (detectedPatterns.length > 0) {
      const mainPattern = detectedPatterns[0];
      awarenessNotif = await this.notificationTools.sendNotification(
        {
          type: 'warning',
          title: `Behavioral Insight: ${mainPattern.title}`,
          message: mainPattern.description,
          trigger_source: 'behaviour',
        },
        ctx
      );
    }

    ctx.logger.info('Analyzed spending behaviour', {
      detected_patterns: detectedPatterns.length,
      post_salary_surge: postSalarySpikeAmount,
      weekend_ratio: weekendRatio,
    });

    return {
      total_analyzed_transactions: txns.length,
      patterns_detected_count: detectedPatterns.length,
      all_patterns: patterns,
      post_salary_spike_amount: postSalarySpikeAmount,
      weekend_spend_ratio_percent: weekendRatio,
      micro_transaction_total: microTotal,
      surfaced_awareness_notification: awarenessNotif,
      natural_language_summary: `Financial Behaviour AI detected ${detectedPatterns.length} key spending habits. Post-salary surge: ₹${postSalarySpikeAmount}. Weekend spend share: ${weekendRatio}%.`,
    };
  }
}
