import { Module } from '@nitrostack/core';
import { CommonModule } from '../../common/common.module.js';
import { StripeService } from './stripe.service.js';
import { StripeTools } from './stripe.tools.js';

@Module({
  name: 'stripe',
  description: 'Stripe Connect payment-account onboarding for approved businesses',
  imports: [CommonModule],
  providers: [StripeService],
  controllers: [StripeTools],
  exports: [StripeService],
})
export class StripeModule {}
