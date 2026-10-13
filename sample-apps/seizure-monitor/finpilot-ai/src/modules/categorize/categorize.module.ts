import { Module } from '@nitrostack/core';
import { CategorizeTools } from './categorize.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'categorize',
  description: 'Keyword-based transaction categorization',
  controllers: [CategorizeTools],
  providers: [FinanceStore],
})
export class CategorizeModule {}
