import { Module } from '@nitrostack/core';
import { CustomerTools } from './customer.tools.js';

@Module({
  name: 'customer',
  description: 'Customer-facing tools for account linking, data fetching, and loan eligibility',
  controllers: [CustomerTools],
})
export class CustomerModule {}
