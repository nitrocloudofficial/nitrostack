import { Module } from '@nitrostack/core';
import { InsightsTools } from './insights.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'insights',
  description: 'Recurring charges detection and purchase impact simulation',
  controllers: [InsightsTools],
  providers: [FinanceStore],
})
export class InsightsModule {}
