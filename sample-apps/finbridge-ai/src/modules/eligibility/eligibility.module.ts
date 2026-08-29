import { Module } from '@nitrostack/core';
import { EligibilityTools } from './eligibility.tools.js';

@Module({
  name: 'eligibility',
  description: 'Scheme eligibility checks',
  controllers: [EligibilityTools]
})
export class EligibilityModule {}
