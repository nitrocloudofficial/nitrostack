import { Module } from '@nitrostack/core';
import { BillingTools } from './billing.tools.js';
import { BillingResources } from './billing.resources.js';
import { BillingPrompts } from './billing.prompts.js';

@Module({
  name: 'billing',
  description: 'TODO: Add description',
  controllers: [BillingTools, BillingResources, BillingPrompts],
})
export class BillingModule {}
