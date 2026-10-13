import { ResourceDecorator as Resource, Injectable, ExecutionContext } from '@nitrostack/core';
import { ExpensesService } from './expenses.service.js';

@Injectable({ deps: [ExpensesService] })
export class ExpensesResources {
  constructor(private readonly expensesService: ExpensesService) {}

  @Resource({
    uri: 'expenses://transactions',
    name: 'Expense Transactions',
    description: 'List of all recorded expense transactions',
    mimeType: 'application/json',
    examples: {
      response: {
        transactions: [
          { id: '1', amount: 45.99, merchant: 'Whole Foods', category: 'groceries', timestamp: '2026-07-20T10:30:00Z' },
          { id: '2', amount: 12.50, merchant: 'Starbucks', category: 'coffee', timestamp: '2026-07-21T08:15:00Z' }
        ],
        count: 2
      }
    }
  })
  async getTransactions(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching expense transactions via resource endpoint');

    const { totalSpent, transactionCount } = await this.expensesService.getBalanceAndTotals();
    const summary = await this.expensesService.getSummary('month');

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          totalSpent,
          transactionCount,
          categories: summary.categories,
          monthlyTotal: summary.total
        }, null, 2)
      }]
    };
  }
}
