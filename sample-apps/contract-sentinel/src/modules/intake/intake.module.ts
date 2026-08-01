import { Module } from '@nitrostack/core';
import { ClauseExtractorService } from './clause-extractor.service.js';
import { ContractStoreService } from './contract-store.service.js';
import { IntakeTools } from './intake.tools.js';

@Module({
  name: 'intake',
  description: 'Company profile context plus contract ingestion and clause parsing',
  controllers: [IntakeTools],
  providers: [ClauseExtractorService, ContractStoreService],
  exports: [ClauseExtractorService, ContractStoreService],
})
export class IntakeModule {}
