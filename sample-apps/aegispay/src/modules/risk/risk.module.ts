import { Module } from '@nitrostack/core';
import { RiskTools } from './risk.tools.js';
import { RiskAssessmentService } from './risk-assessment.service.js';

@Module({
  name: 'risk',
  description: 'Deterministic payment risk assessment',
  controllers: [RiskTools],
  providers: [RiskAssessmentService],
})
export class RiskModule {}
