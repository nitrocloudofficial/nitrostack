import { Module } from '@nitrostack/core';
import { OpportunityEngineService } from './opportunity-engine.service.js';
import { OpportunityResources } from './opportunity.resources.js';

@Module({
  name: 'opportunity',
  description: 'Opportunity Engine - combines tool outputs into a final score and recommendation',
  controllers: [OpportunityResources],
  providers: [OpportunityEngineService],
  exports: [OpportunityEngineService],
})
export class OpportunityModule {}
