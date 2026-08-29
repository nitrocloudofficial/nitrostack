import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 *
 * This is the main module that bootstraps the Predictive Maintenance MCP server.
 * It registers all feature modules and health checks.
 *
 * Currently imports:
 * - ConfigModule: Environment and configuration management
 * - MaintenanceModule: Predictive maintenance tools (Phase 1: ping only)
 * - SystemHealthCheck: Basic system health monitoring
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'predictive-maintenance-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Predictive Maintenance root application module',
  imports: [
    ConfigModule.forRoot(),
    MaintenanceModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
