import { Injectable, OnEvent, createLogger } from '@nitrostack/core';
import type { RiskBand } from '../../common/types/instantpulse.types.js';

const logger = createLogger({ level: 'info' });

/**
 * Operational journal for credit decisions.
 *
 * Deliberately separate from the audit trail in ApplicationStore. The audit
 * trail is the legal record attached to one application; this is the operations
 * feed — the stream you would point at a log aggregator to watch approval rates
 * drift or spot a run of overrides that suggests the policy needs retuning.
 *
 * Emitting rather than calling keeps that concern out of the scoring path.
 */
@Injectable({ deps: [] })
export class DecisionJournalHandler {
  private readonly counts: Record<RiskBand, number> = { GREEN: 0, YELLOW: 0, RED: 0 };
  private overrides = 0;

  @OnEvent('application.scored')
  async onScored(data: { applicationId: string; band: RiskBand; score: number }) {
    this.counts[data.band] = (this.counts[data.band] ?? 0) + 1;

    logger.info('[journal] decision issued', {
      applicationId: data.applicationId,
      band: data.band,
      score: data.score,
      runningTotals: { ...this.counts },
    });
  }

  @OnEvent('application.overridden')
  async onOverridden(data: {
    applicationId: string;
    previousBand: RiskBand;
    newBand: RiskBand;
    officer: string;
  }) {
    this.overrides++;
    const decided = this.counts.GREEN + this.counts.YELLOW + this.counts.RED;

    logger.info('[journal] officer override recorded', {
      applicationId: data.applicationId,
      from: data.previousBand,
      to: data.newBand,
      officer: data.officer,
      // A climbing override rate is the clearest signal that the thresholds
      // no longer match how the officers actually underwrite.
      overrideRate: decided > 0 ? `${Math.round((this.overrides / decided) * 100)}%` : 'n/a',
    });
  }

  @OnEvent('stripe.onboarding.started')
  async onOnboardingStarted(data: { applicationId: string; accountId: string }) {
    logger.info('[journal] payment onboarding started', {
      applicationId: data.applicationId,
      accountId: data.accountId,
    });
  }
}
