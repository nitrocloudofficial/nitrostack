import { Module } from '@nitrostack/core';
import { ObjectivityModule } from '../objectivity/objectivity.module.js';
import { LenderModule } from '../lender/lender.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { OrchestratorTools } from './orchestrator.tools.js';

@Module({
  name: 'orchestrator',
  description: 'Orchestrator — reconciles every agent into the shared case record',
  imports: [ObjectivityModule, LenderModule, SharedModule],
  controllers: [OrchestratorTools],
})
export class OrchestratorModule {}
