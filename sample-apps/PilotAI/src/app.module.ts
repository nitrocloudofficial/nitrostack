import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ProjectPilotModule } from './modules/project-pilot/project-pilot.module.js';
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
    name: 'projectpilot-ai-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'ProjectPilot AI - root application module',
  imports: [
    ConfigModule.forRoot(),
    ProjectPilotModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

