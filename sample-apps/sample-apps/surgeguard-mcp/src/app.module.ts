import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SurgeGuardModule } from './modules/surgeguard/surgeguard.module.js';
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
    name: 'care360-surge-command',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Care360 Surge Command policy-gated hospital operations server',
  imports: [
    ConfigModule.forRoot(),
    SurgeGuardModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
