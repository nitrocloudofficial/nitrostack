import { Module } from '@nitrostack/core';
import { EvidenceService } from './evidence.service.js';
import { EvidenceTools } from './evidence.tools.js';

@Module({
  name: 'evidence',
  description: 'Slack/email evidence search: real providers with fixture fallback',
  controllers: [EvidenceTools],
  providers: [EvidenceService],
})
export class EvidenceModule {}
