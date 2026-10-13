import { Module } from '@nitrostack/core';
import { HistoryModule } from '../history/history.module.js';
import { MedicationModule } from '../medication/medication.module.js';
import { ResearchModule } from '../research/research.module.js';
import { GapAnalysisModule } from '../gap-analysis/gap-analysis.module.js';
import { ReportModule } from '../report/report.module.js';
import { SupervisorService } from './supervisor.service.js';
import { SupervisorController } from './supervisor.controller.js';
import { LlmProviderService } from './llm-provider.service.js';
import { CopilotOrchestratorService } from './copilot-orchestrator.service.js';
import { AgentRegistryService } from './agent-registry.js';

@Module({
  name: 'supervisor',
  description: 'Clinical Supervisor & Multi-Agent Orchestrator Module',
  imports: [
    HistoryModule,
    MedicationModule,
    ResearchModule,
    GapAnalysisModule,
    ReportModule
  ],
  controllers: [SupervisorController],
  providers: [SupervisorService, LlmProviderService, CopilotOrchestratorService, AgentRegistryService],
  exports: [SupervisorService, LlmProviderService, CopilotOrchestratorService, AgentRegistryService]
})
export class SupervisorModule {}
