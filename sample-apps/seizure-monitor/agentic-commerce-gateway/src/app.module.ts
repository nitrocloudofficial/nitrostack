import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { GatewayModule } from './modules/gateway/gateway.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Agentic Commerce Gateway — root module.
 *
 * Sits in a seller's checkout: screens the buying agent before a sale settles,
 * and verifies every sales receipt against the on-chain settlement record.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'agentic-commerce-gateway',
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
    GatewayModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
