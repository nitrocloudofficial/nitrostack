/**
 * officer_decide — the approval gate. Backend B.
 *
 * The ONLY tool in PassportIQ that writes a final outcome, and the only one that
 * is not read-only. Guarded by PipelineCompleteGuard so it cannot run until every
 * required verification stage has completed for that application.
 *
 * The decision itself is always a human call. Nothing in this file infers,
 * suggests, or defaults a decision — `decision` is a required input.
 */
import { Injectable, ToolDecorator as Tool, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import {
  DecisionRecordSchema,
  OfficerDecideInputSchema,
  type DecisionRecord,
  type OfficerDecideInput,
} from '../../../contracts/index.js';
import { PipelineCompleteGuardRef } from '../guards/pipeline-complete.guard.js';
import { ApplicationService } from '../services/application.service.js';
import { GraphService } from '../services/graph.service.js';
import { PipelineEventsService } from '../services/pipeline-events.service.js';
import { PipelineStateService } from '../services/pipeline-state.service.js';

/** Fallback officer identity when the MCP client is unauthenticated (local demo). */
const DEFAULT_OFFICER = process.env['PASSPORTIQ_DEFAULT_OFFICER'] ?? 'officer.demo@passportiq.gov.in';

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
@Injectable({ deps: [ApplicationService, GraphService, PipelineStateService, PipelineEventsService] })
export class OfficerDecisionTools {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly graphService: GraphService,
    private readonly state: PipelineStateService,
    private readonly events: PipelineEventsService
  ) {}

  @Tool({
    name: 'officer_decide',
    title: 'Officer decision',
    description:
      "Record the officer's final decision on an application: approve, request clarification, " +
      'or reject. Blocked until every verification stage has completed for that application. ' +
      'This is a human decision — the AI never auto-approves.',
    inputSchema: OfficerDecideInputSchema,
    outputSchema: DecisionRecordSchema,
    annotations: {
      // The only non-read-only tool in the server. destructiveHint is false
      // because a decision APPENDS an immutable audit record rather than
      // overwriting or deleting anything; idempotentHint is false because
      // deciding twice produces two distinct audit entries, which is correct —
      // an officer changing their mind is itself part of the paper trail.
      readOnlyHint: false,
      idempotentHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Recording officer decision...',
      invoked: 'Decision recorded',
    },
    examples: {
      request: {
        applicationId: 'PIQ-2026-2001',
        decision: 'reject',
        note: 'Reused document photograph and address across three linked applications — referred to fraud investigation.',
      },
      response: {
        recordId: 'DEC-0001',
        applicationId: 'PIQ-2026-2001',
        applicantName: 'Vikram Nair',
        decision: 'reject',
        officer: 'officer.demo@passportiq.gov.in',
        status: 'rejected',
        riskScoreAtDecision: 87,
        linkedApplicationIds: ['PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'],
      },
    },
  })
  // PipelineCompleteGuardRef is PipelineCompleteGuard, retyped to satisfy core's
  // no-arg GuardConstructor alias — see that export's comment.
  @UseGuards(PipelineCompleteGuardRef)
  async officerDecide(rawInput: OfficerDecideInput, ctx: ExecutionContext): Promise<DecisionRecord> {
    // ---------------------------------------------------------------------
    // EXPLICIT INPUT VALIDATION — the framework does NOT do this for us.
    // ---------------------------------------------------------------------
    // @nitrostack/core@1.0.14 never validates tool input against `inputSchema`.
    // The schema is only converted to JSON Schema to advertise the tool in
    // tools/list (dist/core/tool.js:181) — nothing calls .parse() on the way in.
    //
    // Verified by test: calling this tool with decision:'maybe' previously wrote
    // a DecisionRecord with status undefined and returned it happily. For the one
    // tool in PassportIQ that appends an immutable audit record, "the client
    // wouldn't send that" is not an acceptable defence — an LLM chooses these
    // arguments, and a malformed decision is unrecoverable once recorded.
    //
    // So parse here, and fail before anything is written.
    const parsed = OfficerDecideInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new Error(
        `officer_decide received invalid input: ` +
          parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
      );
    }
    const input = parsed.data;

    const officer = ctx.auth?.subject ?? DEFAULT_OFFICER;

    // Snapshot what the officer could actually see at decision time. An audit
    // entry that records "approved" without recording the evidence on screen is
    // not a paper trail a regulator would accept.
    const record = this.applicationService.recordDecision(input, {
      officer,
      stagesCompleted: this.state.getCompletedStages(input.applicationId),
      riskScoreAtDecision: this.state.getRiskScore(input.applicationId),
      linkedApplicationIds: this.graphService.getLinkedApplicationIds(input.applicationId),
    });

    this.events.applicationDecided(ctx, {
      applicationId: record.applicationId,
      decision: record.decision,
      officer: record.officer,
      ...(record.note !== undefined ? { note: record.note } : {}),
      decidedAt: record.decidedAt,
      // Carried alongside the lean event so PipelineNotificationService can write
      // the full row into the audit log without a second lookup.
      record,
    });

    return record;
  }
}
