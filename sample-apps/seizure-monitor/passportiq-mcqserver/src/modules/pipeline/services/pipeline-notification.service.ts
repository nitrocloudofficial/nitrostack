/**
 * PipelineNotificationService — the @OnEvent listeners from the build doc §3.4.
 *
 * Every tool in the pipeline, from BOTH backend roles, ends by emitting
 * `pipeline.stage_completed`. This class is the single subscriber that fans each
 * event out to the dashboard stream, the stage-tracking state, and (for
 * decisions) the audit log. Nothing polls.
 *
 * It must be listed in the module's `providers` array — McpApplicationFactory
 * scans providers for @OnEvent metadata and calls registerEventHandlers() on the
 * resolved instance (dist/core/app-decorator.js:104). A class with @OnEvent
 * methods that is not a registered provider is silently never subscribed.
 *
 * Handlers here NEVER throw. EventEmitter.emit() runs subscribers with
 * Promise.all and emitEvent() swallows rejections into console.error, so a throw
 * would be invisible AND could stop sibling handlers. A malformed event from a
 * teammate's tool should produce a loud log line, not a broken dashboard.
 */
import { Injectable, OnEvent } from '@nitrostack/core';
import {
  APPLICATION_DECIDED,
  ApplicationDecidedEventSchema,
  DecisionRecordSchema,
  PIPELINE_STAGE_COMPLETED,
  PipelineStageCompletedEventSchema,
} from '../../../contracts/index.js';
import { AuditLogService } from './audit-log.service.js';
import { DashboardGatewayService } from './dashboard-gateway.service.js';
import { PipelineStateService } from './pipeline-state.service.js';

@Injectable({ deps: [DashboardGatewayService, PipelineStateService, AuditLogService] })
export class PipelineNotificationService {
  constructor(
    private readonly dashboardGateway: DashboardGatewayService,
    private readonly state: PipelineStateService,
    private readonly auditLog: AuditLogService
  ) {}

  /**
   * Forward a completed stage to the dashboard and record it as progress.
   *
   * This is the path Backend A's seven tools arrive by: they call
   * `ctx.emit('pipeline.stage_completed', ...)` and land here without importing
   * anything from Backend B.
   */
  @OnEvent(PIPELINE_STAGE_COMPLETED)
  async onStageCompleted(data: unknown): Promise<void> {
    const parsed = PipelineStageCompletedEventSchema.safeParse(data);

    if (!parsed.success) {
      // Loud, actionable, and names the contract — this is the exact failure
      // contracts.md §3 warns "may break silently".
      console.error(
        `[PassportIQ] Discarded a malformed '${PIPELINE_STAGE_COMPLETED}' event. ` +
          `contracts.md §3 requires { applicationId, stage, result }. Received:`,
        JSON.stringify(data),
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      );
      return;
    }

    const { applicationId, stage, result } = parsed.data;

    // Idempotent — PipelineEventsService already recorded Backend B's own stages
    // synchronously. This is what captures Backend A's.
    this.state.recordStage(applicationId, stage, result);

    this.dashboardGateway.push(applicationId, PIPELINE_STAGE_COMPLETED, parsed.data);
  }

  /**
   * Persist an officer decision to the audit trail and the dashboard stream.
   *
   * officer_decide emits the lean `ApplicationDecidedEvent` for anyone who only
   * needs "what was decided", and attaches the full DecisionRecord under
   * `record` for the audit log. Both are handled: a valid record is stored
   * verbatim, and its absence is not fatal.
   */
  @OnEvent(APPLICATION_DECIDED)
  async onApplicationDecided(data: unknown): Promise<void> {
    const parsed = ApplicationDecidedEventSchema.safeParse(data);

    if (!parsed.success) {
      console.error(
        `[PassportIQ] Discarded a malformed '${APPLICATION_DECIDED}' event. Received:`,
        JSON.stringify(data),
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      );
      return;
    }

    const record = DecisionRecordSchema.safeParse(
      (data as { record?: unknown } | null)?.record
    );

    if (record.success) {
      this.auditLog.record(record.data);
    } else {
      console.warn(
        `[PassportIQ] '${APPLICATION_DECIDED}' for ${parsed.data.applicationId} carried no ` +
          `valid DecisionRecord under 'record'; audit trail entry skipped.`
      );
    }

    this.dashboardGateway.push(parsed.data.applicationId, APPLICATION_DECIDED, data);
  }
}
