import { ConfigModule, McpApp, Module } from '@nitrostack/core';
import { CommonModule } from './common/common.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { DecisionModule } from './modules/decision/decision.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { PlaidModule } from './modules/plaid/plaid.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { RiskModule } from './modules/risk/risk.module.js';
import { StripeModule } from './modules/stripe/stripe.module.js';

/**
 * InstantPulse — AI business onboarding and credit pre-screening.
 *
 * Collapses the three-to-five-day manual review a small business waits through
 * into a single call: connect a bank account, analyse the cash flow, produce an
 * explainable GREEN/YELLOW/RED decision with a recommended credit limit, and
 * start Stripe payment onboarding for the ones that clear.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'instantpulse',
    version: '1.0.0',
  },
  logging: {
    level: (process.env.NITRO_LOG_LEVEL as 'info') || 'info',
  },
})
@Module({
  name: 'app',
  description: 'InstantPulse onboarding and credit pre-screening server',
  imports: [
    ConfigModule.forRoot(),
    CommonModule,
    OnboardingModule,
    PlaidModule,
    AnalyticsModule,
    RiskModule,
    StripeModule,
    ReviewModule,
    DecisionModule,
  ],
  providers: [SystemHealthCheck],
})
export class AppModule {}
