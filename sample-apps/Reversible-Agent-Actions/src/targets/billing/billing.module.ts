import { Module } from '@nitrostack/core';
import { BillingTools } from './billing.tools.js';

/** See CrmModule for why registration doesn't happen in this module's constructor. */
@Module({
  name: 'billing',
  description: 'Billing target server — authorizations, charges, payouts',
  controllers: [BillingTools],
  providers: [BillingTools],
})
export class BillingModule {}
