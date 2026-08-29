import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DowntimeArbiterModule } from './modules/downtimearbiter/downtimearbiter.module.js';
import { NegotiationDashboardTool } from './modules/downtimearbiter/negotiation-dashboard.tool.js';
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
    name: 'downtime-arbiter',
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
    DowntimeArbiterModule
  ],
  providers: [
    NegotiationDashboardTool,
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
