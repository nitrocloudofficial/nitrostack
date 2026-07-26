import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Notification } from '../shared/notification.types.js';
import { GoogleAuthHelper } from '../shared/google-auth.helper.js';

export function getMockCalendarEvents(): Notification[] {
  const now = new Date();
  const upcomingMeetingTime = new Date(now.getTime() + 40 * 60 * 1000);
  const pastMeetingTime = new Date(now.getTime() - 4 * 60 * 1000 * 60);
  const futureMeetingTime = new Date(now.getTime() + 24 * 60 * 1000 * 60);

  return [
    {
      id: 'cal_1',
      source: 'calendar',
      sender: 'Sarah Chen',
      title: 'Project Focus Launch Sync',
      snippet: 'Final check-in on prioritizer module and Next.js widgets before launch. Agenda: Review priorities, test widget display.',
      timestamp: upcomingMeetingTime.toISOString(),
      link: 'https://zoom.us/j/9876543210',
      accountId: 'default',
      accountEmail: null,
      rawMetadata: { durationMinutes: 30, location: 'Zoom', status: 'accepted' }
    },
    {
      id: 'cal_2',
      source: 'calendar',
      sender: 'Engineering Team',
      title: 'Daily Standup',
      snippet: 'Daily update on ongoing sprints, blockers, and deployment schedules.',
      timestamp: pastMeetingTime.toISOString(),
      link: 'https://zoom.us/j/111222333',
      accountId: 'default',
      accountEmail: null,
      rawMetadata: { durationMinutes: 15, location: 'Google Meet', status: 'accepted' }
    },
    {
      id: 'cal_3',
      source: 'calendar',
      sender: 'HR Department',
      title: 'All Hands Q3 Planning',
      snippet: 'Quarterly review of company goals, product roadmap, and upcoming hiring targets.',
      timestamp: futureMeetingTime.toISOString(),
      link: 'https://zoom.us/j/444555666',
      accountId: 'default',
      accountEmail: null,
      rawMetadata: { durationMinutes: 60, location: 'Zoom', status: 'tentative' }
    }
  ];
}

export class CalendarTools {
  @Tool({
    name: 'fetchCalendarEvents',
    description: 'Fetch upcoming and recent calendar events (meetings), optionally since a specific ISO 8601 timestamp.',
    inputSchema: z.object({
      since: z.string().optional().describe('Optional ISO 8601 timestamp to fetch events since')
    })
  })
  async fetchCalendarEvents(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching calendar events', { since: input.since });

    const token = await GoogleAuthHelper.getValidAccessToken();
    if (!token) {
      ctx.logger.info('Google token not found, falling back to mock calendar events');
      return this.getMockEvents(input.since);
    }

    try {
      const timeMin = input.since ? new Date(input.since).toISOString() : new Date().toISOString();
      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=15&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!calRes.ok) {
        throw new Error(`Google Calendar API list events failed: ${await calRes.text()}`);
      }

      const data = await calRes.json() as any;
      const items = data.items || [];
      const notifications: Notification[] = [];

      for (const item of items) {
        const start = item.start?.dateTime || item.start?.date;
        if (!start) continue;

        notifications.push({
          id: item.id,
          source: 'calendar',
          sender: item.organizer?.displayName || item.organizer?.email || 'Calendar Event',
          title: item.summary || '(No Title)',
          snippet: item.description || `Location: ${item.location || 'No location specified'}`,
          timestamp: new Date(start).toISOString(),
          link: item.htmlLink || 'https://calendar.google.com',
          accountId: 'google_active',
          accountEmail: null,
          rawMetadata: {
            location: item.location,
            status: item.status,
            creator: item.creator?.email
          }
        });
      }

      return { notifications };
    } catch (err) {
      ctx.logger.error('Failed to fetch real Google Calendar events', { error: String(err) });
      return this.getMockEvents(input.since);
    }
  }

  private getMockEvents(since?: string) {
    return { notifications: [] };
  }
}
