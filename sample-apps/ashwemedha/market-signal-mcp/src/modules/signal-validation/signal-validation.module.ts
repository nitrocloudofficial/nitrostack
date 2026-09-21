import { Module } from '@nitrostack/core';
import { SignalValidationTools }   from './signal-validation.tools.js';
import { CalendarChecksResources } from './calendar-checks.resource.js';

@Module({
  name: 'signal-validation',
  description:
    'Phase 2 — Signal Validation Agent: Checks Finnhub earnings calendar, economic events, ' +
    'and historical correlations for video stock predictions. ' +
    'Owns and writes to video://calendar-checks Resource.',
  controllers: [SignalValidationTools, CalendarChecksResources],
})
export class SignalValidationModule {}
