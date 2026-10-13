import { Module } from '@nitrostack/core';
import { UnderwritingService } from './underwriting.service.js';
import { UnderwritingController } from './underwriting.tools.js';
import { AccountAggregatorAuthService } from '../../services/aa-auth.service.js';
import { AccountAggregatorService } from '../account-aggregator/aa.service.js';
import { LLMService } from '../../services/llm.service.js';

@Module({
  name: 'underwriting',
  description: 'Adaptive Underwriting Engine',
  controllers: [
    UnderwritingController
  ],
  providers: [
    AccountAggregatorAuthService,
    AccountAggregatorService,
    LLMService,
    UnderwritingService
  ]
})
export class UnderwritingModule {}
