import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { ProcurementModule } from './modules/procurement/procurement.module.js';
import { ApprovalModule } from "./modules/approval/approval.module.js";

/**
 * Root Application Module
 *
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'hospital-operations-server',
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
    PharmacyModule,
    ProcurementModule,
    ApprovalModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}