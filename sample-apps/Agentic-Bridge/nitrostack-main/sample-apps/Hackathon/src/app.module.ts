import { McpApp, Module, ConfigModule } from '@nitrostack/core';

import { BoardroomModule } from './modules/boardroom/boardroom.module.js';
import { IncidentModule } from './modules/incident/incident.module.js';
import { SecurityModule } from './modules/security/security.module.js';
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
    name: 'command-center',
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
    BoardroomModule,
    IncidentModule,
    SecurityModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

