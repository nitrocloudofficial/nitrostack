import { randomUUID } from 'node:crypto';
import {
  ControllerDecorator as Controller,
  Injectable,
  ToolDecorator as Tool,
  UseFilters,
  UseGuards,
  Widget,
  emitEvent,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { InstantPulseExceptionFilter } from '../../common/filters/instantpulse.filter.js';
import { OfficerGuard, assertOfficer } from '../../common/guards/officer.guard.js';
import { ValidateInput } from '../../common/pipes/validate-input.js';
import { ApplicationStore } from '../../common/store/application.store.js';
import type { ApplicationStatus, RiskBand } from '../../common/types/instantpulse.types.js';

const ListQueueInput = z.object({
  band: z
    .enum(['GREEN', 'YELLOW', 'RED'])
    .optional()
    .describe('Filter to one band. Defaults to everything needing attention.'),
  includeResolved: z
    .boolean()
    .default(false)
    .describe('Include applications already approved, declined or onboarded'),
  limit: z.number().int().positive().max(100).default(25),
});

const RequestDocumentsInput = z.object({
  applicationId: z.string().describe('The application under review'),
  documents: z
    .array(z.string())
    .min(1)
    .describe('Documents required, e.g. ["6 months of supplier invoices", "loan agreement for SBA payment"]'),
  note: z.string().optional().describe('Context for the applicant explaining why these are needed'),
  officerName: z.string().default('unassigned').describe('Officer making the request'),
});

const OverrideDecisionInput = z.object({
  applicationId: z.string().describe('The application being decided'),
  newBand: z.enum(['GREEN', 'YELLOW', 'RED']).describe("The officer's decision"),
  justification: z
    .string()
    .min(20)
    .describe('Why the officer is departing from the automated decision. Recorded permanently.'),
  officerName: z.string().describe('Name or identifier of the deciding officer'),
  officerToken: z
    .string()
    .optional()
    .describe('Officer credential, required when INSTANTPULSE_OFFICER_TOKEN is configured'),
});

const AuditTrailInput = z.object({
  applicationId: z.string().describe('The application to audit'),
});

/**
 * The human half of the system.
 *
 * YELLOW only means something if there is somewhere for a YELLOW application to
 * go. These tools are that somewhere: a queue an officer can work, a way to ask
 * the applicant for what is missing, and an override that requires a written
 * justification and is recorded permanently.
 */
@Controller('review')
@Injectable({ deps: [ApplicationStore] })
export class ReviewTools {
  constructor(private readonly store: ApplicationStore) {}

  @Tool({
    name: 'list_queue',
    description:
      'The officer review queue: applications awaiting a human decision, ordered by how close they are to ' +
      'approval so the quickest wins surface first. Each entry carries the score, the flags that stopped ' +
      'automatic approval, and the recommended limit.',
    inputSchema: ListQueueInput,
  })
  @Widget('review-queue')
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(ListQueueInput)
  async listQueue(
    input: { band?: RiskBand; includeResolved: boolean; limit: number },
    ctx: ExecutionContext,
  ) {
    const resolved: ApplicationStatus[] = ['APPROVED', 'DECLINED', 'ONBOARDING_STARTED'];

    let applications = this.store.list().filter((a) => Boolean(a.decision));
    if (input.band) applications = applications.filter((a) => a.decision?.band === input.band);
    if (!input.includeResolved) {
      applications = applications.filter((a) => !resolved.includes(a.status) || a.status === 'PENDING_REVIEW');
    }

    // Highest score first: the applications closest to clearing are the ones an
    // officer can resolve fastest, and queue throughput is the whole point.
    applications.sort((a, b) => (b.decision?.score ?? 0) - (a.decision?.score ?? 0));
    const page = applications.slice(0, input.limit);

    ctx.logger.info('Review queue listed', { total: applications.length, returned: page.length });

    const queue = page.map((a) => {
      const d = a.decision!;
      return {
        applicationId: a.applicationId,
        businessName: a.profile.businessName,
        industry: a.profile.industry,
        status: a.status,
        band: d.band,
        score: d.score,
        recommendedLimit: d.credit.recommendedLimit,
        requestedAmount: a.profile.requestedAmount,
        blockers: d.hardBlockers.map((b) => ({ code: b.code, label: b.label })),
        flags: d.softFlags.map((f) => ({ code: f.code, label: f.label })),
        anomalyCount: a.metrics?.anomalies.length ?? 0,
        openDocumentRequests: a.documentRequests.filter((r) => r.status === 'open').length,
        overridden: Boolean(a.override),
        avgMonthlyRevenue: a.metrics?.avgMonthlyInflow ?? 0,
        daysCashOnHand: Math.round(a.metrics?.daysCashOnHand ?? 0),
        nextAction: d.nextAction,
        updatedAt: a.updatedAt,
      };
    });

    return {
      total: applications.length,
      returned: queue.length,
      summary: {
        green: queue.filter((q) => q.band === 'GREEN').length,
        yellow: queue.filter((q) => q.band === 'YELLOW').length,
        red: queue.filter((q) => q.band === 'RED').length,
        totalRecommendedExposure: queue.reduce((sum, q) => sum + q.recommendedLimit, 0),
      },
      queue,
    };
  }

  @Tool({
    name: 'request_documents',
    description:
      'Ask an applicant for specific supporting documents and record the request against the application. ' +
      'Use this when a flag can be cleared by evidence rather than by judgement.',
    inputSchema: RequestDocumentsInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(RequestDocumentsInput)
  async requestDocuments(
    input: { applicationId: string; documents: string[]; note?: string; officerName: string },
    ctx: ExecutionContext,
  ) {
    const application = this.store.getOrThrow(input.applicationId);

    const request = {
      requestId: `doc_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      documents: input.documents,
      note: input.note,
      requestedBy: input.officerName,
      requestedAt: new Date().toISOString(),
      status: 'open' as const,
    };

    this.store.update(application.applicationId, {
      status: 'DOCUMENTS_REQUESTED',
      documentRequests: [...application.documentRequests, request],
    });

    this.store.recordAudit(application.applicationId, input.officerName, 'review.documents_requested', {
      requestId: request.requestId,
      documents: input.documents,
    });

    ctx.logger.info('Documents requested', {
      applicationId: application.applicationId,
      count: input.documents.length,
    });

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      status: 'DOCUMENTS_REQUESTED',
      request,
      nextAction:
        'The application stays in the queue until the documents arrive. Once reviewed, use ' +
        'review_override_decision to record the outcome.',
    };
  }

  @Tool({
    name: 'override_decision',
    description:
      'Record a credit officer\'s decision over the automated one. Requires a written justification, which ' +
      'is stored permanently in the audit trail alongside the original machine decision — the automated ' +
      'result is never overwritten, only superseded. This is what lets a YELLOW application proceed to ' +
      'Stripe onboarding.',
    inputSchema: OverrideDecisionInput,
  })
  @UseGuards(OfficerGuard)
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(OverrideDecisionInput)
  async overrideDecision(
    input: {
      applicationId: string;
      newBand: RiskBand;
      justification: string;
      officerName: string;
      officerToken?: string;
    },
    ctx: ExecutionContext,
  ) {
    const officer = assertOfficer(input.officerToken, input.officerName);
    const application = this.store.getOrThrow(input.applicationId);

    if (!application.decision) {
      throw new Error(
        `Application "${input.applicationId}" has not been scored, so there is nothing to override. ` +
          `Run risk_score_application first.`,
      );
    }

    const previousBand = application.override?.newBand ?? application.decision.band;

    const override = {
      previousBand,
      newBand: input.newBand,
      justification: input.justification,
      officer,
      overriddenAt: new Date().toISOString(),
    };

    const status: ApplicationStatus =
      input.newBand === 'RED' ? 'DECLINED' : input.newBand === 'GREEN' ? 'APPROVED' : 'PENDING_REVIEW';

    this.store.update(application.applicationId, { status, override });
    this.store.recordAudit(application.applicationId, officer, 'review.decision_overridden', {
      previousBand,
      newBand: input.newBand,
      justification: input.justification,
      originalMachineScore: application.decision.score,
      originalMachineBand: application.decision.band,
    });

    emitEvent('application.overridden', {
      applicationId: application.applicationId,
      previousBand,
      newBand: input.newBand,
      officer,
    });

    ctx.logger.info('Decision overridden', {
      applicationId: application.applicationId,
      previousBand,
      newBand: input.newBand,
      officer,
    });

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      status,
      override,
      machineDecision: {
        score: application.decision.score,
        band: application.decision.band,
        note: 'Preserved unchanged. The override supersedes it for workflow purposes but does not replace the record.',
      },
      nextAction:
        input.newBand === 'GREEN'
          ? 'Approved. Call stripe_start_onboarding to create the payment account.'
          : input.newBand === 'RED'
            ? 'Declined. Use the explain_decision prompt to draft the adverse-action notice.'
            : 'Still in review. Request documents or decide once the outstanding questions are answered.',
    };
  }

  @Tool({
    name: 'get_audit_trail',
    description:
      'The complete, append-only history of an application: every state change, every score, every document ' +
      'request and every override with its justification and the officer who made it.',
    inputSchema: AuditTrailInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(AuditTrailInput)
  async getAuditTrail(input: { applicationId: string }) {
    const application = this.store.getOrThrow(input.applicationId);
    const entries = this.store.getAudit(input.applicationId);

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      currentStatus: application.status,
      machineDecision: application.decision
        ? {
            score: application.decision.score,
            band: application.decision.band,
            policyVersion: application.decision.policyVersion,
            scoredAt: application.decision.scoredAt,
          }
        : undefined,
      override: application.override,
      entryCount: entries.length,
      entries,
    };
  }
}
