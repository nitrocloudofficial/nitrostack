import { Module } from '@nitrostack/core';
import { InstantPulseExceptionFilter } from './filters/instantpulse.filter.js';
import { OfficerGuard } from './guards/officer.guard.js';
import { ApplicationStore } from './store/application.store.js';

/**
 * Shared infrastructure. ApplicationStore is a singleton on purpose — it is the
 * one place application state lives, so every module must resolve the same
 * instance rather than its own copy.
 */
@Module({
  name: 'common',
  description: 'Shared application state, guards and exception handling',
  providers: [ApplicationStore, OfficerGuard, InstantPulseExceptionFilter],
  exports: [ApplicationStore, OfficerGuard, InstantPulseExceptionFilter],
})
export class CommonModule {}
