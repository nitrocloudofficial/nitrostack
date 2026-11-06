import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { IntakeModule } from './modules/intake/intake.module.js';
import { AssessmentModule } from './modules/assessment/assessment.module.js';
import { PlanningModule } from './modules/planning/planning.module.js';
import { FeedsModule } from './modules/feeds/feeds.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { VerifyModule } from './modules/verify/verify.module.js';
import { CloudModule } from './modules/cloud/cloud.module.js';
import { PromptsModule } from './modules/prompts/prompts.module.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'metamorph-mcp',
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
    IntakeModule,
    AssessmentModule,
    PlanningModule,
    FeedsModule,
    ReportModule,
    VerifyModule,
    CloudModule,
    PromptsModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

