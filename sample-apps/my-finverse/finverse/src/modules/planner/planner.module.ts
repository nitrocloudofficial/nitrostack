import { Module } from '@nitrostack/core';
import { PlannerController } from './planner.tools.js';
import { PlannerPromptsController } from './planner.prompts.js';
import { AccountAggregatorAuthService } from '../../services/aa-auth.service.js';
import { LLMService } from '../../services/llm.service.js';
import { HashService } from '../../services/hash.service.js';
import { GSTVerificationService } from '../../services/gst.service.js';
import { LogisticsVerificationService } from '../../services/logistics.service.js';
import { AccountAggregatorService } from '../account-aggregator/aa.service.js';
import { UnderwritingService } from '../underwriting/underwriting.service.js';
import { FraudService } from '../fraud/fraud.service.js';
import { RepaymentService } from '../repayment/repayment.service.js';
import { SuccessionService } from '../succession/succession.service.js';

@Module({
  name: 'planner',
  description: 'Intelligent Financial Orchestrator',
  controllers: [
    PlannerController,
    PlannerPromptsController
  ],
  providers: [
    AccountAggregatorAuthService,
    LLMService,
    HashService,
    GSTVerificationService,
    LogisticsVerificationService,
    AccountAggregatorService,
    UnderwritingService,
    FraudService,
    RepaymentService,
    SuccessionService
  ]
})
export class PlannerModule {}
