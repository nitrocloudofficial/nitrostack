import { Module } from '../../nitrostack.js';
import { OrchestratorTools } from './orchestrator.tools.js';

@Module({
  name: 'orchestrator',
  description: 'Orchestrator — incident summary, timeline, causal graph, recommendations, impact',
  controllers: [OrchestratorTools],
})
export class OrchestratorModule {}
