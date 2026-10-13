import { Module } from '@nitrostack/core';
import { RepaymentService } from './repayment.service.js';
import { RepaymentController } from './repayment.tools.js';
import { AccountAggregatorAuthService } from '../../services/aa-auth.service.js';
import { AccountAggregatorService } from '../account-aggregator/aa.service.js';

@Module({
  name: 'repayment',
  description: 'Smart Repayment Engine',
  controllers: [
    RepaymentController
  ],
  providers: [
    AccountAggregatorAuthService,
    AccountAggregatorService,
    RepaymentService
  ]
})
export class RepaymentModule {}
