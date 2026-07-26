import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { google } from 'googleapis';

function getCalendarClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  return google.calendar({ version: 'v3', auth: oAuth2Client });
}

export class CalendarTools {
  @Tool({
    name: 'get_current_date',
    description: 'Get the current date and time in ISO 8601 format. Always call this first before calculating relative dates like "today", "tomorrow", or "next week".',
    inputSchema: z.object({})
  })
  async getCurrentDate() {
    return { currentDateTime: new Date().toISOString() };
  }

  @Tool({
    name: 'check_availability',
    description: 'Check free/busy status on Google Calendar for a given time range',
    inputSchema: z.object({
      timeMin: z.string().describe('Start of range, ISO 8601 format e.g. 2026-07-26T09:00:00+05:30'),
      timeMax: z.string().describe('End of range, ISO 8601 format e.g. 2026-07-26T18:00:00+05:30')
    })
  })
  async checkAvailability(input: { timeMin: string; timeMax: string }, ctx: ExecutionContext) {
    const calendar = getCalendarClient();
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        items: [{ id: 'primary' }]
      }
    });
    const busy = res.data.calendars?.primary?.busy || [];
    return {
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      busy,
      isFree: busy.length === 0
    };
  }

  @Tool({
    name: 'list_events',
    description: 'List upcoming events on Google Calendar within a time range',
    inputSchema: z.object({
      timeMin: z.string().describe('Start of range, ISO 8601 format'),
      timeMax: z.string().describe('End of range, ISO 8601 format'),
      maxResults: z.number().int().min(1).max(20).default(10).describe('Max number of events to return')
    })
  })
  async listEvents(input: { timeMin: string; timeMax: string; maxResults: number }, ctx: ExecutionContext) {
    const calendar = getCalendarClient();
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      maxResults: input.maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });
    const events = (res.data.items || []).map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date
    }));
    return { events };
  }

  @Tool({
    name: 'create_event',
    description: 'Create a new event on Google Calendar',
    inputSchema: z.object({
      summary: z.string().describe('Event title'),
      start: z.string().describe('Start datetime, ISO 8601 format'),
      end: z.string().describe('End datetime, ISO 8601 format'),
      attendees: z.array(z.string()).optional().describe('List of attendee email addresses')
    })
  })
  async createEvent(
    input: { summary: string; start: string; end: string; attendees?: string[] },
    ctx: ExecutionContext
  ) {
    const calendar = getCalendarClient();
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: input.summary,
        start: { dateTime: input.start },
        end: { dateTime: input.end },
        attendees: input.attendees?.map((email) => ({ email }))
      }
    });
    return {
      status: 'created',
      eventId: res.data.id,
      summary: input.summary,
      start: input.start,
      end: input.end
    };
  }
}