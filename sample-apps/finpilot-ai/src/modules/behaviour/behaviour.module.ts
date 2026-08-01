import { Module } from '@nitrostack/core';
import { BehaviourTools } from './behaviour.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'behaviour',
  description: 'Financial Behaviour AI — Detect psychological spending patterns correlated with triggers',
  controllers: [BehaviourTools],
  providers: [FinanceStore],
})
export class BehaviourModule {}
