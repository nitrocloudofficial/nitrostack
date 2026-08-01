import { IntegrationAdapter, PlatformStatusResult } from '../../services/ConnectorManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { GmailService } from './service.js';

export class GmailIntegrationAdapter implements IntegrationAdapter {
  public platform = PlatformType.GMAIL;
  private service: GmailService;

  constructor() {
    this.service = new GmailService();
  }

  public async fetchMessages(): Promise<Message[]> {
    return this.service.getMessages();
  }

  public async getStatus(): Promise<PlatformStatusResult> {
    return {
      platform: PlatformType.GMAIL,
      name: 'Gmail Production Connector',
      status: 'connected',
      lastSync: 'Just now',
      account: process.env.GMAIL_USER_EMAIL || 'alex.mercer@converra.io',
      activeCount: 14
    };
  }
}
