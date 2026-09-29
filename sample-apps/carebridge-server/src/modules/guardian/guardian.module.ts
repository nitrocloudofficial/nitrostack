import { Module } from '@nitrostack/core';
import { GuardianTools } from './guardian.tools.js';

/**
 * Guardian AI Module - Person 1 Lead
 * Responsibilities:
 * - Compare current patient health data against baseline
 * - Detect sleep, heart rate, activity, and meal pattern deviations
 * - Combine multiple signals into Guardian alerts
 */
@Module({
  name: 'guardian',
  description: 'Guardian AI module for passive health monitoring and baseline deviation detection',
  controllers: [GuardianTools],
  providers: [GuardianTools],
  exports: [GuardianTools]
})
export class GuardianModule {}
