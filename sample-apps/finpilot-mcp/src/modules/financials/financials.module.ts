import { Module } from '@nitrostack/core';
import { FinancialTools } from './financials.tools.js';

@Module({
  name: 'financials',
  controllers: [FinancialTools],
})
export class FinancialModule {}
