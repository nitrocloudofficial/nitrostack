import { Module } from '@nitrostack/core';
import { MfApiClient } from '../../clients/mfapi.js';
import { NavCacheService } from './growth.service.js';
import { GrowthTools } from './growth.tools.js';

@Module({
  name: 'growth',
  description: 'Live NAV-based investment growth projections',
  providers: [MfApiClient, NavCacheService],
  controllers: [GrowthTools]
})
export class GrowthModule {}
