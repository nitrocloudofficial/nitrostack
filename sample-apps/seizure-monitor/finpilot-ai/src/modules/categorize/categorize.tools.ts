import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

/** Keyword -> category rules. Extend freely for domain matching. */
const CATEGORY_RULES: [string, RegExp][] = [
  ['Food & Dining', /swiggy|zomato|restaurant|cafe|food|dining|starbucks|dominos|mcdonald/i],
  ['Groceries', /grocery|supermarket|bigbasket|reliance fresh|dmart|grofers/i],
  ['Transport', /uber|ola|lyft|fuel|petrol|diesel|metro|bus fare|taxi|parking/i],
  ['Shopping', /amazon|flipkart|myntra|shopping|mall|store/i],
  ['Bills & Utilities', /electricity|water bill|gas bill|internet|broadband|mobile recharge|utility/i],
  ['Rent & Housing', /rent|landlord|maintenance fee|housing society/i],
  ['Entertainment', /netflix|spotify|prime video|hotstar|movie|cinema|game|bookmyshow/i],
  ['Health', /pharmacy|hospital|doctor|medical|clinic|medicine/i],
  ['Education', /tuition|course fee|udemy|coursera|book store|college fee/i],
  ['Transfers & Income', /salary|stipend|refund|cashback|transfer received/i],
];

function categorize(description: string): string {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(description)) return category;
  }
  return 'Uncategorized';
}

@Injectable({ deps: [FinanceStore] })
export class CategorizeTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'categorize_expenses',
    description:
      'Assign a spending category to every transaction that doesn\'t already have one, using keyword rules (merchant/description matching). Leaves already-categorized transactions untouched.',
    inputSchema: z.object({}),
  })
  async categorizeExpenses(_input: any, ctx: ExecutionContext) {
    const txns = this.store.listTransactions();
    let categorized = 0;
    let uncategorized = 0;

    for (const t of txns) {
      if (t.category) continue;
      const category = categorize(t.description);
      this.store.updateCategory(t.id, category);
      if (category === 'Uncategorized') uncategorized += 1;
      else categorized += 1;
    }

    ctx.logger.info('Categorized expenses', { categorized, uncategorized });

    return {
      total_transactions: txns.length,
      newly_categorized: categorized,
      still_uncategorized: uncategorized,
      note:
        uncategorized > 0
          ? `${uncategorized} transaction(s) didn't match any rule and were labeled "Uncategorized" — the assistant can suggest a category for these based on context.`
          : undefined,
    };
  }
}
