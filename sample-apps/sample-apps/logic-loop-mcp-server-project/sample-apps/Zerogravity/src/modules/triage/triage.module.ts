import { Module } from '@nitrostack/core';
import { TriageService } from './triage.service.js';
import { TriageTools } from './triage.tools.js';

@Module({
  name: 'triage',
  description: 'Patient symptom analysis and urgency assessment',
  controllers: [TriageTools],
  providers: [TriageService],
  exports: [TriageService]
})
export class TriageModule {}
