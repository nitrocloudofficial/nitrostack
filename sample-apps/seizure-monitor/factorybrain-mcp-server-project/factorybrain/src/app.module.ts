import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { MachineModule } from './modules/machine/machine.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { PurchaseModule } from './modules/purchase/purchase.module.js';
import { ProductionModule } from './modules/production/production.module.js';
import { ManagerModule } from './modules/manager/manager.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { MonitoringModule } from './modules/monitoring/monitoring.module.js';
import { FactoryBrainContextModule } from './context.module.js';
import { OrchestratorModule } from './orchestrator/orchestrator.module.js';
import { serverConfig } from './config/server.config.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'factorybrain-server',
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
    OAuthModule.forRoot({
      resourceUri: process.env.FACTORYBRAIN_RESOURCE_URI ?? `${serverConfig.origin}/mcp`,
      authorizationServers: [process.env.FACTORYBRAIN_AUTH_SERVER ?? serverConfig.origin],
      required: process.env.OAUTH_REQUIRED === 'true',
    }),
    FactoryBrainContextModule,
    MachineModule,
    MaintenanceModule,
    InventoryModule,
    PurchaseModule,
    ProductionModule,
    ManagerModule,
    NotificationModule,
    MonitoringModule,
    OrchestratorModule,
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
