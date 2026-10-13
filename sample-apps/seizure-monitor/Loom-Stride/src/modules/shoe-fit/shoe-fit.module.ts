import { Module } from '@nitrostack/core';
import { FootMeasurementService } from './services/foot-measurement.service.js';
import { ShoeDatabaseService } from './services/shoe-database.service.js';
import { ShoeScraperService } from './services/shoe-scraper.service.js';
import { ImageScraperService } from './services/image-scraper.service.js';
import { FitWiseEngineService } from './services/fitwise-engine.service.js';
import { RunningShoesApiService } from './services/running-shoes-api.service.js';
import { ShoesShopApiService } from './services/shoes-shop-api.service.js';
import { DecathlonSportsApiService } from './services/decathlon-sports-api.service.js';
import { ShoeFitEventHandler } from './services/shoefit-events.handler.js';
import { ShoeFitTools } from './shoe-fit.tools.js';
import { ShoeFitResources } from './shoe-fit.resources.js';
import { ShoeFitPrompts } from './shoe-fit.prompts.js';

import { LlmOrchestratorService } from './services/llm-orchestrator.service.js';
import { VisionQaAgentService } from './services/vision-qa-agent.service.js';
import { PodiatristAgentService } from './services/podiatrist-agent.service.js';
import { RagCatalogAgentService } from './services/rag-catalog-agent.service.js';
import { PersonalShopperAgentService } from './services/personal-shopper-agent.service.js';
import { ImageCompressionAgentService } from './services/image-compression-agent.service.js';
import { VisionMeasurementAgentService } from './services/vision-measurement-agent.service.js';

@Module({
  name: 'shoe-fit',
  description: 'Foot measurement from coin-calibrated photos and shoe ratio matching',
  providers: [
    FootMeasurementService,
    ShoeDatabaseService,
    ShoeScraperService,
    ImageScraperService,
    FitWiseEngineService,
    RunningShoesApiService,
    ShoesShopApiService,
    DecathlonSportsApiService,
    ShoeFitEventHandler,
    LlmOrchestratorService,
    VisionQaAgentService,
    PodiatristAgentService,
    RagCatalogAgentService,
    PersonalShopperAgentService,
    ImageCompressionAgentService,
    VisionMeasurementAgentService,
  ],
  controllers: [ShoeFitTools, ShoeFitResources, ShoeFitPrompts],
  exports: [
    ShoeDatabaseService,
    FootMeasurementService,
    ImageScraperService,
    FitWiseEngineService,
    RunningShoesApiService,
    ShoesShopApiService,
    DecathlonSportsApiService,
    LlmOrchestratorService,
    VisionQaAgentService,
    PodiatristAgentService,
    RagCatalogAgentService,
    PersonalShopperAgentService,
    ImageCompressionAgentService,
    VisionMeasurementAgentService,
  ],
})
export class ShoeFitModule {}

