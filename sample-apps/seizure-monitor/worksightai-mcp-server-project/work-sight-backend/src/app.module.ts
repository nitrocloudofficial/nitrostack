import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { WorkSightModule } from './modules/worksight/worksight.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { ApiHealthCheck } from './health/api.health.js';

/**
 * Root Application Module
 * 
 * Clean entry point bootstrapping Work Sight AI MCP server.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'work-sight-backend',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Work Sight AI Smart Workplace Intelligence Server',
  imports: [
    ConfigModule.forRoot(),
    WorkSightModule,
  ],
  providers: [
    SystemHealthCheck,
    ApiHealthCheck,
  ]
})
export class AppModule {}
