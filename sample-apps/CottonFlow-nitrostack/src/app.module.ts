import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module.js';
import { OperationsModule } from './modules/operations/operations.module.js';
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
    name: 'cottonflow-ai',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'CottonFlow AI - Agentic AI Factory Operations Manager for smart textile manufacturing',
  imports: [
    ConfigModule.forRoot(),
    CalculatorModule,
    DiagnosticsModule,
    OperationsModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

