import { IntegrationAdapter, PlatformStatusResult } from '../../services/ConnectorManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { GoogleCalendarService } from './service.js';

export class GoogleCalendarIntegrationAdapter implements IntegrationAdapter {
  public platform = PlatformType.CALENDAR;
  private service: GoogleCalendarService;

  constructor() {
    this.service = new GoogleCalendarService();
  }

  public async fetchMessages(): Promise<Message[]> {
    // Calendar events return empty message stream or calendar invite notes
    return [];
  }

  public async getStatus(): Promise<PlatformStatusResult> {
    return {
      platform: PlatformType.CALENDAR,
      name: 'Google Calendar Connector',
      status: 'connected',
      lastSync: 'Just now',
      account: process.env.GMAIL_USER_EMAIL || 'alex.mercer@converra.io',
      activeCount: 4
    };
  }
}
