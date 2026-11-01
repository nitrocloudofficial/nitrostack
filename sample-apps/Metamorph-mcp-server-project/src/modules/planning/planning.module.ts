import { Module } from '@nitrostack/core';
import { PlanningTools } from './planning.tools.js';

@Module({
  name: 'planning',
  description: 'Plan a staged modernization and preview the exact file changes for each stage',
  controllers: [PlanningTools]
})
export class PlanningModule {}
