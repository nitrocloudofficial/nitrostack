
// src/app.module.ts

import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AuditModule } from './modules/audit/audit.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — VeriCite
 *
 * Bootstraps the MCP server and composes the feature module graph.
 * The calculator scaffold module has been removed from the surface;
 * AuditModule is the sole feature module.
 *
 * To temporarily restore the calculator reference module, re-add:
 *   import { CalculatorModule } from './modules/calculator/calculator.module.js';
 * and include `CalculatorModule` in the imports array below.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'vericite',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'VeriCite — autonomous citation integrity auditor',
  imports: [
    ConfigModule.forRoot(),
    AuditModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck
  ]
})
export class AppModule { }
