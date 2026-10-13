import { Module } from '@nitrostack/core';
import { WorkflowService } from './workflow.service.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'workflow',
  description: 'Internal Sequential Workflow Execution Module for FinPilot AI',
  providers: [FinanceStore, WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
