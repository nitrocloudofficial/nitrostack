import { Module } from '@nitrostack/core';
import { DecisionService } from './decision.service.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'decision',
  description: 'Internal Business Decision Module for FinPilot AI',
  providers: [FinanceStore, DecisionService],
  exports: [DecisionService],
})
export class DecisionModule {}
