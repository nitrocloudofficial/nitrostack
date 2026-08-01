import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { ChiefModule } from './modules/chief/chief.module.js';
import { InboxModule } from './modules/inbox/inbox.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { EmailTriageModule } from './modules/emailtriage/emailtriage.module.js';
import { MeetingSchedulerModule } from './modules/meetingscheduler/meetingscheduler.module.js';
import { TaskManagerModule } from './modules/taskmanager/taskmanager.module.js';
import { AuditLogModule } from './modules/auditlog/auditlog.module.js';
import { ApprovalWorkflowModule } from './modules/approvalworkflow/approvalworkflow.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * AI Chief of Staff - An MCP-based multi-agent system that intelligently triages
 * emails, meetings, calendars, and tasks while requiring human approval and
 * maintaining a complete audit trail.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'chiefos-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'AI Chief of Staff - Multi-agent system for email, meeting, and task management',
 imports: [
  ConfigModule.forRoot(),

  CalculatorModule,

  ChiefModule,
  InboxModule,
  CalendarModule,
  EmailTriageModule,
  MeetingSchedulerModule,
  TaskManagerModule,
  AuditLogModule,
  ApprovalWorkflowModule,
],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
