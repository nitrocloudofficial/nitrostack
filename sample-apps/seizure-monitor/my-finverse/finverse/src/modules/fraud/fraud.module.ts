import { Module } from '@nitrostack/core';
import { FraudService } from './fraud.service.js';
import { FraudController } from './fraud.tools.js';
import { HashService } from '../../services/hash.service.js';
import { GSTVerificationService } from '../../services/gst.service.js';
import { LogisticsVerificationService } from '../../services/logistics.service.js';

@Module({
  name: 'fraud',
  description: 'Fraud Detection Engine',
  controllers: [
    FraudController
  ],
  providers: [
    HashService,
    GSTVerificationService,
    LogisticsVerificationService,
    FraudService
  ]
})
export class FraudModule {}
