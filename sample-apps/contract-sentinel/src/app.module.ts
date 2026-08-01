import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IntakeModule } from './modules/intake/intake.module.js';
import { SentinelModule } from './modules/sentinel/sentinel.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Contract Sentinel — root application module.
 *
 * intake   → company profile context, contract ingestion and clause parsing
 * sentinel → autonomous agent loop, risk scoring, portfolio review + resource
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'contract-sentinel',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Contract Sentinel root application module',
  imports: [
    ConfigModule.forRoot(),
    IntakeModule,
    SentinelModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
