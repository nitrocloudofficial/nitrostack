import { Module } from '@nitrostack/core';
import { ImpactService } from './impact.service.js';
import { ImpactTools } from './impact.tools.js';
import { SentinelModule } from '../sentinel/sentinel.module.js';
import { SharedModule } from '../../shared/shared.module.js';

/**
 * Impact Module
 * Impact Analysis Agent
 *
 * Evaluates which specific in-transit orders, inventory components, and manufacturing
 * lines are vulnerable to the detected disruption and calculates the financial/time
 * delay impact.
 */
@Module({
  name: 'impact',
  description: 'Impact Analysis Agent - vulnerability assessment and damage quantification',
  imports: [SharedModule, SentinelModule],
  providers: [ImpactService],
  controllers: [ImpactTools],
})
export class ImpactModule {}
