import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { analyticsService } from './analytics.service.js';

export class AnalyticsTools {
  @Tool({
    name: 'analytics_metrics',
    description: 'Get enterprise usage metrics - requests, success rate, top intents, top agents, response times',
    parameters: z.object({}),
  })
  async getMetrics(ctx: ExecutionContext) {
    const metrics = analyticsService.getMetrics();
    return { content: [{ type: 'text' as const, text: JSON.stringify(metrics, null, 2) }] };
  }

  @Tool({
    name: 'analytics_events',
    description: 'Get recent analytics events with optional type filter',
    parameters: z.object({
      limit: z.number().optional().describe('Max events to return (default 50)'),
      type: z.string().optional().describe('Filter by event type'),
    }),
  })
  async getEvents(ctx: ExecutionContext) {
    const { limit, type } = ctx.params as { limit?: number; type?: string };
    const events = analyticsService.getEvents(limit || 50, type);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ count: events.length, events }, null, 2) }] };
  }

  @Tool({
    name: 'analytics_timeseries',
    description: 'Get hourly request time series data for charting and analysis',
    parameters: z.object({
      hours: z.number().optional().describe('Number of hours to look back (default 24)'),
    }),
  })
  async getTimeSeries(ctx: ExecutionContext) {
    const { hours } = ctx.params as { hours?: number };
    const series = analyticsService.getTimeSeries(hours || 24);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ series }, null, 2) }] };
  }

  @Tool({
    name: 'analytics_track',
    description: 'Track a custom analytics event',
    parameters: z.object({
      type: z.string().describe('Event type'),
      category: z.string().describe('Event category'),
      metadata: z.string().optional().describe('Additional metadata as JSON string'),
    }),
  })
  async trackEvent(ctx: ExecutionContext) {
    const { type, category, metadata } = ctx.params as { type: string; category: string; metadata?: string };
    let meta: Record<string, unknown> = {};
    if (metadata) { try { meta = JSON.parse(metadata); } catch { meta = { raw: metadata }; } }
    analyticsService.trackEvent(type, category, meta);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Event tracked' }, null, 2) }] };
  }

  @Tool({
    name: 'analytics_reset',
    description: 'Reset all analytics data',
    parameters: z.object({}),
  })
  async reset(ctx: ExecutionContext) {
    analyticsService.reset();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Analytics reset' }, null, 2) }] };
  }
}
