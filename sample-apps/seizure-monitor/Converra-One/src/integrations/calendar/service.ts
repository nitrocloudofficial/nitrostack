import { GoogleCalendarClient } from './client.js';
import { GoogleCalendarMapper } from './mapper.js';
import { CalendarEvent } from '../../shared/interfaces/CalendarEvent.interface.js';

export class GoogleCalendarService {
  private client: GoogleCalendarClient;

  constructor() {
    this.client = new GoogleCalendarClient();
  }

  public async getEvents(): Promise<CalendarEvent[]> {
    const raw = await this.client.fetchEvents();
    return raw.map(GoogleCalendarMapper.toCalendarEvent);
  }
}
