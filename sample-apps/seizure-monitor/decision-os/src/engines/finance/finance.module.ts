import { Module, OnModuleInit, Injectable } from '@nitrostack/core';
import { FinanceService } from './finance.service.js';
import { FinanceTools } from './finance.tools.js';
import { EngineRegistryService } from '../../core/decision-orchestrator/services/engine-registry.service.js';

@Injectable({ deps: [EngineRegistryService, FinanceService] })
@Module({
  name: 'finance-engine',
  description: 'Engine responsible for monetary feasibility and impact analysis.',
  controllers: [FinanceTools],
  providers: [FinanceService, FinanceTools],
  exports: [FinanceService]
})
export class FinanceEngineModule implements OnModuleInit {
  constructor(
    private readonly registry?: EngineRegistryService,
    private readonly financeService?: FinanceService
  ) {}

  onModuleInit() {
    if (this.registry && this.financeService) {
      this.registry.registerEngine(this.financeService);
    }
  }
}
