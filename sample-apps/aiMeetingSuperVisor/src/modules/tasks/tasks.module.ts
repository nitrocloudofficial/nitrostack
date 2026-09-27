import { Module } from '@nitrostack/core';
import { TasksTools } from './tasks.tools.js';
import { TasksService } from './tasks.service.js';

@Module({
  name: 'tasks',
  description: 'Task assignment and accept/deny workflow',
  controllers: [TasksTools],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
