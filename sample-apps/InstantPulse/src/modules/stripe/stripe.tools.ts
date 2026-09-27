import {
  ControllerDecorator as Controller,
  Injectable,
  RateLimit,
  ToolDecorator as Tool,
  UseFilters,
  emitEvent,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { InstantPulseExceptionFilter } from '../../common/filters/instantpulse.filter.js';
import { ValidateInput } from '../../common/pipes/validate-input.js';
import { ApplicationStore } from '../../common/store/application.store.js';
import { StripeService } from './stripe.service.js';

const StartOnboardingInput = z.object({
  applicationId: z.string().describe('A scored application'),
});

const OnboardingStatusInput = z.object({
  applicationId: z.string().describe('An application with Stripe onboarding started'),
});

@Controller('stripe')
@Injectable({ deps: [ApplicationStore, StripeService] })
export class StripeTools {
  constructor(
    private readonly store: ApplicationStore,
    private readonly stripe: StripeService,
  ) {}

  @Tool({
    name: 'start_onboarding',
    description:
      'Create a Stripe Connect payment account for an approved business and return its onboarding link. ' +
      'Only runs for GREEN applications, or YELLOW ones a credit officer has explicitly approved via ' +
      'review_override_decision — a RED or unreviewed YELLOW application is refused.',
    inputSchema: StartOnboardingInput,
    examples: {
      request: { applicationId: 'app_1a2b3c4d5e6f7g8h' },
      response: {
        accountId: 'acct_1Ov…',
        onboardingUrl: 'https://connect.stripe.com/setup/s/…',
        simulated: false,
      },
    },
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(StartOnboardingInput)
  @RateLimit({ requests: 10, window: '1m' })
  async startOnboarding(input: { applicationId: string }, ctx: ExecutionContext) {
    const application = this.store.getOrThrow(input.applicationId);
    const decision = application.decision;

    if (!decision) {
      throw new Error(
        `Application "${input.applicationId}" has not been scored. Run risk_score_application first.`,
      );
    }

    // The whole value of a banded decision is that the band actually gates
    // something. Enforce it here rather than trusting the caller to check.
    const effectiveBand = application.override?.newBand ?? decision.band;

    if (effectiveBand === 'RED') {
      throw new Error(
        `Refusing to start payment onboarding: application "${input.applicationId}" is RED. ` +
          `Blocking conditions: ${decision.hardBlockers.map((b) => b.code).join(', ') || 'score below review floor'}. ` +
          `Resolve them and re-score, or record an officer override with a written justification.`,
      );
    }

    if (effectiveBand === 'YELLOW' && !application.override) {
      throw new Error(
        `Application "${input.applicationId}" is YELLOW and needs a human decision before onboarding. ` +
          `Review it with review_list_queue, then either request documents or approve it via ` +
          `review_override_decision.`,
      );
    }

    if (application.stripe) {
      return {
        applicationId: application.applicationId,
        alreadyStarted: true,
        stripe: application.stripe,
        note: 'Onboarding was already started for this application. Use stripe_get_onboarding_status to refresh it.',
      };
    }

    const onboarding = await this.stripe.startOnboarding(application, ctx.logger);

    this.store.update(application.applicationId, {
      status: 'ONBOARDING_STARTED',
      stripe: onboarding,
    });

    this.store.recordAudit(application.applicationId, 'system', 'stripe.onboarding_started', {
      accountId: onboarding.accountId,
      simulated: onboarding.simulated,
      band: effectiveBand,
      viaOverride: Boolean(application.override),
    });

    emitEvent('stripe.onboarding.started', {
      applicationId: application.applicationId,
      accountId: onboarding.accountId,
    });

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      status: 'ONBOARDING_STARTED',
      band: effectiveBand,
      approvedViaOverride: Boolean(application.override),
      recommendedLimit: decision.credit.recommendedLimit,
      stripe: onboarding,
      nextAction: onboarding.simulated
        ? 'Simulated onboarding — no Stripe key configured. Set STRIPE_SECRET_KEY (sk_test_…) for a real Connect account.'
        : 'Send the onboarding URL to the business owner to complete their Stripe account setup.',
    };
  }

  @Tool({
    name: 'get_onboarding_status',
    description:
      'Refresh the Stripe Connect account state for an application: whether charges and payouts are enabled, ' +
      'whether details have been submitted, and what requirements are still outstanding.',
    inputSchema: OnboardingStatusInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(OnboardingStatusInput)
  @RateLimit({ requests: 30, window: '1m' })
  async getOnboardingStatus(input: { applicationId: string }, ctx: ExecutionContext) {
    const application = this.store.getOrThrow(input.applicationId);

    if (!application.stripe) {
      throw new Error(
        `Application "${input.applicationId}" has no Stripe onboarding. Run stripe_start_onboarding first.`,
      );
    }

    const refreshed = await this.stripe.getOnboardingStatus(application.stripe, ctx.logger);
    this.store.update(application.applicationId, { stripe: refreshed });

    const ready = refreshed.chargesEnabled && refreshed.payoutsEnabled;

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      stripe: refreshed,
      readyToAcceptPayments: ready,
      nextAction: ready
        ? 'The business can accept payments. Onboarding is complete.'
        : `Outstanding requirements: ${refreshed.pendingRequirements.join(', ') || 'none reported yet'}.`,
    };
  }
}
