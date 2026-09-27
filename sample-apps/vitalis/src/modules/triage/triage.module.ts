import { Module } from '@nitrostack/core';
import { TriageTools } from './triage.tools.js';
import { TriageService } from './triage.service.js';

@Module({
  name: 'triage',
  description: 'Triage module — rule-based clinical symptom evaluation and emergency screening',
  controllers: [TriageTools],
  providers: [TriageService],
  exports: [TriageService],
})
export class TriageModule {}
