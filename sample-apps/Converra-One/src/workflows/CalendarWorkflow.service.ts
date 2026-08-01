import { CalendarAgent } from '../modules/calendar/CalendarAgent.js';
import { CalendarEvent } from '../shared/interfaces/CalendarEvent.interface.js';

export class CalendarWorkflowService {
  private calendarAgent: CalendarAgent;

  constructor() {
    this.calendarAgent = new CalendarAgent();
  }

  public async getTodayEvents(): Promise<CalendarEvent[]> {
    const response = await this.calendarAgent.execute({ action: 'GET_EVENTS' });
    return response.data?.events || [];
  }

  public async createReminder(title: string, startTime: Date): Promise<CalendarEvent> {
    const response = await this.calendarAgent.execute({ action: 'CREATE_REMINDER', title, startTime });
    if (!response.success || !response.data?.createdEvent) {
      throw new Error(response.error || 'Failed to create calendar reminder');
    }
    return response.data.createdEvent;
  }
}
