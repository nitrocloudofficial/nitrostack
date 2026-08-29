import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MeetingMindModule } from './modules/meetingmind/meetingmind.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MeetingMind AI MCP server.
 * It registers all feature modules (MeetingMind, Calculator) and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'meetingmind-ai',
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
    MeetingMindModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

