/**
 * AppModule — the root module. This is the shell every feature plugs into.
 *
 * ---------------------------------------------------------------------------
 * IMPORTS MUST BE FLAT
 * ---------------------------------------------------------------------------
 * @nitrostack/core does NOT walk the module graph recursively. It reads
 * `imports` on the module passed to @McpApp, registers those, and stops
 * (dist/core/app-decorator.js). A module imported only by another feature module
 * — rather than listed here — is never registered, and its tools simply do not
 * appear in tools/list. No error is raised.
 *
 * So EVERY feature module must be listed here, even when another module already
 * imports it. VerificationModule imports PipelineModule and AgentModule imports
 * both; all four still appear below on purpose.
 *
 * ---------------------------------------------------------------------------
 * WHAT EACH MODULE OWNS
 * ---------------------------------------------------------------------------
 *   PipelineModule     applicant pool, duplicate signals, risk graph, event bus,
 *                      the guarded officer_decide, orchestration + read tools
 *   VerificationModule the eight verification stages: checklist, OCR, identity
 *                      and address consistency, rulebook, score, explanation
 *   AgentModule        the autonomous investigator: planner, memory, policy,
 *                      autopilot, triage queue, human handoff
 *   PlatformModule     the rest of the MCP surface: resources, prompts, health
 *                      checks, cached read models
 *   ConsoleModule      the officer console: prioritised queue read model, live
 *                      event stream, the browser UI served over the same HTTP
 *                      transport as MCP, and the autopilot that investigates the
 *                      queue on its own schedule
 *   CaseflowModule     THE PASSPORT PROCESS ITSELF: filing → fee → PSK
 *                      appointment → counters A/B/C → verification → police
 *                      verification → officer grant → printing → dispatch →
 *                      delivery, plus the autonomous orchestrator that walks a
 *                      case as far as it is permitted and stops at the human
 *                      decision. Everything above it answers "is this fraud?";
 *                      this module is what the fraud check is *about*.
 */
import { Module } from '@nitrostack/core';
import { AgentModule } from './modules/agent/agent.module.js';
import { CaseflowModule } from './modules/caseflow/caseflow.module.js';
import { ConsoleModule } from './modules/console/console.module.js';
import { PipelineModule } from './modules/pipeline/pipeline.module.js';
import { PlatformModule } from './modules/platform/platform.module.js';
import { VerificationModule } from './modules/verification/verification.module.js';

@Module({
  name: 'root',
  description: 'PassportIQ — AI copilot for passport verification officers',
  imports: [
    PipelineModule,
    VerificationModule,
    AgentModule,
    PlatformModule,
    // Caseflow before Console: ConsoleHttpService injects CaseflowService and
    // CaseOrchestratorService, so those providers must be registered first.
    CaseflowModule,
    ConsoleModule,
  ],
})
export class AppModule {}
