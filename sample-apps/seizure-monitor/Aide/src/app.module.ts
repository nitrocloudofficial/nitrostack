import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { DelegationModule } from './modules/delegation/delegation.module.js';
import { SchedulingModule } from './modules/scheduling/scheduling.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { CommsModule } from './modules/comms/comms.module.js';
import { RouterModule } from './modules/router/router.module.js';   // ← ADD THIS LINE
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
    name: 'aide-router-server',          // ← changed name
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
    CalculatorModule,
    DelegationModule,
    SchedulingModule,
    AdminModule,
    CommsModule,
    RouterModule                     // ← ADD THIS LINE
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule { }
