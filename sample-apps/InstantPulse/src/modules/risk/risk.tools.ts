import {
  ControllerDecorator as Controller,
  Injectable,
  ToolDecorator as Tool,
  UseFilters,
  Widget,
  emitEvent,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { InstantPulseExceptionFilter } from '../../common/filters/instantpulse.filter.js';
import { ValidateInput } from '../../common/pipes/validate-input.js';
import { ApplicationStore } from '../../common/store/application.store.js';
import type { ApplicationStatus } from '../../common/types/instantpulse.types.js';
import { analyzeCashFlow } from '../analytics/cashflow.analyzer.js';
import { scoreApplication } from './risk.engine.js';
import { RISK_POLICY } from './risk.policy.js';

const ApplicationIdInput = z.object({
  applicationId: z.string().describe('A scored application'),
});

@Controller('risk')
@Injectable({ deps: [ApplicationStore] })
export class RiskTools {
  constructor(private readonly store: ApplicationStore) {}

  @Tool({
    name: 'score_application',
    description:
      'Produce the credit decision: a 0–100 risk score, a GREEN/YELLOW/RED band, a reason code for every ' +
      'scored factor, any hard blockers or review flags, and a recommended credit limit with the constraint ' +
      'that bound it. Scoring is deterministic — the same data always yields the same result, and the policy ' +
      'behind it is published at instantpulse://policy/risk-model.',
    inputSchema: ApplicationIdInput,
    examples: {
      request: { applicationId: 'app_1a2b3c4d5e6f7g8h' },
      response: {
        score: 92,
        band: 'GREEN',
        recommendedLimit: 61500,
        nextAction: 'Proceed automatically. Call stripe_start_onboarding…',
      },
    },
  })
  @Widget('onboarding-decision')
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(ApplicationIdInput)
  async scoreApplicationTool(input: { applicationId: string }, ctx: ExecutionContext) {
    const application = this.store.getOrThrow(input.applicationId);

    if (!application.snapshot) {
      throw new Error(
        `Application "${input.applicationId}" has no financial snapshot. Run ` +
          `plaid_sync_financial_snapshot first.`,
      );
    }

    // Re-derive metrics rather than trusting a stale cached block: a decision
    // must always correspond to the data actually on file.
    const metrics = application.metrics ?? analyzeCashFlow(application.snapshot);
    const decision = scoreApplication(
      application.applicationId,
      metrics,
      application.profile,
    );

    const status: ApplicationStatus =
      decision.band === 'GREEN' ? 'SCORED' : decision.band === 'YELLOW' ? 'PENDING_REVIEW' : 'DECLINED';

    this.store.update(application.applicationId, { status, metrics, decision });
    this.store.recordAudit(application.applicationId, 'system', 'risk.application_scored', {
      score: decision.score,
      band: decision.band,
      recommendedLimit: decision.credit.recommendedLimit,
      hardBlockers: decision.hardBlockers.map((b) => b.code),
      softFlags: decision.softFlags.map((f) => f.code),
      policyVersion: decision.policyVersion,
    });

    emitEvent('application.scored', {
      applicationId: application.applicationId,
      band: decision.band,
      score: decision.score,
    });

    ctx.logger.info('Application scored', {
      applicationId: application.applicationId,
      score: decision.score,
      band: decision.band,
    });

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      industry: application.profile.industry,
      status,
      dataSource: application.snapshot.source,
      decision,
      metrics,
    };
  }

  @Tool({
    name: 'explain_score',
    description:
      'Break down exactly how a score was arrived at: each factor, the signal behind it, the points it ' +
      'earned against its maximum, and the policy breakpoints applied. Use this when someone challenges a ' +
      'decision and needs to see the arithmetic.',
    inputSchema: ApplicationIdInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(ApplicationIdInput)
  async explainScore(input: { applicationId: string }) {
    const application = this.store.getOrThrow(input.applicationId);
    const { decision, metrics } = application;

    if (!decision || !metrics) {
      throw new Error(
        `Application "${input.applicationId}" has not been scored yet. Run risk_score_application first.`,
      );
    }

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      policyVersion: decision.policyVersion,

      arithmetic: {
        factorPointsAwarded: decision.reasonCodes.map((r) => ({
          factor: r.label,
          code: r.code,
          points: r.points,
          maxPoints: r.maxPoints,
          impact: r.impact,
          why: r.explanation,
        })),
        rawScore: decision.rawScore,
        anomalyPenalty: decision.anomalyPenalty,
        anomalyPenaltyCap: RISK_POLICY.anomalyPenaltyCap,
        finalScore: decision.score,
        calculation: `${decision.rawScore} raw − ${decision.anomalyPenalty} anomaly penalty = ${decision.score}/100`,
      },

      bandDetermination: {
        band: decision.band,
        reason: decision.bandReason,
        thresholds: RISK_POLICY.bands,
        hardBlockers: decision.hardBlockers,
        softFlags: decision.softFlags,
        precedence:
          'Hard blockers force RED regardless of score. Otherwise the score sets the band, and any soft ' +
          'flag caps an otherwise-GREEN application at YELLOW.',
      },

      creditRecommendation: decision.credit,
      anomaliesConsidered: metrics.anomalies,
      policyReference: 'instantpulse://policy/risk-model',
    };
  }
}
