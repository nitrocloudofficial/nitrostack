import { Module } from '@nitrostack/core';
import { PlannerTools } from './planner.tools.js';

@Module({
  name: 'planner',
  description: 'Study planning, roadmap generation, and task management',
  controllers: [PlannerTools]
})
export class PlannerModule {}
