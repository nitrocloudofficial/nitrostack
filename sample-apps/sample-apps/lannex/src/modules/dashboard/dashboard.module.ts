import { Module } from '@nitrostack/core';
import { DashboardService } from './dashboard.service.js';
import { DashboardTools } from './dashboard.tools.js';
import { DashboardResources } from './dashboard.resources.js';
import { DashboardPrompts } from './dashboard.prompts.js';
import { ExpensesModule } from '../expenses/expenses.module.js';
import { ActionsModule } from '../actions/actions.module.js';
import { PortfolioModule } from '../portfolio/portfolio.module.js';
import { DebtsModule } from '../debts/debts.module.js';

@Module({
  name: 'dashboard',
  description: 'Financial dashboard — money summary, quick actions, and investment overview',
  imports: [ExpensesModule, ActionsModule, PortfolioModule, DebtsModule],
  providers: [DashboardService],
  exports: [DashboardService],
  controllers: [DashboardTools, DashboardResources, DashboardPrompts],
})
export class DashboardModule {}
