import { Module } from '@nitrostack/core';
import { ClinicalToolsService } from './clinical.tools.js';
import { HistoryModule } from '../history/history.module.js';
import { MedicationModule } from '../medication/medication.module.js';
import { ResearchModule } from '../research/research.module.js';
import { GapAnalysisModule } from '../gap-analysis/gap-analysis.module.js';
import { ReportModule } from '../report/report.module.js';
import { SupervisorModule } from '../supervisor/supervisor.module.js';

@Module({
  name: 'clinical-tools',
  description: 'Module containing 12 clinical MCP tools for EHR data retrieval, diagnosis, guidelines, and report generation.',
  imports: [
    HistoryModule,
    MedicationModule,
    ResearchModule,
    GapAnalysisModule,
    ReportModule,
    SupervisorModule
  ],
  controllers: [ClinicalToolsService],
  providers: [ClinicalToolsService],
  exports: [ClinicalToolsService]
})
export class ToolsModule {}
