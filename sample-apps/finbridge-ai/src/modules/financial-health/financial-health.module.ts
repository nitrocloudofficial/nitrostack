import { Module } from '@nitrostack/core';
import { FinancialHealthTools } from './financial-health.tools.js';

@Module({
  name: 'financial-health',
  description: 'Financial health scoring',
  controllers: [FinancialHealthTools]
})
export class FinancialHealthModule {}
