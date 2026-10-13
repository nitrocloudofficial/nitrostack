import { Module } from '@nitrostack/core';
import { ExpensesService } from './expenses.service.js';
import { ExpensesTools } from './expenses.tools.js';
import { ExpensesResources } from './expenses.resources.js';
import { ExpensesPrompts } from './expenses.prompts.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  name: 'expenses',
  description: 'Expense tracking, spending analysis, and financial insights',
  imports: [DatabaseModule],
  providers: [ExpensesService],
  exports: [ExpensesService],
  controllers: [ExpensesTools, ExpensesResources, ExpensesPrompts]
})
export class ExpensesModule {}
