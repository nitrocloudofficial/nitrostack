import { Module } from '@nitrostack/core';
import { AnalyticsTools } from './analytics.tools.js';

@Module({
  name: 'analytics',
  description: 'AI Executive Insights & Realtime Dashboards',
  controllers: [AnalyticsTools],
})
export class AnalyticsModule {}
