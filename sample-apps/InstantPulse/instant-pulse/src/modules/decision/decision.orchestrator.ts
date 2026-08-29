import { Injectable, emitEvent, type Logger } from '@nitrostack/core';
import { ApplicationStore } from '../../common/store/application.store.js';
import type {
  Application,
  ApplicationStatus,
  BusinessProfile,
  PersonaId,
  StripeOnboarding,
} from '../../common/types/instantpulse.types.js';
import { analyzeCashFlow } from '../analytics/cashflow.analyzer.js';
import { PlaidService } from '../plaid/plaid.service.js';
import { scoreApplication } from '../risk/risk.engine.js';
import { StripeService } from '../stripe/stripe.service.js';

export interface PipelineResult {
  application: Application;
  stagesCompleted: string[];
  stripe?: StripeOnboarding;
  stripeSkippedReason?: string;
  elapsedMs: number;
}

/**
 * The whole promise of the product, in one call: connect, pull, analyse, score,
 * and hand a GREEN business straight to Stripe.
 *
 * Calls the services directly rather than chaining the MCP tools. Tools carry
 * rate limits, caches and per-call audit entries that are right for a client
 * driving them one at a time, but wrong for an internal pipeline — and going
 * through the service layer keeps this honest about what it actually depends on.
 */
@Injectable({ deps: [ApplicationStore, PlaidService, StripeService] })
export class DecisionOrchestrator {
  constructor(
    private readonly store: ApplicationStore,
    private readonly plaid: PlaidService,
    private readonly stripe: StripeService,
  ) {}

  async run(
    profile: BusinessProfile,
    persona: PersonaId,
    windowDays: number,
    autoStartStripe: boolean,
    logger: Logger,
  ): Promise<PipelineResult> {
    const startedAt = Date.now();
    const stages: string[] = [];

    // 1. Open the application ------------------------------------------------
    const created = this.store.create(profile);
    const applicationId = created.applicationId;
    stages.push('application_created');
    logger.info('Pipeline started', { applicationId, persona });

    // 2. Connect the bank ----------------------------------------------------
    const connection = await this.plaid.connectSandbox(applicationId, persona, windowDays, logger);
    this.store.update(applicationId, {
      status: 'BANK_CONNECTED',
      plaid: {
        itemId: connection.itemId,
        accessToken: connection.accessToken,
        institutionId: connection.institutionId,
        institutionName: connection.institutionName,
        persona: connection.persona,
        connectedAt: new Date().toISOString(),
        simulated: connection.simulated,
      },
    });
    this.store.recordAudit(applicationId, 'system', 'plaid.bank_connected', {
      institutionName: connection.institutionName,
      persona,
      simulated: connection.simulated,
    });
    stages.push('bank_connected');

    // 3. Pull and normalise the ledger --------------------------------------
    const snapshot = await this.plaid.fetchSnapshot(applicationId, connection, windowDays, logger);
    this.store.update(applicationId, { status: 'DATA_SYNCED', snapshot });
    this.store.recordAudit(applicationId, 'system', 'plaid.snapshot_synced', {
      transactionCount: snapshot.transactions.length,
      source: snapshot.source,
    });
    stages.push('data_synced');

    // 4. Analyse -------------------------------------------------------------
    const metrics = analyzeCashFlow(snapshot);
    this.store.update(applicationId, { status: 'ANALYZED', metrics });
    this.store.recordAudit(applicationId, 'system', 'analytics.cash_flow_analyzed', {
      monthsObserved: metrics.monthsObserved,
      anomalyCount: metrics.anomalies.length,
    });
    stages.push('cash_flow_analyzed');

    // 5. Score ---------------------------------------------------------------
    const decision = scoreApplication(applicationId, metrics, profile);
    const scoredStatus: ApplicationStatus =
      decision.band === 'GREEN' ? 'SCORED' : decision.band === 'YELLOW' ? 'PENDING_REVIEW' : 'DECLINED';

    this.store.update(applicationId, { status: scoredStatus, decision });
    this.store.recordAudit(applicationId, 'system', 'risk.application_scored', {
      score: decision.score,
      band: decision.band,
      recommendedLimit: decision.credit.recommendedLimit,
      hardBlockers: decision.hardBlockers.map((b) => b.code),
      softFlags: decision.softFlags.map((f) => f.code),
      policyVersion: decision.policyVersion,
    });
    emitEvent('application.scored', { applicationId, band: decision.band, score: decision.score });
    stages.push('scored');

    // 6. Stripe, but only where the band actually permits it -----------------
    let stripe: StripeOnboarding | undefined;
    let stripeSkippedReason: string | undefined;

    if (!autoStartStripe) {
      stripeSkippedReason = 'autoStartStripe was false.';
    } else if (decision.band !== 'GREEN') {
      stripeSkippedReason =
        decision.band === 'YELLOW'
          ? 'Application is YELLOW — a credit officer must approve it via review_override_decision before onboarding.'
          : 'Application is RED — payment onboarding is blocked until the blocking conditions are resolved.';
    } else {
      const current = this.store.getOrThrow(applicationId);
      stripe = await this.stripe.startOnboarding(current, logger);
      this.store.update(applicationId, { status: 'ONBOARDING_STARTED', stripe });
      this.store.recordAudit(applicationId, 'system', 'stripe.onboarding_started', {
        accountId: stripe.accountId,
        simulated: stripe.simulated,
        band: decision.band,
      });
      emitEvent('stripe.onboarding.started', { applicationId, accountId: stripe.accountId });
      stages.push('stripe_onboarding_started');
    }

    const elapsedMs = Date.now() - startedAt;
    logger.info('Pipeline complete', {
      applicationId,
      band: decision.band,
      score: decision.score,
      elapsedMs,
    });

    return {
      application: this.store.getOrThrow(applicationId),
      stagesCompleted: stages,
      stripe,
      stripeSkippedReason,
      elapsedMs,
    };
  }
}
