import { Module } from '@nitrostack/core';
import { OrchestratorTools } from './orchestrator.tools.js';

@Module({
  name: 'orchestrator',
  controllers: [OrchestratorTools],
})
export class OrchestratorModule {}
