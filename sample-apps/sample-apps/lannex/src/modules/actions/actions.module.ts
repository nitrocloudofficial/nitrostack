import { Module } from '@nitrostack/core';
import { ActionsService } from './actions.service.js';
import { ActionsTools } from './actions.tools.js';
import { ActionsPrompts } from './actions.prompts.js';
import { ExpensesModule } from '../expenses/expenses.module.js';
import { SplitterModule } from '../splitter/splitter.module.js';
import { DebtsModule } from '../debts/debts.module.js';
import { PortfolioModule } from '../portfolio/portfolio.module.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  name: 'actions',
  description: 'Financial actions — reminders, investments, and tax savings',
  imports: [ExpensesModule, SplitterModule, DebtsModule, PortfolioModule, DatabaseModule],
  controllers: [ActionsTools, ActionsPrompts],
  providers: [ActionsService],
  exports: [ActionsService]
})
export class ActionsModule {}
