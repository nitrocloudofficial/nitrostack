import { Module } from '@nitrostack/core';
import { OrchestratorTools } from './orchestrator.tools.js';

@Module({
  name: 'orchestrator',
  description: 'Multi-Agent Central Planner',
  controllers: [OrchestratorTools],
})
export class OrchestratorModule {}
