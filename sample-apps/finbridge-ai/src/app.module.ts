import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { EligibilityModule } from './modules/eligibility/eligibility.module.js';
import { ExplainModule } from './modules/explain/explain.module.js';
import { GrowthModule } from './modules/growth/growth.module.js';
import { FinancialHealthModule } from './modules/financial-health/financial-health.module.js';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';
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
    name: 'finbridge-ai',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: "Verifiable financial ground truth for India's public schemes and mutual funds",
  imports: [
    ConfigModule.forRoot(),
    EligibilityModule,
    ExplainModule,
    GrowthModule,
    FinancialHealthModule,
    KnowledgeModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

