/**
 * Pipeline observability tools — Backend B.
 *
 * Backend B owns the event plumbing (ctx.emit -> PipelineNotificationService ->
 * DashboardGatewayService / PipelineStateService / AuditLogService), so it owns
 * the tools that read it back out.
 *
 * These three answer the questions the other roles kept needing:
 *
 *   get_pipeline_events    "what has happened on this case, in order?"
 *                          Frontend A's live timeline. Cursor-based, so a widget
 *                          that mounts mid-pipeline replays history instead of
 *                          missing it.
 *   get_pipeline_progress  "can the officer decide yet, and if not why not?"
 *                          The same question PipelineCompleteGuard asks — asked
 *                          non-destructively, so the UI can disable the decision
 *                          buttons and SAY WHY instead of letting the officer
 *                          click into a rejection.
 *   get_audit_trail        "who decided what, when, on what evidence?"
 *                          Frontend B's audit panel.
 */
import { Injectable, ToolDecorator as Tool, z } from '@nitrostack/core';
import { AuditTrailSchema, REQUIRED_STAGES_BEFORE_DECISION } from '../../../contracts/index.js';
import { AuditLogService } from '../services/audit-log.service.js';
import { DashboardGatewayService } from '../services/dashboard-gateway.service.js';
import { PipelineStateService } from '../services/pipeline-state.service.js';
import { ToolExecutorService } from '../services/tool-executor.service.js';

/**
 * @Injectable({ deps: [...] }) — the deps array is MANDATORY, not documentation.
 *
 * DIContainer.getDependencies() prefers explicit `nitrostack:deps` metadata and
 * only falls back to TypeScript's `design:paramtypes`, which is empty under ESM
 * unless reflect-metadata was loaded before the decorator ran. Without the
 * explicit list, this class is constructed with NO arguments and every injected
 * field is `undefined` — the first tool call then dies with
 * "Cannot read properties of undefined". Order must match the constructor.
 */
@Injectable({ deps: [DashboardGatewayService, PipelineStateService, AuditLogService, ToolExecutorService] })
export class PipelineMonitorTools {
  constructor(
    private readonly gateway: DashboardGatewayService,
    private readonly state: PipelineStateService,
    private readonly audit: AuditLogService,
    private readonly toolExecutor: ToolExecutorService
  ) {}

  @Tool({
    name: 'get_pipeline_events',
    title: 'Get pipeline events',
    description:
      'Read the ordered event stream for one application — every pipeline.stage_completed and ' +
      'application.decided event, with its payload. Pass the last sequence number you saw as ' +
      '`sinceSequence` to fetch only what is new, so a dashboard can stream the timeline.',
    inputSchema: z.object({
      applicationId: z.string().min(1).describe('Passport application ID'),
      sinceSequence: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe('Return only events with a sequence number greater than this. 0 = from the start.'),
    }),
    outputSchema: z.object({
      applicationId: z.string(),
      events: z.array(
        z.object({
          sequence: z.number().int(),
          event: z.string(),
          applicationId: z.string(),
          payload: z.unknown(),
          emittedAt: z.string(),
        })
      ),
      /** Feed this back as `sinceSequence` on the next call. */
      latestSequence: z.number().int(),
      eventCount: z.number().int(),
    }),
    annotations: {
      readOnlyHint: true,
      // Not idempotent in the caching sense: the same call returns more events as
      // the pipeline progresses. Marking it idempotent would invite a client to
      // cache a half-finished timeline.
      idempotentHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Reading the pipeline event stream...',
      invoked: 'Event stream read',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001', sinceSequence: 0 },
      response: {
        applicationId: 'PIQ-2026-2001',
        eventCount: 2,
        latestSequence: 2,
        events: [
          {
            sequence: 1,
            event: 'pipeline.stage_completed',
            applicationId: 'PIQ-2026-2001',
            emittedAt: '2026-02-01T10:00:00.000Z',
          },
        ],
      },
    },
  })
  async getPipelineEvents(input: { applicationId: string; sinceSequence?: number }) {
    const events = this.gateway.getEvents(input.applicationId, input.sinceSequence ?? 0);

    return {
      applicationId: input.applicationId,
      events,
      // The stream-wide high-water mark, not `events.at(-1)`: an empty page must
      // still return a cursor the client can keep polling from.
      latestSequence: this.gateway.getLatestSequence(),
      eventCount: events.length,
    };
  }

  @Tool({
    name: 'get_pipeline_progress',
    title: 'Get pipeline progress',
    description:
      'Which verification stages have completed for this application, which are still ' +
      'outstanding, and whether an officer decision is unlocked yet. Read-only — this asks the ' +
      'same question PipelineCompleteGuard enforces, without attempting a decision.',
    inputSchema: z.object({
      applicationId: z.string().min(1).describe('Passport application ID'),
    }),
    outputSchema: z.object({
      applicationId: z.string(),
      completedStages: z.array(z.string()),
      missingStages: z.array(z.string()),
      requiredStages: z.array(z.string()),
      stageHistory: z.array(z.object({ stage: z.string(), completedAt: z.string() })),
      percentComplete: z.number(),
      decisionReady: z.boolean(),
      /** Present only while blocked — render this instead of a bare disabled button. */
      blockedReason: z.string().nullable(),
      riskScore: z.number().nullable(),
      registeredTools: z.array(z.string()),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Checking verification progress...',
      invoked: 'Progress checked',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        percentComplete: 67,
        decisionReady: false,
        missingStages: ['evaluate_rules', 'score_risk', 'explain_risk'],
        blockedReason:
          'Waiting on 3 of 9 verification stage(s): evaluate_rules, score_risk, explain_risk.',
      },
    },
  })
  async getPipelineProgress(input: { applicationId: string }) {
    const progress = this.state.getProgress(input.applicationId);

    return {
      applicationId: input.applicationId,
      completedStages: progress.completedStages,
      missingStages: progress.missingStages,
      requiredStages: [...REQUIRED_STAGES_BEFORE_DECISION],
      stageHistory: this.state.getStageRecords(input.applicationId),
      percentComplete: progress.percentComplete,
      decisionReady: progress.isComplete,
      blockedReason: progress.isComplete
        ? null
        : `Waiting on ${progress.missingStages.length} of ${REQUIRED_STAGES_BEFORE_DECISION.length} ` +
          `verification stage(s): ${progress.missingStages.join(', ')}.`,
      riskScore: this.state.getRiskScore(input.applicationId),
      // Surfaces which stages physically cannot complete yet because their tool
      // is not wired in. At Checkpoint 1 this is the fastest way to see whose
      // stage is still missing without reading four repos.
      registeredTools: this.toolExecutor.listToolNames(),
    };
  }

  @Tool({
    name: 'get_audit_trail',
    title: 'Get decision audit trail',
    description:
      'The append-only record of officer decisions: who decided, what they decided, when, the ' +
      'risk score on screen at the time, and which applications were linked. Omit ' +
      'applicationId for the full trail across every case.',
    inputSchema: z.object({
      applicationId: z
        .string()
        .optional()
        .describe('Filter to one application. Omit for every recorded decision.'),
    }),
    outputSchema: AuditTrailSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Reading the decision audit trail...',
      invoked: 'Audit trail read',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        total: 1,
        entries: [
          {
            recordId: 'DEC-0001',
            applicationId: 'PIQ-2026-2001',
            applicantName: 'Vikram Nair',
            decision: 'reject',
            officer: 'officer.demo@passportiq.gov.in',
            status: 'rejected',
          },
        ],
      },
    },
  })
  async getAuditTrail(input: { applicationId?: string }) {
    return this.audit.getTrail(input.applicationId);
  }
}
