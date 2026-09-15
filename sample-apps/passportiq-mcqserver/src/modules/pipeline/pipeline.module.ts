/**
 * PipelineModule — everything Backend B owns, in one importable unit.
 *
 * ---------------------------------------------------------------------------
 * WHY PipelineNotificationService IS LISTED IN `providers` DESPITE HAVING NO
 * INJECTION SITE
 * ---------------------------------------------------------------------------
 * Nothing constructor-injects it. It looks dead. It is not.
 *
 * @OnEvent does not self-register: the decorator only writes metadata onto the
 * class. Subscriptions are created at bootstrap, when McpApplicationFactory walks
 * each module's `providers`, resolves the instance, and calls
 * registerEventHandlers() on it (dist/core/app-decorator.js:104). A class with
 * @OnEvent methods that is never resolved therefore never subscribes — silently.
 *
 * Removing this one line would produce: an empty live dashboard, an empty audit
 * trail, and Backend A's stages never landing in PipelineStateService (they arrive
 * only over the event bus), which would in turn make PipelineCompleteGuard block
 * every decision with no visible cause. Do not "clean up" this entry.
 *
 * ---------------------------------------------------------------------------
 * ON `controllers` VS `providers`
 * ---------------------------------------------------------------------------
 * The four @Tool classes are listed as controllers only. Core resolves
 * controllers through the same DI container, so their constructor dependencies
 * are injected without also naming them as providers — they are not injected
 * into anything else, so they need no provider entry.
 *
 * PipelineCompleteGuard, however, IS a provider: @UseGuards receives the guard
 * CLASS and core resolves it from the container, so its own PipelineStateService
 * dependency has to be resolvable. It must resolve to the SAME singleton instance
 * the tools write to, or the guard would read an always-empty state and block
 * every decision.
 */
import { Module } from '@nitrostack/core';

import { PipelineCompleteGuard } from './guards/pipeline-complete.guard.js';

import { ApplicationService } from './services/application.service.js';
import { AuditLogService } from './services/audit-log.service.js';
import { DashboardGatewayService } from './services/dashboard-gateway.service.js';
import { GraphService } from './services/graph.service.js';
import { PipelineEventsService } from './services/pipeline-events.service.js';
import { PipelineNotificationService } from './services/pipeline-notification.service.js';
import { PipelineStateService } from './services/pipeline-state.service.js';
import { ToolExecutorService } from './services/tool-executor.service.js';

import { ApplicationQueryTools } from './tools/application-query.tools.js';
import { DuplicateDetectorTools } from './tools/duplicate-detector.tools.js';
import { GraphBuilderTools } from './tools/graph-builder.tools.js';
import { OfficerDecisionTools } from './tools/officer-decision.tools.js';
import { PipelineMonitorTools } from './tools/pipeline-monitor.tools.js';
import { PipelineOrchestratorTools } from './tools/pipeline-orchestrator.tools.js';

@Module({
  name: 'pipeline',
  description:
    'PassportIQ verification pipeline infrastructure (Backend B): applicant pool, ' +
    'duplicate-signal detection, risk graph, event plumbing, and the guarded officer decision.',
  controllers: [
    // Backend B's owned pipeline stages
    DuplicateDetectorTools, // detect_duplicate_signals  (stage 5)
    GraphBuilderTools, // build_risk_graph          (stage 6)
    // The decision gate
    OfficerDecisionTools, // officer_decide            (guarded)
    // Orchestration + reads
    PipelineOrchestratorTools, // run_verification_pipeline
    ApplicationQueryTools, // list_applications, get_application, list_applicant_clusters
    PipelineMonitorTools, // get_pipeline_events, get_pipeline_progress, get_audit_trail
  ],
  providers: [
    ApplicationService,
    GraphService,
    PipelineStateService,
    PipelineEventsService,
    DashboardGatewayService,
    AuditLogService,
    ToolExecutorService,
    // Resolved for its side effect — see the header comment. Not dead code.
    PipelineNotificationService,
    PipelineCompleteGuard,
  ],
  // Backend A's module injects ApplicationService and PipelineEventsService so its
  // seven tools can read the same applicant pool and emit on the same bus.
  // CaseflowModule additionally injects ToolExecutorService: the lifecycle
  // orchestrator's only action path is calling other tools by name, and it must
  // receive the SAME executor instance index.ts called setServer() on.
  exports: [
    ApplicationService,
    GraphService,
    PipelineEventsService,
    PipelineStateService,
    ToolExecutorService,
    AuditLogService,
  ],
})
export class PipelineModule {}
