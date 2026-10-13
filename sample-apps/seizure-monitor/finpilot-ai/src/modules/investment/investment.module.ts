import { Module } from '@nitrostack/core';
import { InvestmentTools } from './investment.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'investment',
  description: 'Educational surplus allocation suggestions',
  controllers: [InvestmentTools],
  providers: [FinanceStore],
})
export class InvestmentModule {}
