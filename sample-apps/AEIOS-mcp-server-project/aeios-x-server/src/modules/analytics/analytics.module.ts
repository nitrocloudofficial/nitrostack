import { Module } from '@nitrostack/core';
import { AnalyticsTools } from './analytics.tools.js';
import { AnalyticsResources } from './analytics.resources.js';

@Module({
  name: 'analytics',
  description: 'Enterprise Analytics Engine - usage metrics, event tracking, time series data',
  controllers: [AnalyticsTools, AnalyticsResources],
})
export class AnalyticsModule {}
