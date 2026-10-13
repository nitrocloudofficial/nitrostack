import { Module, OnModuleInit, Injectable } from '@nitrostack/core';
import { MarketService } from './market.service.js';
import { MarketTools } from './market.tools.js';
import { EngineRegistryService } from '../../core/decision-orchestrator/services/engine-registry.service.js';

@Injectable({ deps: [EngineRegistryService, MarketService] })
@Module({
  name: 'market-engine',
  description: 'Engine responsible for analyzing external market conditions and demand.',
  controllers: [MarketTools],
  providers: [MarketService, MarketTools],
  exports: [MarketService]
})
export class MarketEngineModule implements OnModuleInit {
  constructor(
    private readonly registry?: EngineRegistryService,
    private readonly marketService?: MarketService
  ) {}

  onModuleInit() {
    if (this.registry && this.marketService) {
      this.registry.registerEngine(this.marketService);
    }
  }
}
