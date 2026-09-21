import { Module } from '@nitrostack/core';
import { FraudTools } from '../../tools/FraudTools.js';
import { FraudResources } from '../../resources/FraudResources.js';
import { FraudPrompts } from '../../prompts/index.js';
import { DatasetService } from '../../services/DatasetService.js';
import { MongoService } from '../../services/MongoService.js';
import { AIService } from '../../services/AIService.js';
import { ImageVerificationService } from '../../services/ImageVerificationService.js';
import { Ledger } from '../../domain/Ledger.js';
import { RuleEngine } from '../../rules/index.js';

@Module({
  name: 'fraud-interception',
  description: 'Live Fraud Interception Agent Module',
  controllers: [FraudTools, FraudResources, FraudPrompts],
  providers: [
    FraudResources,
    FraudPrompts,
    DatasetService,
    MongoService,
    AIService,
    ImageVerificationService,
    Ledger,
    RuleEngine
  ]
})
export class FraudModule {}
