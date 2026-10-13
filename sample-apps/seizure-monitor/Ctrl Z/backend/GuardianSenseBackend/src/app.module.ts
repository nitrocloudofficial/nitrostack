import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { GuardianModule } from './modules/guardian/guardian.module.js';
/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
   name: 'guardiansense-backend',
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
  GuardianModule
],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

