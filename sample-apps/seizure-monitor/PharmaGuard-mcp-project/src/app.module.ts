import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PharmaGuardModule } from './modules/pharma-guard/pharma-guard.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — PharmaGuard AI Medication Safety Copilot
 * 
 * This MCP server provides multi-factor clinical risk analysis tools
 * for medication safety checking: drug interactions, allergies, disease
 * conflicts, age-based dosing, renal adjustment, and more.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'pharma-guard-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'PharmaGuard — AI Medication Safety Copilot',
  imports: [
    ConfigModule.forRoot(),
    PharmaGuardModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
