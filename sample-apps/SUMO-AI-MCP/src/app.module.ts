import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SumoModule } from './modules/sumo/sumo.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * Main module that bootstraps the SUMO MCP server.
 * Registers feature modules and system health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'sumo-simulation-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root SUMO Simulation application module',
  imports: [
    ConfigModule.forRoot(),
    SumoModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
