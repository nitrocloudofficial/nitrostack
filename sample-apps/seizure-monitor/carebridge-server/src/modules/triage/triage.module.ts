import { Module } from '@nitrostack/core';
import { TriageTools } from './triage.tools.js';

/**
 * Triage AI Module - Person 2 Lead
 * Responsibilities:
 * - Define triage question flow & urgency categories (Emergency, Urgent, Routine evaluation, Monitor/self-care)
 * - Deterministic red-flag safety rule evaluation
 * - Non-diagnostic care navigation framing
 */
@Module({
  name: 'triage',
  description: 'Triage AI module for symptoms assessment, red-flag screening, and care navigation',
  controllers: [TriageTools],
  providers: [TriageTools],
  exports: [TriageTools]
})
export class TriageModule {}
