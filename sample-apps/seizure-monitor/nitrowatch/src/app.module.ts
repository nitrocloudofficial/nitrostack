import { McpApp, Module, ConfigModule } from '@nitrostack/core';

import { SystemHealthCheck } from './health/system.health.js';
import { NitroWatchModule } from './modules/nitrowatch/nitrowatch.module.js';
/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'nitrowatch',        // ← change from 'calculator-server'
    version: '1.0.0',
  },
  logging: { level: 'info' },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    NitroWatchModule,
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

