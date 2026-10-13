import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ClaimsModule } from './modules/claims/claims.module.js';
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
    name: 'claim-navigator',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Claim Navigator — MCP server for deceased asset claims in India',
  imports: [
    ConfigModule.forRoot(),
    ClaimsModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
