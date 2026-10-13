import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import {
  GoogleCalendarProvider,
  SecondaryCalendarProvider,
  CalendarProvider,
} from './calendar-provider.interface.js';

@Injectable({ deps: [FinanceStore] })
export class CalendarTools {
  private primaryProvider: CalendarProvider = new GoogleCalendarProvider();
  private secondaryProvider: CalendarProvider = new SecondaryCalendarProvider();

  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'sync_calendar_event',
    description:
      'Sync a financial deadline (SIP due date, bill due date, debt settlement deadline) to Google Calendar (primary) and optionally mirror it to a secondary calendar (university/work calendar).',
    inputSchema: z.object({
      title: z.string().describe('Title of the event, e.g. "Rent Payment Due"'),
      description: z.string().optional().describe('Description of the event'),
      date: z.string().describe('Target deadline date, YYYY-MM-DD'),
      category: z
        .enum(['sip_due', 'bill_due', 'settlement_deadline', 'general'])
        .default('general')
        .describe('Category of deadline'),
      mirror_to_secondary: z
        .boolean()
        .default(true)
        .describe('Whether to mirror the event to secondary calendar (e.g. University/Work calendar)'),
    }),
  })
  async syncCalendarEvent(input: any, ctx: ExecutionContext) {
    const payload = {
      title: input.title,
      description: input.description,
      date: input.date,
      category: input.category || 'general',
    };

    // Primary Google Calendar sync
    const primaryResult = await this.primaryProvider.syncEvent(payload);

    let secondaryResult = null;
    if (input.mirror_to_secondary) {
      secondaryResult = await this.secondaryProvider.syncEvent(payload);
    }

    const record = this.store.addCalendarRecord({
      title: input.title,
      description: input.description,
      date: input.date,
      category: input.category || 'general',
      primary_event_id: primaryResult.id,
      secondary_event_id: secondaryResult?.id,
    });

    ctx.logger.info('Synced calendar event', {
      event_id: record.id,
      primary_id: primaryResult.id,
      secondary_id: secondaryResult?.id,
    });

    return {
      record_id: record.id,
      title: input.title,
      date: input.date,
      category: input.category,
      primary_calendar: {
        provider: this.primaryProvider.name,
        event_id: primaryResult.id,
        link: primaryResult.event_link,
      },
      secondary_calendar: secondaryResult
        ? {
            provider: this.secondaryProvider.name,
            event_id: secondaryResult.id,
            link: secondaryResult.event_link,
          }
        : null,
      status: 'synced_and_mirrored',
    };
  }
}
