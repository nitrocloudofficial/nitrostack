import { Module } from '@nitrostack/core';
import { PlannerTools } from '../../tools/planner.tool.js';
import { ReadmeTools } from '../../tools/readme.tool.js';
import { CalendarTools } from '../../tools/calendar.tool.js';

@Module({
  name: 'project-pilot',
  description: 'ProjectPilot AI: project planning, task generation, README generation, and calendar scheduling',
  controllers: [PlannerTools, ReadmeTools, CalendarTools]
})
export class ProjectPilotModule {}
