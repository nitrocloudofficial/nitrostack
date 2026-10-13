import { Module } from '@nitrostack/core';
import { HealthScoreTools } from './health-score.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'health-score',
  description: 'Financial health score computation',
  controllers: [HealthScoreTools],
  providers: [FinanceStore],
})
export class HealthScoreModule {}
