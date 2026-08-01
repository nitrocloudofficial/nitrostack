import { Module } from '@nitrostack/core';
import { OrchestratorService } from './services/orchestrator.service.js';
import { OrchestratorTools } from './orchestrator.tools.js';

/**
 * Orchestrator Module
 *
 * Owns the Orchestrator Agent's fundamental tools:
 *   - get_warehouse_summary
 *   - read_persistent_memory
 *   - route_to_supply_chain
 *   - route_to_floor_ops
 */
@Module({
  name: 'orchestrator',
  description: 'Orchestrator Agent — acts as the main conversational interface, intent router, and gatekeeper',
  providers: [OrchestratorService],
  controllers: [OrchestratorTools],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
