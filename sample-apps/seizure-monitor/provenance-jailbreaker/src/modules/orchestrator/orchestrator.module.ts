import { Module } from '@nitrostack/core';

import { TargetModelModule }           from '../target-model/target-model.module.js';
import { AuditModule }                 from '../audit/audit.module.js';
import { JudgesModule }                from '../judges/judges.module.js';
import { PromptMutatorService }        from './prompt-mutator.service.js';
import { AttackerOrchestratorService } from './attacker-orchestrator.service.js';
import { RedTeamCampaignService }      from './redteam-campaign.service.js';
import { OrchestratorTools }           from './orchestrator.tools.js';

/**
 * OrchestratorModule — Person D
 *
 * Imports:
 *   TargetModelModule — Person A's Ollama service (re-used, not re-declared)
 *   AuditModule       — Person B's AuditService + ScopeGuardService (re-used)
 *   JudgesModule      — Person C's JudgesService (re-used)
 *
 * Own providers:
 *   PromptMutatorService        — 5 mutation strategies, minimal-signal feedback loop
 *   AttackerOrchestratorService — full async red-team loop (A+B+C wired together)
 *
 * Exposes MCP tools:
 *   run_attack_loop — run the complete provenance-guarded red-team loop
 */
@Module({
  name: 'orchestrator',
  description: 'Full red-team orchestrator: mutate → scope_guard → target → judge → audit (Person D)',
  imports: [
    TargetModelModule,  // Person A — provides TargetModelService
    AuditModule,        // Person B — provides AuditService + ScopeGuardService
    JudgesModule,       // Person C — provides JudgesService
  ],
  providers:   [PromptMutatorService, AttackerOrchestratorService, RedTeamCampaignService],
  controllers: [OrchestratorTools],
  exports:     [AttackerOrchestratorService, RedTeamCampaignService],
})
export class OrchestratorModule {}
