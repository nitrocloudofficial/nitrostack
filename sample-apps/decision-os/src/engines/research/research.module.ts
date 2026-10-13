import { Module, OnModuleInit, Injectable } from '@nitrostack/core';
import { ResearchService } from './research.service.js';
import { ResearchTools } from './research.tools.js';
import { EngineRegistryService } from '../../core/decision-orchestrator/services/engine-registry.service.js';

@Injectable({ deps: [EngineRegistryService, ResearchService] })
@Module({
  name: 'research-engine',
  description: 'Engine responsible for gathering and synthesizing external data.',
  controllers: [ResearchTools],
  providers: [ResearchService, ResearchTools],
  exports: [ResearchService]
})
export class ResearchEngineModule implements OnModuleInit {
  constructor(
    private readonly registry?: EngineRegistryService,
    private readonly researchService?: ResearchService
  ) {}

  onModuleInit() {
    if (this.registry && this.researchService) {
      this.registry.registerEngine(this.researchService);
    }
  }
}
