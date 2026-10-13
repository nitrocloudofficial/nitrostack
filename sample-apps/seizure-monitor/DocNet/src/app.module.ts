import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { TriageModule } from './modules/triage/triage.module.js';
import { HealthModule } from './health/health.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { initEmbeddingModel } from './health/embedding.util.js';

// Eagerly warm up the transformer model during NitroStack bootstrap
initEmbeddingModel().catch(err => console.warn('Eager embedding model init warning:', err));

/**
 * Root Application Module
 * 
 * Registers feature modules and health checks for NitroStack MCP Server.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'nitrostack-local',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'NitroStack Health Triage Server',
  imports: [
    ConfigModule.forRoot(),
    CalculatorModule,
    TriageModule,
    HealthModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
