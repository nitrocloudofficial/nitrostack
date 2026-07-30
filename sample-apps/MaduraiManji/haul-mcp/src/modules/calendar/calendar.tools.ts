import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { google } from 'googleapis';
import { db } from '../../db/database.js';

export class CalendarTools {
  @Tool({
    name: 'create_calendar_event',
    description: `Use this to schedule meetings, deadlines, or events in Google Calendar. 
Call this when the user says things like "schedule a review meeting on 28th July at 10 AM", "add a deadline for submission on Friday at 5 PM", or "book a call tomorrow at 3 PM".
You must provide the start and end time as ISO 8601 strings. If only a date is given, default to 9 AM–10 AM on that date.
Today's date context: always use the current year when no year is mentioned.`,
    inputSchema: z.object({
      summary: z.string().describe('Title of the calendar event (e.g. "Sprint Review Meeting")'),
      description: z.string().describe('Short description of the event purpose'),
      startTime: z.string().describe('ISO 8601 start datetime string, e.g. "2026-07-28T10:00:00"'),
      endTime: z.string().describe('ISO 8601 end datetime string, e.g. "2026-07-28T11:00:00"')
    })
  })
  async createCalendarEvent(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Creating calendar event: "${input.summary}" at ${input.startTime}`);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: input.summary,
          description: input.description,
          start: { dateTime: input.startTime },
          end: { dateTime: input.endTime }
        }
      });

      const eventLink = response.data.htmlLink;

      db.run(
        `INSERT INTO calendar_events (summary, description, start_time, end_time, event_link, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [input.summary, input.description, input.startTime, input.endTime, eventLink, 'upcoming']
      );

      return {
        success: true,
        message: `📅 Calendar event scheduled!\n\nTitle: ${input.summary}\nStart: ${input.startTime}\nEnd: ${input.endTime}\nLink: ${eventLink}\n\n— Haul makes life easier 🚀`,
      };
    } catch (e: any) {
      ctx.logger.error('Failed to create calendar event', e);
      db.run(
        `INSERT INTO calendar_events (summary, description, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)`,
        [input.summary, input.description, input.startTime, input.endTime, 'error']
      );
      return { success: false, message: `Failed to create Google Calendar event: ${e.message}\n\n— Haul makes life easier 🚀` };
    }
  }

  @Tool({
    name: 'list_calendar_events',
    description: `Show all scheduled calendar events. Use when the user asks "what meetings do we have?", "show scheduled events", or "list all calendar entries".`,
    inputSchema: z.object({})
  })
  async listCalendarEvents(_input: any, ctx: ExecutionContext) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM calendar_events ORDER BY start_time ASC`, (err: Error | null, rows: any[]) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve({ message: 'No calendar events found.\n\n— Haul makes life easier 🚀' });

        let mdTable = '| Summary | Start Time | End Time | Link |\n|---|---|---|---|\n';
        rows.forEach(r => {
          const start = new Date(r.start_time).toLocaleString();
          const end = new Date(r.end_time).toLocaleString();
          const link = r.event_link ? `[Link](${r.event_link})` : '—';
          mdTable += `| ${r.summary} | ${start} | ${end} | ${link} |\n`;
        });

        resolve({
          message: `### 📅 Calendar Schedule\n\n${mdTable}\n\n— Haul makes life easier 🚀`
        });
      });
    });
  }
}
