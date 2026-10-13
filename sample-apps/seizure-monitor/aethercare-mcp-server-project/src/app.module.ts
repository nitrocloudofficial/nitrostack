import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AetherCareModule } from './modules/aethercare/aethercare.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module for AetherCare
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'aethercare-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module for AetherCare Agentic MoE Healthcare Navigator',
  imports: [
    ConfigModule.forRoot(),
    AetherCareModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
