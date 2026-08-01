import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ValidationModule } from './modules/validation/validation.module.js';
import { ElicitationModule } from './modules/elicitation/elicitation.module.js';
import { CodificationModule } from './modules/codification/codification.module.js';
import { ExtractionModule } from './modules/extraction/extraction.module.js';
import { ExplainabilityModule } from './modules/explainability/explainability.module.js';
import { MentorModule } from './modules/mentor/mentor.module.js';
import { DatasetModule } from './modules/dataset/dataset.module.js';
import { MasterModule } from './modules/master/master.module.js';
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
    name: 'continuum-forge',
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
    ValidationModule,
    ElicitationModule,
    CodificationModule,
    ExtractionModule,
    ExplainabilityModule,
    MentorModule,
    DatasetModule,
    MasterModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

