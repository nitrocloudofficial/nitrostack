import { Module } from '@nitrostack/core';
import { SchedulingTools } from './scheduling.tools.js';
import { SchedulingResources } from './scheduling.resources.js';

@Module({
  name: 'scheduling',
  description: 'Meeting scheduling — find available slots and book meetings',
  controllers: [SchedulingTools, SchedulingResources],
})
export class SchedulingModule {}
