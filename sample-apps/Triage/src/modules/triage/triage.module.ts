// src/modules/triage/triage.module.ts
import { Module } from '@nitrostack/core';
import { TriageService } from './triage.service.js';
import { TriageTools } from './triage.tools.js';
import { TriageTasks } from './triage.tasks.js';

@Module({
  name: 'triage',
  description: 'Triage service for analyzing symptoms and vitals',
  controllers: [TriageTools],
  providers: [TriageService],
})
export class TriageModule {}