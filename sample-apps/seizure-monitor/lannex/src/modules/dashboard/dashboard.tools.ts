import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z, ControllerDecorator as Controller } from '@nitrostack/core';
import { DashboardService } from './dashboard.service.js';
import { ExpensesService } from '../expenses/expenses.service.js';
import { ActionsService } from '../actions/actions.service.js';
import { PortfolioService } from '../portfolio/portfolio.service.js';
import { DebtsService } from '../debts/debts.service.js';

@Injectable({ deps: [DashboardService, ExpensesService, ActionsService, PortfolioService, DebtsService] })
@Controller('dashboard')
export class DashboardTools {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly expensesService: ExpensesService,
    private readonly actionsService: ActionsService,
    private readonly portfolioService: PortfolioService,
    private readonly debtsService: DebtsService,
  ) {
    this.getMoneySummary = this.getMoneySummary.bind(this);
  }

  @Tool({
    name: 'get_money_summary',
    description: 'Get an overview of the user\'s current financial snapshot: wallet balance, money owed by friends, investment growth percentage, and quick-action shortcuts.',
    inputSchema: z.object({
      monthly_budget: z.number().optional().describe('Optional monthly budget (defaults to 5000 or env MONTHLY_BUDGET)'),
      investment_growth: z.number().optional().describe('Optional investment growth percentage (defaults to portfolio growth or env INVESTMENT_GROWTH)')
    }),
    examples: {
      request: {},
      response: {
        balance: 4823.67,
        owed: 312.50,
        investmentGrowth: 8.34,
        quickActions: [
          { label: 'Log Expense', action: 'log_expense' },
          { label: 'Split Bill', action: 'split_bill' },
          { label: 'Remind Friend', action: 'remind_friend' },
          { label: 'View Investments', action: 'view_investments' },
        ],
      },
    },
  })
  @Widget('money-summary')
  async getMoneySummary(input: { monthly_budget?: number; investment_growth?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching money summary');

    const monthlyBudget = input?.monthly_budget ?? parseFloat(process.env.MONTHLY_BUDGET || '5000');
    const growth = input?.investment_growth ?? (
      process.env.INVESTMENT_GROWTH ? parseFloat(process.env.INVESTMENT_GROWTH) : (await this.portfolioService.getPortfolio()).totalReturnPct
    );

    // Compute real balance
    const monthExpenses = await this.expensesService.getSummary('month');
    const balance = Math.round((monthlyBudget - monthExpenses.total) * 100) / 100;

    // Get real debts from DebtsService
    const allDebts = await this.debtsService.getDebts();
    const owed = allDebts
      .filter(d => d.type === 'owe_me' && d.status === 'pending')
      .reduce((sum, d) => sum + d.amount, 0);

    const portfolio = await this.portfolioService.getPortfolio();
    const recentTransactions = await this.expensesService.getRecentTransactions(10);
    const incomeVsOutgoing = await this.expensesService.getIncomeVsOutgoing('month');

    return this.dashboardService.buildSummary(
      balance,
      owed,
      growth,
      portfolio,
      allDebts,
      recentTransactions,
      incomeVsOutgoing
    );
  }
}
