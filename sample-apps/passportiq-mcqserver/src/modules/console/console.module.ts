/**
 * ConsoleModule — the officer console and the automation that keeps it moving.
 *
 * WHAT IT OWNS
 * -----------
 *   ConsoleStateService     one denormalised read model of the whole queue
 *   ConsoleEventHubService  bus -> browser fan-out (SSE) with replay
 *   AutopilotService        the timer that investigates without being asked
 *   ConsoleHttpService      /console + /api/* mounted on the MCP HTTP transport
 *   ConsoleTools            autopilot_status/control, get_officer_queue, activity
 *   AutopilotHealthCheck    reports the automation loop to /health
 *
 * WHY IT IMPORTS THREE MODULES AND RE-DECLARES NONE OF THEIR SERVICES
 * -----------------------------------------------------------------
 * Everything here is a *reader* of state owned elsewhere. Re-listing e.g.
 * PipelineStateService in `providers` would register a second instance, and this
 * module would then render an always-empty queue while the real pipeline filled
 * a different object — a silent failure that looks like "the UI is broken".
 * Shared singletons arrive through `imports`.
 *
 * REGISTRATION RULES THAT ARE SILENT WHEN BROKEN
 * --------------------------------------------
 *   ConsoleTools must be in `controllers` — @Tool methods are harvested from
 *   controllers only; a tool class in `providers` registers nothing, no error.
 *
 *   ConsoleEventHubService must be in `providers` — its @OnEvent subscriptions
 *   are created when core resolves the instance. Never resolved, never subscribed,
 *   and the console streams nothing.
 *
 *   AutopilotHealthCheck must be in `providers` — @HealthCheck classes are
 *   resolved from providers; in `controllers` it contributes no checks.
 *
 * AND: this module must ALSO be listed flat in src/app.module.ts. Core does not
 * walk the module graph.
 */
import { Module } from '@nitrostack/core';
import { CaseflowModule } from '../caseflow/caseflow.module.js';
import { AgentModule } from '../agent/agent.module.js';
import { PipelineModule } from '../pipeline/pipeline.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import { AutopilotHealthCheck, ConsoleHttpHealthCheck } from './health/autopilot.health.js';
import { AutopilotService } from './services/autopilot.service.js';
import { ConsoleEventHubService } from './services/console-event-hub.service.js';
import { ConsoleHttpService } from './services/console-http.service.js';
import { ConsoleStateService } from './services/console-state.service.js';
import { CopilotChatService } from './services/copilot-chat.service.js';
import { ConsoleTools } from './tools/console.tools.js';
import { CopilotTools } from './tools/copilot.tools.js';

@Module({
  name: 'console',
  description:
    'PassportIQ officer console and autonomous automation: a prioritised work queue, a live ' +
    'activity stream, a browser UI served over the same HTTP transport as MCP, and an autopilot ' +
    'that investigates the queue on its own schedule and stops at the human handoff.',
  controllers: [ConsoleTools, CopilotTools],
  providers: [
    ConsoleStateService,
    CopilotChatService,
    // Resolved for its @OnEvent side effect as much as for injection.
    ConsoleEventHubService,
    AutopilotService,
    ConsoleHttpService,
    AutopilotHealthCheck,
    ConsoleHttpHealthCheck,
  ],
  // CaseflowModule is imported so ConsoleHttpService's CaseflowService and
  // CaseOrchestratorService dependencies are registered before the console is
  // resolved. It is ALSO listed flat in app.module.ts — this line registers
  // nothing on its own, because core does not walk the module graph.
  imports: [PipelineModule, VerificationModule, AgentModule, CaseflowModule],
  exports: [
    ConsoleStateService,
    ConsoleEventHubService,
    AutopilotService,
    ConsoleHttpService,
    CopilotChatService,
  ],
})
export class ConsoleModule {}
