import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { LabModule } from './modules/lab/lab.module.js';
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
    name: 'lab-report-triage-assistant',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Lab Report Triage Assistant — helps patients in low-resource settings understand lab report urgency',
  imports: [
    ConfigModule.forRoot(),
    LabModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

