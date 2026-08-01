import { Module } from '@nitrostack/core';
import { IntakeModule } from '../intake/intake.module.js';
import { ClauseExtractorService } from '../intake/clause-extractor.service.js';
import { ContractStoreService } from '../intake/contract-store.service.js';
import { PortfolioViewService } from './portfolio-view.service.js';
import { RiskScoringService } from './risk-scoring.service.js';
import { SentinelResources } from './sentinel.resources.js';
import { SentinelTools } from './sentinel.tools.js';

@Module({
  name: 'sentinel',
  description: 'Autonomous agent loop, heuristic clause risk scoring, and portfolio review',
  imports: [IntakeModule],
  controllers: [SentinelTools, SentinelResources],
  providers: [ClauseExtractorService, ContractStoreService, RiskScoringService, PortfolioViewService],
  exports: [RiskScoringService, PortfolioViewService],
})
export class SentinelModule {}
