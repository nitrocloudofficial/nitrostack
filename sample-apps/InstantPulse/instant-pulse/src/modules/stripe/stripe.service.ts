import { randomUUID } from 'node:crypto';
import { Injectable, type Logger } from '@nitrostack/core';
import Stripe from 'stripe';
import type { Application, StripeOnboarding } from '../../common/types/instantpulse.types.js';

const RETURN_URL = () =>
  process.env.STRIPE_ONBOARDING_RETURN_URL || 'https://example.com/instantpulse/onboarding/complete';
const REFRESH_URL = () =>
  process.env.STRIPE_ONBOARDING_REFRESH_URL || 'https://example.com/instantpulse/onboarding/refresh';

/**
 * Stripe Connect onboarding for approved businesses.
 *
 * Test mode only by design — this refuses to run against a live key rather than
 * risk creating a real connected account from a hackathon demo. Without a key
 * configured it returns a clearly-marked simulated account so the pipeline still
 * completes end to end.
 */
@Injectable({ deps: [] })
export class StripeService {
  private client: Stripe | null = null;
  private clientResolved = false;

  isLive(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  }

  private getClient(): Stripe {
    if (!this.clientResolved) {
      const key = process.env.STRIPE_SECRET_KEY?.trim() ?? '';

      // A live key here would create a real connected account against a real
      // business identity. Refuse rather than ask forgiveness.
      if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) {
        throw new Error(
          'STRIPE_SECRET_KEY is a live-mode key. InstantPulse only runs against Stripe test mode — ' +
            'use a key beginning sk_test_, or unset it to use simulated onboarding.',
        );
      }

      this.client = new Stripe(key);
      this.clientResolved = true;
    }

    if (!this.client) throw new Error('Stripe client unavailable.');
    return this.client;
  }

  async startOnboarding(application: Application, logger: Logger): Promise<StripeOnboarding> {
    if (!this.isLive()) {
      logger.warn('Stripe key absent — issuing simulated onboarding', {
        applicationId: application.applicationId,
      });
      return this.simulateOnboarding(application);
    }

    const stripe = this.getClient();

    const account = await stripe.accounts.create({
      type: 'express',
      country: application.profile.country || 'US',
      email: application.profile.contactEmail,
      business_type: 'company',
      company: { name: application.profile.businessName },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        instantpulse_application_id: application.applicationId,
        instantpulse_band: application.decision?.band ?? 'UNKNOWN',
        instantpulse_score: String(application.decision?.score ?? ''),
        instantpulse_recommended_limit: String(application.decision?.credit.recommendedLimit ?? ''),
      },
    });

    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: REFRESH_URL(),
      return_url: RETURN_URL(),
      type: 'account_onboarding',
    });

    logger.info('Stripe Connect onboarding started', {
      applicationId: application.applicationId,
      accountId: account.id,
    });

    return {
      accountId: account.id,
      onboardingUrl: link.url,
      expiresAt: new Date(link.expires_at * 1000).toISOString(),
      startedAt: new Date().toISOString(),
      simulated: false,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      pendingRequirements: account.requirements?.currently_due ?? [],
    };
  }

  async getOnboardingStatus(onboarding: StripeOnboarding, logger: Logger): Promise<StripeOnboarding> {
    if (onboarding.simulated || !this.isLive()) {
      return onboarding;
    }

    const account = await this.getClient().accounts.retrieve(onboarding.accountId);
    logger.info('Stripe account status refreshed', { accountId: onboarding.accountId });

    return {
      ...onboarding,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      pendingRequirements: account.requirements?.currently_due ?? [],
    };
  }

  private simulateOnboarding(application: Application): StripeOnboarding {
    const accountId = `acct_sim_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return {
      accountId,
      onboardingUrl: `https://connect.stripe.com/setup/s/simulated/${accountId}`,
      expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      startedAt: new Date().toISOString(),
      simulated: true,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      pendingRequirements: [
        'business_profile.url',
        'external_account',
        'representative.verification.document',
      ],
    };
  }
}
