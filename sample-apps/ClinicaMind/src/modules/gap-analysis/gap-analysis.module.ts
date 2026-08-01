import { Module } from '@nitrostack/core';
import { GapAnalysisService } from './gap-analysis.service.js';
import { GapAnalysisController } from './gap-analysis.controller.js';

@Module({
  name: 'gap-analysis',
  description: 'Clinical Gap Analysis & Risk Factor Identification Agent Module',
  controllers: [GapAnalysisController],
  providers: [GapAnalysisService],
  exports: [GapAnalysisService]
})
export class GapAnalysisModule {}
