import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import { NotificationTools } from '../notification/notification.tools.js';

@Injectable({ deps: [FinanceStore] })
export class MarketplaceTools {
  private notificationTools: NotificationTools;

  constructor(private store: FinanceStore) {
    this.notificationTools = new NotificationTools(store);
  }

  @Tool({
    name: 'analyze_marketplace_opportunities',
    description:
      'FinPilot Marketplace Intelligence — Scan spending history for student discounts, cashback offers, merchant rewards, and optimal purchase timing recommendations. Auto-surfaces deal alerts via Notification module.',
    inputSchema: z.object({
      category_filter: z
        .string()
        .optional()
        .describe('Optional category filter, e.g. "Food & Dining", "Entertainment", "Shopping"'),
    }),
  })
  async analyzeMarketplaceOpportunities(input: any, ctx: ExecutionContext) {
    const txns = this.store.listTransactions();
    const expenses = txns.filter((t) => t.direction === 'debit');

    // Aggregate spend per category
    const categoryTotals: Record<string, number> = {};
    for (const t of expenses) {
      const cat = t.category ?? 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + t.amount;
    }

    const deals = [
      {
        category: 'Entertainment',
        offer_name: 'Spotify / Apple Music Student Plan',
        description: 'Verify college ID for ₹59/mo rate (50% off standard ₹119/mo plan).',
        estimated_monthly_savings: 60,
        action_url: 'https://spotify.com/student',
        timing_tip: 'Apply before month-end billing cycle.',
      },
      {
        category: 'Food & Dining',
        offer_name: 'Zomato Gold / Swiggy One Student Pass',
        description: 'Get free delivery + 15% extra discount on dining orders over ₹199.',
        estimated_monthly_savings: 350,
        action_url: 'https://zomato.com/gold-student',
        timing_tip: 'Order during 2PM-5PM happy hours for extra ₹40 off.',
      },
      {
        category: 'Bills & Utilities',
        offer_name: 'Amazon Pay UPI / Credit Card Bill Cashback',
        description: 'Pay utility bills via Amazon Pay UPI for 5% flat cashback up to ₹100.',
        estimated_monthly_savings: 75,
        action_url: 'https://amazon.in/pay/utility',
        timing_tip: 'Pay bills between 1st-5th of month for early bird reward scratchcards.',
      },
      {
        category: 'Shopping',
        offer_name: 'Prime Student & Campus Electronics Sale',
        description: '6-month free Amazon Prime Student + 10% instant card cashback on laptops/tablets.',
        estimated_monthly_savings: 500,
        action_url: 'https://amazon.in/prime-student',
        timing_tip: 'Wait for upcoming weekend Student Mega Sale for 12% extra discount.',
      },
    ];

    const matchedOpportunities = deals.filter((d) => {
      if (input.category_filter && d.category.toLowerCase() !== input.category_filter.toLowerCase()) {
        return false;
      }
      return (categoryTotals[d.category] ?? 0) > 0 || !input.category_filter;
    });

    const totalPotentialMonthlySavings = matchedOpportunities.reduce(
      (sum, d) => sum + d.estimated_monthly_savings,
      0
    );

    // Auto-surface top deal via Notification Module
    let dealNotification = null;
    if (matchedOpportunities.length > 0) {
      const topDeal = matchedOpportunities[0];
      dealNotification = await this.notificationTools.sendNotification(
        {
          type: 'interactive',
          title: `Marketplace Deal: ${topDeal.offer_name}`,
          message: `${topDeal.description} Potential savings: ₹${topDeal.estimated_monthly_savings}/mo.`,
          trigger_source: 'marketplace',
        },
        ctx
      );
    }

    ctx.logger.info('Analyzed marketplace opportunities', {
      opportunities: matchedOpportunities.length,
      potentialSavings: totalPotentialMonthlySavings,
    });

    return {
      opportunity_count: matchedOpportunities.length,
      total_potential_monthly_savings: totalPotentialMonthlySavings,
      opportunities: matchedOpportunities,
      surfaced_notification: dealNotification,
      natural_language_tips: `We found ${matchedOpportunities.length} student marketplace deals that could save you up to ₹${totalPotentialMonthlySavings.toLocaleString('en-IN')}/month on your typical purchases!`,
    };
  }
}
