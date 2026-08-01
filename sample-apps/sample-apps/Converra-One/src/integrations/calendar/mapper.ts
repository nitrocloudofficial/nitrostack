import { GoogleCalendarEventRaw } from './types.js';
import { CalendarEvent } from '../../shared/interfaces/CalendarEvent.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';

export class GoogleCalendarMapper {
  public static toCalendarEvent(raw: GoogleCalendarEventRaw): CalendarEvent {
    const startTime = new Date(raw.start.dateTime || raw.start.date || Date.now());
    const endTime = new Date(raw.end.dateTime || raw.end.date || Date.now() + 3600000);

    return {
      id: raw.id,
      title: raw.summary || 'Meeting Event',
      description: raw.description,
      startTime,
      endTime,
      isAllDay: !raw.start.dateTime,
      location: raw.location,
      meetingUrl: raw.hangoutLink,
      organizer: raw.organizer ? { name: raw.organizer.displayName, email: raw.organizer.email } : undefined,
      attendees: raw.attendees?.map(a => ({ name: a.displayName, email: a.email, responseStatus: a.responseStatus as any })) || [],
      platform: PlatformType.CALENDAR
    };
  }
}
