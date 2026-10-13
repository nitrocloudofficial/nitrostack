import {
  HealthCheck,
  Injectable,
  type HealthCheckInterface,
  type HealthCheckResult,
} from '@nitrostack/core';
import { PlaidService } from '../modules/plaid/plaid.service.js';
import { StripeService } from '../modules/stripe/stripe.service.js';

/**
 * Reports which data path the server is actually on.
 *
 * Simulated mode is reported as `degraded`, never `up` — the pipeline works
 * perfectly, but the numbers came from the local generator rather than Plaid,
 * and that distinction should never be something you have to go digging for.
 */
@HealthCheck({
  name: 'providers',
  description: 'Plaid and Stripe connectivity mode',
  interval: 60,
})
@Injectable({ deps: [PlaidService, StripeService] })
export class PlaidHealthCheck implements HealthCheckInterface {
  constructor(
    private readonly plaid: PlaidService,
    private readonly stripe: StripeService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const plaidLive = this.plaid.isLive();
    const stripeLive = this.stripe.isLive();

    const details = {
      plaid: plaidLive ? `live (${process.env.PLAID_ENV || 'sandbox'})` : 'simulated — PLAID_CLIENT_ID not set',
      stripe: stripeLive ? 'live (test mode)' : 'simulated — STRIPE_SECRET_KEY not set',
      officerTokenConfigured: Boolean(process.env.INSTANTPULSE_OFFICER_TOKEN?.trim()),
    };

    if (plaidLive && stripeLive) {
      return { status: 'up', message: 'Plaid Sandbox and Stripe test mode both configured', details };
    }

    const missing = [!plaidLive && 'Plaid', !stripeLive && 'Stripe'].filter(Boolean).join(' and ');

    return {
      status: 'degraded',
      message: `${missing} running in simulated mode — the pipeline works end to end, but results are generated locally.`,
      details,
    };
  }
}
