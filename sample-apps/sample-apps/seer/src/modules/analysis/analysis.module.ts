import { Module } from '@nitrostack/core';
import { DatasetsModule } from '../datasets/datasets.module.js';
import { MlClientModule } from '../ml-client/ml-client.module.js';
import { AnalysisPrompts } from './analysis.prompts.js';
import { AnalysisService } from './analysis.service.js';
import { AnalysisTools } from './analysis.tools.js';
import { PlanTokenService } from './plan-token.service.js';

@Module({
  name: 'analysis',
  description: 'Deterministic analysis-plan validation and stateless approval tokens.',
  imports: [DatasetsModule, MlClientModule],
  controllers: [AnalysisTools, AnalysisPrompts],
  providers: [AnalysisService, PlanTokenService],
  exports: [AnalysisService, PlanTokenService],
})
export class AnalysisModule {}
