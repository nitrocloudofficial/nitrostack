import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { GuardianModule } from './modules/guardian/guardian.module.js';
import { TriageModule } from './modules/triage/triage.module.js';
import { HealthIntelligenceModule } from './modules/health/health.module.js';
import { PipelineModule } from './modules/pipeline/pipeline.module.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the CAREBRIDGE AI MCP server.
 * It registers all feature modules and health checks.
 * 
 * Milestone 3: PipelineModule added to wire the full intelligence pipeline.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'carebridge-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'CAREBRIDGE AI Root application module',
  imports: [
    ConfigModule.forRoot(),
    GuardianModule,
    TriageModule,
    HealthIntelligenceModule,
    PipelineModule,
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
