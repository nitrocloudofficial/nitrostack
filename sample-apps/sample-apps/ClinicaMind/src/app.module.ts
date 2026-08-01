import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SupervisorModule } from './modules/supervisor/supervisor.module.js';
import { HistoryModule } from './modules/history/history.module.js';
import { MedicationModule } from './modules/medication/medication.module.js';
import { ResearchModule } from './modules/research/research.module.js';
import { GapAnalysisModule } from './modules/gap-analysis/gap-analysis.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { ToolsModule } from './modules/tools/tools.module.js';
import { ResourcesModule } from './modules/resources/resources.module.js';
import { PromptsModule } from './modules/prompts/prompts.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { HealthModule } from './modules/health/health.module.js';

/**
 * Root Application Module for ClinicaMind
 * 
 * Multi-Agent AI Clinical Decision Support Workspace built with NitroStack MCP.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'clinica-mind-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'clinica-mind',
  description: 'AI Clinical Intelligence & Multi-Agent Decision Support Workspace',
  imports: [
    ConfigModule.forRoot(),
    HistoryModule,
    MedicationModule,
    ResearchModule,
    GapAnalysisModule,
    ReportModule,
    SupervisorModule,
    ToolsModule,
    ResourcesModule,
    PromptsModule,
    TasksModule,
    HealthModule
  ]
})
export class AppModule {}
