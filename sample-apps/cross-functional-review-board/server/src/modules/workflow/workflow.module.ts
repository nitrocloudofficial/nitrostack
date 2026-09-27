import { Module } from '@nitrostack/core';
import { WorkflowTools } from './workflow.tools.js';

@Module({
  name: 'workflow',
  description: 'Workflow orchestration module for Decision Review Board end-to-end process',
  controllers: [WorkflowTools]
})
export class WorkflowModule {}
