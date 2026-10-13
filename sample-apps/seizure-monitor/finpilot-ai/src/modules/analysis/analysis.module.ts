import { Module } from '@nitrostack/core';
import { AnalysisTools } from './analysis.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'analysis',
  description: 'Spending analysis and trend calculations',
  controllers: [AnalysisTools],
  providers: [FinanceStore],
})
export class AnalysisModule {}
