import { Module } from '@nitrostack/core';
import { PlannerService } from './planner.service.js';
import { FinanceStore } from '../../services/finance-store.service.js';
import { DecisionModule } from '../decision/decision.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { ReflectionModule } from '../reflection/reflection.module.js';

@Module({
  name: 'planner',
  description: 'Master Agentic AI Planner Module for FinPilot AI',
  imports: [DecisionModule, WorkflowModule, ReflectionModule],
  providers: [FinanceStore, PlannerService],
  exports: [PlannerService],
})
export class PlannerModule {}
