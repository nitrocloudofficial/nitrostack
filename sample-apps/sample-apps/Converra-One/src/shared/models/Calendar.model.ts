import { CalendarEvent } from '../interfaces/CalendarEvent.interface.js';

export class CalendarModel {
  public events: CalendarEvent[];

  constructor(events: CalendarEvent[] = []) {
    this.events = events;
  }

  public getUpcomingEvents(): CalendarEvent[] {
    const now = new Date();
    return this.events.filter(e => new Date(e.startTime) >= now);
  }
}
