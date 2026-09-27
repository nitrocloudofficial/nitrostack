import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { HealthPassModule } from './modules/healthpass/healthpass.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { initializeFixtures } from './fixtures/init.js';

// Initialize mock data fixtures
initializeFixtures();

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'healthpass-lite',
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
    AuthModule,
    CalculatorModule,
    HealthPassModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
