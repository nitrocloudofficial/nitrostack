import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { analyticsService } from './analytics.service.js';

export class AnalyticsResources {
  @Resource({
    uri: 'aeios://analytics/dashboard',
    name: 'Analytics Dashboard',
    description: 'Real-time enterprise analytics dashboard with usage metrics and trends',
    mimeType: 'application/json',
  })
  async dashboard(ctx: ExecutionContext) {
    const metrics = analyticsService.getMetrics();
    const timeSeries = analyticsService.getTimeSeries(24);
    const recentEvents = analyticsService.getEvents(10);

    return {
      contents: [{
        uri: 'aeios://analytics/dashboard',
        mimeType: 'application/json',
        text: JSON.stringify({ metrics, timeSeries, recentEvents }, null, 2),
      }],
    };
  }
}
