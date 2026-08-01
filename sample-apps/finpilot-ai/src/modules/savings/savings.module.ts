import { Module } from '@nitrostack/core';
import { SavingsTools } from './savings.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'savings',
  description: 'Discretionary spending trim suggestions',
  controllers: [SavingsTools],
  providers: [FinanceStore],
})
export class SavingsModule {}
