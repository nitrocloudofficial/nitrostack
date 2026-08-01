import { PromptDecorator as Prompt, Injectable, ExecutionContext } from '@nitrostack/core';
import { ExpensesService } from './expenses.service.js';

@Injectable({ deps: [ExpensesService] })
export class ExpensesPrompts {
  constructor(private readonly expensesService: ExpensesService) {}

  @Prompt({
    name: 'expense_insights_assistant',
    description: 'Generate natural-language insights about spending patterns',
    arguments: [
      {
        name: 'timeframe',
        description: 'Timeframe for analysis: week or month',
        required: false
      }
    ]
  })
  async getInsights(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating expense insights prompt', { timeframe: args.timeframe });

    const timeframe = args.timeframe === 'month' ? 'month' : 'week';
    const summary = await this.expensesService.getSummary(timeframe);
    const { totalSpent, transactionCount } = await this.expensesService.getBalanceAndTotals();

    const narrative = this.generateNarrative(timeframe, summary, totalSpent, transactionCount);

    return [
      {
        role: 'user' as const,
        content: `Give me insights about my spending this ${timeframe}.`
      },
      {
        role: 'assistant' as const,
        content: narrative
      }
    ];
  }

  private generateNarrative(
    timeframe: string,
    summary: { categories: Record<string, number>; total: number; count: number },
    totalSpent: number,
    transactionCount: number
  ): string {
    const { categories, total, count } = summary;

    // Find top category
    let topCategory = 'uncategorized';
    let topAmount = 0;
    for (const [cat, amount] of Object.entries(categories)) {
      if (amount > topAmount) {
        topAmount = amount;
        topCategory = cat;
      }
    }

    const categoryCount = Object.keys(categories).length;
    const avgTransaction = count > 0 ? (total / count).toFixed(2) : '0';

    let insights = `**Your Spending This ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}**\n\n`;
    insights += `You spent **₹${total.toFixed(2)}** across **${count} transactions** this ${timeframe}.\n\n`;

    if (topAmount > 0) {
      const percentage = ((topAmount / total) * 100).toFixed(0);
      insights += `**Top Category:** ${topCategory} (₹${topAmount.toFixed(2)} - ${percentage}% of spending)\n\n`;
    }

    insights += `**Category Breakdown:**\n`;
    for (const [cat, amount] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
      insights += `- ${cat}: ₹${amount.toFixed(2)}\n`;
    }

    insights += `\n**Quick Stats:**\n`;
    insights += `- Average transaction: ₹${avgTransaction}\n`;
    insights += `- Categories used: ${categoryCount}\n`;
    insights += `- All-time total: ₹${totalSpent.toFixed(2)} (${transactionCount} transactions)\n\n`;

    // Add actionable insight
    if (topCategory === 'dining' || topCategory === 'coffee') {
      insights += `**Insight:** Your ${topCategory} spending stands out. Consider meal prepping to save money!`;
    } else if (topCategory === 'transport') {
      insights += `**Insight:** Transport costs are high. Could carpooling or public transit help?`;
    } else if (topCategory === 'entertainment') {
      insights += `**Insight:** Entertainment is your top expense. Check for subscription overlaps!`;
    } else {
      insights += `**Insight:** Your spending looks balanced across categories. Keep tracking!`;
    }

    return insights;
  }
}
