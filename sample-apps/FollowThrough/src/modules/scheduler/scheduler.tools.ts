import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { SchedulerService } from './scheduler.service.js';
import { StoreService } from '../store/store.service.js';

@Injectable({ deps: [SchedulerService, StoreService] })
export class SchedulerTools {
  constructor(
    private scheduler: SchedulerService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'simulate_days_passing',
    description:
      'Advances the internal clock by N days and runs one scheduler poll. This is the demo control that makes a week of chasing observable in seconds. In production the scheduler polls itself on a real interval (SCHEDULER_INTERVAL_MS) \u2014 this tool exists so the full open \u2192 nudge \u2192 escalate lifecycle can be shown live.',
    inputSchema: z.object({
      days: z.number().int().positive().describe('Number of days to fast-forward'),
    }),
    examples: {
      request: { days: 3 },
      response: { virtual_today: '2026-08-01', checked: 3, actions: [{ action: 'nudge_1' }] },
    },
  })
  async simulateDaysPassing(input: { days: number }, ctx: ExecutionContext) {
    const next = this.store.advanceVirtualToday(input.days);
    const report = await this.scheduler.tick(next);
    ctx.logger.info('Simulated days passing', { days: input.days, today: next, actions: report.actions.length });
    return { virtual_today: next, ...report };
  }

  @Tool({
    name: 'reset_demo',
    description:
      'Wipes the commitment store, ticket store, and resets the virtual clock to today. Use this to restart the demo scenario cleanly.',
    inputSchema: z.object({}),
  })
  async resetDemo(_input: Record<string, never>, ctx: ExecutionContext) {
    this.store.clearAll();
    ctx.logger.info('Demo state reset');
    return { reset: true, virtual_today: this.store.getVirtualToday() };
  }
}
