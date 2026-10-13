import { Module } from '@nitrostack/core';
import { RiskTools } from './risk.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'risk',
  description: 'Financial risk signal detection',
  controllers: [RiskTools],
  providers: [FinanceStore],
})
export class RiskModule {}
