import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { GmailModule } from './modules/gmail/gmail.module.js';
import { SlackModule } from './modules/slack/slack.module.js';
import { JiraModule } from './modules/jira/jira.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { GithubModule } from './modules/github/github.module.js';
import { ContextModule } from './modules/context/context.module.js';
import { PrioritizerModule } from './modules/prioritizer/prioritizer.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'notification-prioritizer',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    CalculatorModule,
    GmailModule,
    SlackModule,
    JiraModule,
    CalendarModule,
    GithubModule,
    ContextModule,
    PrioritizerModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

