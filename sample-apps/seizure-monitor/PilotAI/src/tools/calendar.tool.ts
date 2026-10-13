import { ToolDecorator as Tool, UseMiddleware, UsePipes, ExecutionContext, z } from '@nitrostack/core';
import { LoggingMiddleware, ValidationPipe } from '../middleware/logger.middleware.js';

/**
 * Calendar Integration MCP Action
 *
 * Accepts event details and creates a calendar reminder for a meeting or
 * project deadline. Uses a real provider when CALENDAR_API_KEY /
 * CALENDAR_WEBHOOK_URL is configured, otherwise falls back to a mocked
 * event so the feature is demoable without external credentials.
 */

function buildIcs(input: any, uid: string): string {
  const toIcsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ProjectPilot AI//Calendar Tool//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(input.start_time)}`,
    `DTEND:${toIcsDate(input.end_time)}`,
    `SUMMARY:${input.title}`,
    input.description ? `DESCRIPTION:${input.description.replace(/\n/g, '\\n')}` : '',
    input.location ? `LOCATION:${input.location}` : '',
    input.attendees?.length ? `ATTENDEE:${input.attendees.join(',')}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\r\n');
}

async function createRealEvent(input: any, apiKey: string): Promise<{ eventId: string; provider: string } | null> {
  const webhookUrl = process.env.CALENDAR_WEBHOOK_URL;
  if (!webhookUrl) return null;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(`Calendar provider responded with ${response.status}`);
  }

  const data = (await response.json()) as { eventId?: string };
  return { eventId: data.eventId || `evt_${Date.now()}`, provider: 'calendar-webhook' };
}

export class CalendarTools {
  @Tool({
    name: 'schedule_calendar_event',
    description: 'Schedules a calendar event/reminder for a meeting or project deadline given a title, start/end time, and attendees. Uses a real calendar webhook if configured, otherwise returns a mocked event for demo purposes.',
    inputSchema: z.object({
      title: z.string().describe('Event title'),
      start_time: z.string().describe('ISO 8601 start datetime'),
      end_time: z.string().describe('ISO 8601 end datetime'),
      attendees: z.array(z.string()).optional().describe('Attendee emails or names'),
      description: z.string().optional().describe('Event description'),
      location: z.string().optional().describe('Event location or meeting link')
    }),
    examples: {
      request: {
        title: 'Sprint Planning',
        start_time: '2026-08-01T15:00:00.000Z',
        end_time: '2026-08-01T15:30:00.000Z',
        attendees: ['alice@example.com', 'bob@example.com']
      },
      response: {
        status: 'mocked',
        event: { eventId: 'evt_mock_1', title: 'Sprint Planning' }
      }
    }
  })
  @UseMiddleware(LoggingMiddleware)
  @UsePipes(ValidationPipe)
  async scheduleCalendarEvent(input: any, ctx: ExecutionContext) {
    if (new Date(input.end_time).getTime() <= new Date(input.start_time).getTime()) {
      throw new Error('end_time must be after start_time');
    }

    const uid = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const apiKey = process.env.CALENDAR_API_KEY;

    let status: 'created' | 'mocked' = 'mocked';
    let provider = 'mock';
    let eventId = uid;

    if (apiKey) {
      try {
        const real = await createRealEvent(input, apiKey);
        if (real) {
          status = 'created';
          provider = real.provider;
          eventId = real.eventId;
        }
      } catch (error) {
        ctx.logger.error('Real calendar integration failed, falling back to mock', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    ctx.logger.info(`Calendar event ${status}`, { eventId, title: input.title });

    return {
      status,
      provider,
      event: {
        eventId,
        title: input.title,
        start_time: input.start_time,
        end_time: input.end_time,
        attendees: input.attendees ?? [],
        description: input.description ?? null,
        location: input.location ?? null
      },
      ics: buildIcs(input, eventId),
      note:
        status === 'mocked'
          ? 'CALENDAR_API_KEY / CALENDAR_WEBHOOK_URL not configured — returning a mocked event for demo purposes.'
          : 'Event created via configured calendar provider.'
    };
  }
}
