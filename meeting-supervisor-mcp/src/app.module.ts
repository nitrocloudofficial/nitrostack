import { McpApp, Module } from '@nitrostack/core';
import { ConfigModule } from 'nitrostack/config';
import { JWTModule } from 'nitrostack/jwt';

import { DatabaseService } from './services/database.service.js';

import { MeetingsModule } from './modules/meetings/meetings.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { BrainModule } from './modules/brain/brain.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';

@McpApp({
  server: {
    name: 'meeting-supervisor',
    version: '0.1.0',
    description:
      'Meeting Supervisor — records, analyzes, and acts on meeting data: transcription, keynote extraction, task assignment, and calendar sync.'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  imports: [
    ConfigModule.forRoot(),
    JWTModule.forRoot(),
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
