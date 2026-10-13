import { Module } from '@nitrostack/core';
import { ClinicalTasksService } from './clinical.tasks.js';

@Module({
  name: 'clinical-tasks',
  description: 'Module providing 4 long-running MCP tasks for consultation evaluation, report generation, research evidence, and risk analysis.',
  controllers: [ClinicalTasksService],
  providers: [ClinicalTasksService],
  exports: [ClinicalTasksService]
})
export class TasksModule {}
