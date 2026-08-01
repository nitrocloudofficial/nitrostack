import { Module } from '@nitrostack/core';
import { ResearchTools } from './research.tools.js';
import { ResearchService } from './research.service.js';
import { IntegrationsModule } from '../../integrations/integrations.module.js';

@Module({
  name: 'research',
  description: 'Medical Research module — PubMed literature & ClinicalTrials.gov search',
  imports: [IntegrationsModule],
  controllers: [ResearchTools],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
