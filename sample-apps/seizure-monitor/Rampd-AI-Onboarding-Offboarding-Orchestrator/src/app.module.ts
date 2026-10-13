import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { EquipmentModule } from './modules/equipment/equipment.module.js';
import { WorkspaceModule } from './modules/workspace/workspace.module.js';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'calculator-server',
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
    IdentityModule,
    EquipmentModule,
    WorkspaceModule,
    OrchestratorModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

