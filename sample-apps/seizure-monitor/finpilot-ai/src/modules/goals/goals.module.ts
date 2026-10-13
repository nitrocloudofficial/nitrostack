import { Module } from '@nitrostack/core';
import { GoalsTools } from './goals.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'goals',
  description: 'Financial goal tracking and planning',
  controllers: [GoalsTools],
  providers: [FinanceStore],
})
export class GoalsModule {}
