import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ResearchModule } from './modules/research.module.js';
import { CorrelationModule } from './modules/correlation.module.js';
import { EvidenceModule } from './modules/evidence.module.js';
import { KnowledgeGraphModule } from './modules/knowledge-graph.module.js';
import { PlannerModule } from './modules/planner.module.js';
import { WorkflowModule } from './modules/workflow.module.js';
import { WorkspaceModule } from './modules/workspace.module.js';
import { CopilotModule } from './modules/copilot.module.js';
import { ReportModule } from './modules/report.module.js';
import { SettingsModule } from './modules/settings.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'Planner Agent',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Invenio Root Application Module',
  imports: [
    ConfigModule.forRoot(),
    ResearchModule,
    CorrelationModule,
    EvidenceModule,
    KnowledgeGraphModule,
    PlannerModule,
    WorkflowModule,
    WorkspaceModule,
    CopilotModule,
    ReportModule,
    SettingsModule
  ]
})
export class AppModule {}
