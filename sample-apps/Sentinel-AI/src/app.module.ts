import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DigitalEvidenceModule } from './modules/digital-evidence/digital-evidence.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * Sentinel AI – Digital Evidence Integrity Platform
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'sentinel-ai-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Sentinel AI Root Application Module',
  imports: [
    ConfigModule.forRoot(),
    DigitalEvidenceModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}


