import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { FoodModule } from './modules/food/food.module.js';
import { MedicalModule } from './modules/medical/medical.module.js';
import { GrowthModule } from './modules/growth/growth.module.js';
import { SupervisorModule } from './modules/supervisor/supervisor.module.js';
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
    name: 'nutrikids-mcp-server',
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
    FoodModule,
    MedicalModule,
    GrowthModule,
    SupervisorModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
