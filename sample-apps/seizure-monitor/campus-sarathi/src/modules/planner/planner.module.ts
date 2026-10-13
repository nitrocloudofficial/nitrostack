import { Module } from '@nitrostack/core';
import { PlannerTools } from './planner.tools.js';
import { PlannerPrompts } from './planner.prompts.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { GmailModule } from '../gmail/gmail.module.js';
import { TodoModule } from '../todo/todo.module.js';
import { CampusInfoModule } from '../campus-info/campus-info.module.js';

@Module({
  name: 'planner',
  description: 'AI orchestrator for daily and weekly planning',
  controllers: [PlannerTools, PlannerPrompts],
  providers: [],
  imports: [CalendarModule, GmailModule, TodoModule, CampusInfoModule]
})
export class PlannerModule {}
