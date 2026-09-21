import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { GithubModule } from './modules/github/github.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { DriveModule } from './modules/drive/drive.modules.js';
import { GmailModule } from './modules/gmail/gmail.module.js';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';
import { JiraModule } from './modules/jira/jira.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';


/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'calculator-server',
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
    GithubModule,
    DriveModule,
    GmailModule,
    KnowledgeModule,
    JiraModule,
    CalendarModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}