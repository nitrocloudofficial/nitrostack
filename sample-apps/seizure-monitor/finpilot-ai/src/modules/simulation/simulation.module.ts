import { Module } from '@nitrostack/core';
import { SimulationTools } from './simulation.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'simulation',
  description: 'Life Event Simulator ("What-If" Engine) — Simulate financial impact of major life events & cashflow changes',
  controllers: [SimulationTools],
  providers: [FinanceStore],
})
export class SimulationModule {}
