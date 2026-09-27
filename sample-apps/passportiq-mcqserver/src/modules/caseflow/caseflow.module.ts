/**
 * CaseflowModule — the actual passport process.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MODULE IS FOR
 * ---------------------------------------------------------------------------
 * Everything else in PassportIQ answers "is this application fraudulent?".
 * This module answers "where is this application, and what happens to it next?"
 * — the real Passport Seva lifecycle: online filing → fee → PSK appointment →
 * counters A/B/C → verification → police verification → officer grant → booklet
 * printing → Speed Post dispatch → delivery.
 *
 * The fraud pipeline is one station on that line. `run_case_verification` is the
 * seam: it calls the existing `run_verification_pipeline` through
 * ToolExecutorService, so the ten fraud stages run *inside* the lifecycle rather
 * than beside it.
 *
 * ---------------------------------------------------------------------------
 * THE 18 TOOLS, AND WHY THEY ARE SPLIT ACROSS THREE CONTROLLERS
 * ---------------------------------------------------------------------------
 *   IntakeTools       6  citizen-side: file, pay, book, attend, clarify, withdraw
 *   ProcessingTools   6  government-side: verify, raise PV, record PV, print,
 *                        dispatch, confirm delivery
 *   CaseflowQueryTools 6 read + control: case file, worklist, board, citizen
 *                        tracker, advance_case, caseflow_autopilot
 *
 * The split is by *who calls them*, which is also the security boundary a real
 * deployment would enforce. It is not cosmetic: `track_passport_application`
 * deliberately returns strictly less than `get_case_file`, because an applicant
 * must not see the fraud reasoning.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY TOOL CLASS IS A CONTROLLER AND NOT A PROVIDER
 * ---------------------------------------------------------------------------
 * Core harvests @Tool methods from `controllers` only (app-decorator.js). A tool
 * class listed under `providers` is constructed, injected, and registers nothing
 * — with no error and no warning. Its tools are simply absent from tools/list.
 * That failure has cost this project an hour before; the comment stays.
 *
 * ---------------------------------------------------------------------------
 * WHY THE THREE "UNUSED" PROVIDERS MUST STAY
 * ---------------------------------------------------------------------------
 * Nothing constructor-injects these, and they look like dead entries:
 *
 *   CaseflowDecisionBridge          @OnEvent('application.decided'). Subscriptions
 *                                   are created when core RESOLVES the instance
 *                                   while walking `providers`. Delete this line
 *                                   and every officer decision stops dead at
 *                                   officer_review — the audit log still records
 *                                   it, the case simply never moves to granted,
 *                                   so nothing ever prints or dispatches.
 *
 *   CaseflowRegisterHealthCheck     @HealthCheck registers the same way. Under
 *   CaseflowOrchestratorHealthCheck `controllers` they contribute nothing.
 *
 * ---------------------------------------------------------------------------
 * AND WHY ToolExecutorService IS LISTED HERE TOO
 * ---------------------------------------------------------------------------
 * CaseOrchestratorService needs it — it is the agent's only action path, the
 * thing that lets one tool invoke another by name. PipelineModule owns it and now
 * exports it; listing it in this module's `providers` as well is harmless because
 * the DI container is a singleton registry keyed by class, so both routes resolve
 * the SAME instance. That matters: a second executor would hold a null server
 * reference (setServer is called once, in index.ts) and every agent action would
 * fail with "executor not ready".
 *
 * ---------------------------------------------------------------------------
 * REMEMBER: THIS MODULE MUST BE LISTED FLAT IN app.module.ts
 * ---------------------------------------------------------------------------
 * Core does not walk the module graph recursively. Importing PipelineModule below
 * does not register PipelineModule, and CaseflowModule being imported by nothing
 * but AppModule is the only reason its 18 tools appear at all.
 */
import { Module } from '@nitrostack/core';

import { AgentModule } from '../agent/agent.module.js';
import { PipelineModule } from '../pipeline/pipeline.module.js';
import { ToolExecutorService } from '../pipeline/services/tool-executor.service.js';
import { VerificationModule } from '../verification/verification.module.js';

import { CaseflowRegisterHealthCheck } from './health/caseflow.health.js';
import { CaseflowOrchestratorHealthCheck } from './health/caseflow.health.js';

import { CaseOrchestratorService } from './services/case-orchestrator.service.js';
import { CaseflowDecisionBridge } from './services/caseflow-decision.bridge.js';
import { CaseflowEventsService } from './services/caseflow-events.service.js';
import { CaseflowService } from './services/caseflow.service.js';

import { CaseflowQueryTools } from './tools/caseflow-query.tools.js';
import { IntakeTools } from './tools/intake.tools.js';
import { ProcessingTools } from './tools/processing.tools.js';

@Module({
  name: 'caseflow',
  description:
    'The passport application lifecycle: filing, fee, PSK appointment and counters, ' +
    'verification, police verification, the officer grant, booklet printing, dispatch and ' +
    'delivery — driven by an autonomous orchestrator that stops at the human decision.',
  imports: [PipelineModule, VerificationModule, AgentModule],
  controllers: [
    IntakeTools, // submit / pay / book / psk visit / clarify / withdraw
    ProcessingTools, // verify / raise PV / record PV / print / dispatch / deliver
    CaseflowQueryTools, // case file / worklist / board / tracker / advance / autopilot
  ],
  providers: [
    CaseflowService,
    CaseflowEventsService,
    CaseOrchestratorService,
    ToolExecutorService,
    // Resolved for their side effects. Not dead code — see the header.
    CaseflowDecisionBridge,
    CaseflowRegisterHealthCheck,
    CaseflowOrchestratorHealthCheck,
  ],
  // The console projects the board and the orchestrator status into the browser UI.
  exports: [CaseflowService, CaseOrchestratorService, CaseflowEventsService],
})
export class CaseflowModule {}
