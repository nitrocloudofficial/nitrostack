import { McpApp, Module, ConfigModule } from '@nitrostack/core';

import { DatabaseService } from './services/database.service.js';

import { MeetingsModule } from './modules/meetings/meetings.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { BrainModule } from './modules/brain/brain.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'meeting-supervisor',
    version: '0.1.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description:
    'Meeting Supervisor MCP server for meeting analysis, task assignment, calendar sync, and agent workflows.',
  imports: [
    ConfigModule.forRoot(),
    MeetingsModule,
    TasksModule,
    CalendarModule,
    BrainModule,
    AgentsModule
  ],
  providers: [DatabaseService],
  controllers: []
})
export class AppModule {}
