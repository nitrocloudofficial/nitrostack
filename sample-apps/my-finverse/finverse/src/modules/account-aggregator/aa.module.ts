import { Module } from '@nitrostack/core';
import { AccountAggregatorService } from './aa.service.js';
import { AccountAggregatorController } from './aa.tools.js';
import { AccountAggregatorAuthService } from '../../services/aa-auth.service.js';

@Module({
  name: 'account-aggregator',
  description: 'Sahamati Account Aggregator integration',
  controllers: [
    AccountAggregatorController
  ],
  providers: [
    AccountAggregatorAuthService,
    AccountAggregatorService
  ]
})
export class AccountAggregatorModule {}
