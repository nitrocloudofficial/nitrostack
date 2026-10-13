import { ResourceDecorator as Resource, Injectable, ExecutionContext } from '@nitrostack/core';
import { DashboardService, MoneySummary } from './dashboard.service.js';
import { DashboardTools } from './dashboard.tools.js';

@Injectable({ deps: [DashboardService, DashboardTools] })
export class DashboardResources {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardTools: DashboardTools
  ) {}

  @Resource({
    uri: 'dashboard://summary',
    name: 'Dashboard Money Summary',
    description: 'Current financial snapshot including balance, owed amounts, and investment growth',
    mimeType: 'application/json',
    examples: {
      response: {
        balance: 4823.67,
        owed: 312.50,
        investmentGrowth: 8.34,
        quickActions: [
          { label: 'Log Expense', action: 'log_expense' }
        ]
      }
    }
  })
  async getSummary(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching dashboard summary via resource');

    const summary = await this.dashboardTools.getMoneySummary({}, ctx);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(summary, null, 2)
      }]
    };
  }
}
