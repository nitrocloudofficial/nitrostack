import { Module } from '@nitrostack/core';
import { GroupExpensesTools } from './group-expenses.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'group-expenses',
  description: 'Group Expenses Module — Split shared expenses and simplify group debt settlements',
  controllers: [GroupExpensesTools],
  providers: [FinanceStore],
})
export class GroupExpensesModule {}
