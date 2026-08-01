export interface CalendarEventPayload {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  category: 'sip_due' | 'bill_due' | 'settlement_deadline' | 'general';
}

export interface CalendarEventResult {
  id: string;
  provider_name: string;
  status: 'synced' | 'mirrored';
  event_link: string;
}

export interface CalendarProvider {
  name: string;
  syncEvent(payload: CalendarEventPayload): Promise<CalendarEventResult>;
}

export class GoogleCalendarProvider implements CalendarProvider {
  name = 'Google Calendar (Primary)';

  async syncEvent(payload: CalendarEventPayload): Promise<CalendarEventResult> {
    const eventId = `gcal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    return {
      id: eventId,
      provider_name: this.name,
      status: 'synced',
      event_link: `https://calendar.google.com/calendar/event?eid=${eventId}`,
    };
  }
}

export class SecondaryCalendarProvider implements CalendarProvider {
  name = 'University / Work Calendar (Secondary Mirror)';

  async syncEvent(payload: CalendarEventPayload): Promise<CalendarEventResult> {
    const eventId = `secondary_cal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    return {
      id: eventId,
      provider_name: this.name,
      status: 'mirrored',
      event_link: `https://cal.university.edu/event?id=${eventId}`,
    };
  }
}
