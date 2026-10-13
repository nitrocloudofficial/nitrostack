import { Module } from '@nitrostack/core';
import { DemographicsService } from './demographics.service.js';

@Module({
  name: 'demographics',
  description: 'Demographics tool - population and income indicators for a zone',
  providers: [DemographicsService],
  exports: [DemographicsService],
})
export class DemographicsModule {}
