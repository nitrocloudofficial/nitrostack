import { Module, OnModuleInit, Injectable } from '@nitrostack/core';
import { RiskService } from './risk.service.js';
import { RiskTools } from './risk.tools.js';
import { EngineRegistryService } from '../../core/decision-orchestrator/services/engine-registry.service.js';

@Injectable({ deps: [EngineRegistryService, RiskService] })
@Module({
  name: 'risk-engine',
  description: 'Engine responsible for identifying, scoring, and mitigating risks.',
  controllers: [RiskTools],
  providers: [RiskService, RiskTools],
  exports: [RiskService]
})
export class RiskEngineModule implements OnModuleInit {
  constructor(
    private readonly registry?: EngineRegistryService,
    private readonly riskService?: RiskService
  ) {}

  onModuleInit() {
    if (this.registry && this.riskService) {
      this.registry.registerEngine(this.riskService);
    }
  }
}
