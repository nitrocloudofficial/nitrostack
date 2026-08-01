import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { LifelineModule } from './modules/lifeline/lifeline.module.js';
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
    name: 'lifeline-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Lifeline emergency dispatch root module',
  imports: [
    ConfigModule.forRoot(),
    LifelineModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

