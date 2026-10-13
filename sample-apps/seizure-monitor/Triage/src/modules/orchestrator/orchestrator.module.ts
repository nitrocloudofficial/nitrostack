import { Module } from '@nitrostack/core';
import { OrchestratorTools } from './orchestrator.tools.js';

@Module({
  name: 'orchestrator',
  description: 'Chains triage, hospital-finder, and notification into one emergency pipeline call',
  controllers: [OrchestratorTools],
  providers: [],
})
export class OrchestratorModule {}