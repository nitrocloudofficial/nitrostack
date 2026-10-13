import { Module } from '@nitrostack/core';
import { ReflectionService } from './reflection.service.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'reflection',
  description: 'Internal Reflection & Evaluation Module for FinPilot AI',
  providers: [FinanceStore, ReflectionService],
  exports: [ReflectionService],
})
export class ReflectionModule {}
