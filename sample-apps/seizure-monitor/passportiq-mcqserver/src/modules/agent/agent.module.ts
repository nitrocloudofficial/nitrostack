/**
 * AgentModule — the autonomous investigator.
 *
 * Registers the observe→think→act loop, its memory, its planner and the queue
 * sweep. Depends on both other feature modules because the agent's whole method
 * is to drive THEIR tools:
 *
 *   PipelineModule     ToolExecutorService (how it acts), ApplicationService,
 *                      PipelineStateService (what it observes), GraphService
 *   VerificationModule LlmService for the planner
 *
 * ---------------------------------------------------------------------------
 * PROVIDERS ARE ONLY THIS MODULE'S OWN SERVICES
 * ---------------------------------------------------------------------------
 * Re-listing a service another module already registered creates a SECOND
 * instance. Here that would be quietly catastrophic: a duplicate
 * PipelineStateService means the agent observes an empty state after every
 * action, so `nextAction()` would keep choosing document_validate forever and the
 * run would burn its entire budget on turn one. Shared singletons arrive through
 * `imports`.
 *
 * ---------------------------------------------------------------------------
 * ALSO LISTED FLAT IN src/app.module.ts
 * ---------------------------------------------------------------------------
 * Core does not walk the module graph. Being imported here is not enough for
 * PipelineModule or VerificationModule to register — see app.module.ts.
 */
import { Module } from '@nitrostack/core';
import { PipelineModule } from '../pipeline/pipeline.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import { AgentMemoryService } from './services/agent-memory.service.js';
import { AgentPlannerService } from './services/agent-planner.service.js';
import { AgentRunnerService } from './services/agent-runner.service.js';
import { TriageService } from './services/triage.service.js';
import { AgentTools } from './tools/agent.tools.js';

@Module({
  name: 'agent',
  description:
    'PassportIQ autonomous verification agent: an observe-think-act loop that chooses its own ' +
    'next tool call from what it has learned, escalates when unsure, correlates the whole queue ' +
    'to find fraud rings, and always terminates by handing the decision to a human officer.',
  controllers: [AgentTools],
  providers: [AgentMemoryService, AgentPlannerService, AgentRunnerService, TriageService],
  imports: [PipelineModule, VerificationModule],
  // PlatformModule exposes the trace as an MCP resource and reports agent stats
  // through a health check.
  exports: [AgentMemoryService, AgentRunnerService, TriageService],
})
export class AgentModule {}
