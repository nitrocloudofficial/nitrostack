import { Module } from '@nitrostack/core';
import { CommonModule } from '../../common/common.module.js';
import { PlaidModule } from '../plaid/plaid.module.js';
import { StripeModule } from '../stripe/stripe.module.js';
import { DecisionOrchestrator } from './decision.orchestrator.js';
import { DecisionTools } from './decision.tools.js';

@Module({
  name: 'decision',
  description: 'End-to-end onboarding pipeline — connect, analyse, score and onboard in one call',
  imports: [CommonModule, PlaidModule, StripeModule],
  providers: [DecisionOrchestrator],
  controllers: [DecisionTools],
})
export class DecisionModule {}
