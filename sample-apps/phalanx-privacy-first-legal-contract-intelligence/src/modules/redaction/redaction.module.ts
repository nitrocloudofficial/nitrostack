import { Module } from '@nitrostack/core';
import { RedactionTools } from './redaction.tools.js';
import { ClassifierService } from './classifier.service.js';
import { RedactionService } from './redaction.service.js';
import { SessionVaultService } from './session-vault.service.js';
import { NerClientService } from './ner.service.js';
import { IngestionModule } from '../ingestion/ingestion.module.js';

@Module({
  name: 'redaction',
  imports: [IngestionModule],
  controllers: [RedactionTools],
  providers: [ClassifierService, RedactionService, SessionVaultService, NerClientService],
  exports: [ClassifierService, RedactionService, SessionVaultService, NerClientService]
})
export class RedactionModule {}
