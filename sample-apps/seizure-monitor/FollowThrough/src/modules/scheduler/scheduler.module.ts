import { Module } from '@nitrostack/core';
import { SchedulerService } from './scheduler.service.js';
import { SchedulerTools } from './scheduler.tools.js';

@Module({
  name: 'scheduler',
  description: 'Polling + decision state machine (open -> nudged_1 -> nudged_2 -> escalated)',
  controllers: [SchedulerTools],
  providers: [SchedulerService],
})
export class SchedulerModule {}
