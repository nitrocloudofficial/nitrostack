import { RateLimiterService } from '../../services/RateLimiter.service.js';
import { AuthenticationManagerService } from '../../services/AuthenticationManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { GoogleCalendarEventRaw } from './types.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export class GoogleCalendarClient {
  private rateLimiter: RateLimiterService;
  private authManager: AuthenticationManagerService;

  constructor() {
    this.rateLimiter = RateLimiterService.getInstance();
    this.authManager = AuthenticationManagerService.getInstance();
  }

  public async fetchEvents(): Promise<GoogleCalendarEventRaw[]> {
    return this.rateLimiter.executeWithRateLimit(PlatformType.CALENDAR, async () => {
      const enableDemo = process.env.ENABLE_DEMO_MODE === 'true';
      const creds = this.authManager.getCredentials(PlatformType.CALENDAR);

      if (enableDemo || !creds.isAuthorized) {
        const events = DemoStoreService.getInstance().getCalendarEvents();
        return events.map(e => ({
          id: e.id,
          summary: e.title,
          description: e.description,
          start: { dateTime: new Date(e.startTime).toISOString() },
          end: { dateTime: new Date(e.endTime).toISOString() },
          location: e.location,
          hangoutLink: e.meetingUrl,
          organizer: { email: e.organizer?.email || 'e.vance@stanford.edu', displayName: e.organizer?.name || 'Organizer' }
        }));
      }


      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: { Authorization: `Bearer ${creds.accessToken}` }
      });
      if (!res.ok) throw new Error(`Calendar API HTTP ${res.status}`);
      const data = await res.json() as { items?: GoogleCalendarEventRaw[] };
      return data.items || [];
    });
  }
}
