import { Module } from '@nitrostack/core';
import { ContextEngineModule } from '../../engines/context/context.module.js';
import { ResearchEngineModule } from '../../engines/research/research.module.js';
import { MarketEngineModule } from '../../engines/market/market.module.js';
import { FinanceEngineModule } from '../../engines/finance/finance.module.js';
import { RiskEngineModule } from '../../engines/risk/risk.module.js';

import { ContextService } from '../../engines/context/context.service.js';
import { ResearchService } from '../../engines/research/research.service.js';
import { MarketService } from '../../engines/market/market.service.js';
import { FinanceService } from '../../engines/finance/finance.service.js';
import { RiskService } from '../../engines/risk/risk.service.js';

import { DecisionOrchestratorService } from './decision-orchestrator.service.js';
import { DecisionOrchestratorTools } from './decision-orchestrator.tools.js';
import { EngineRegistryService } from './services/engine-registry.service.js';
import { EngineDispatcherService } from './services/engine-dispatcher.service.js';
import { ResultAggregatorService } from './services/result-aggregator.service.js';
import { RecommendationBuilderService } from './services/recommendation-builder.service.js';

@Module({
  name: 'decision-orchestrator',
  description: 'The core orchestrator for managing the decision lifecycle.',
  imports: [
    ContextEngineModule,
    ResearchEngineModule,
    MarketEngineModule,
    FinanceEngineModule,
    RiskEngineModule
  ],
  controllers: [DecisionOrchestratorTools],
  providers: [
    ContextService,
    ResearchService,
    MarketService,
    FinanceService,
    RiskService,
    DecisionOrchestratorService,
    DecisionOrchestratorTools,
    EngineRegistryService,
    EngineDispatcherService,
    ResultAggregatorService,
    RecommendationBuilderService
  ],
  exports: [
    DecisionOrchestratorService,
    EngineRegistryService,
    EngineDispatcherService,
    ResultAggregatorService,
    RecommendationBuilderService
  ]
})
export class DecisionOrchestratorModule {}
