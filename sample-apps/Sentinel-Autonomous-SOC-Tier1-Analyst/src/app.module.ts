import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SocModule } from './modules/calculator/calculator.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'soc-tier1-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Autonomous SOC Tier-1 Analyst & Incident Triage Agent',
  imports: [
    ConfigModule.forRoot(),
    SocModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule {}