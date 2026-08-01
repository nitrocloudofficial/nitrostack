import { IntegrationAdapter, PlatformStatusResult } from '../../services/ConnectorManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { SlackService } from './service.js';

export class SlackIntegrationAdapter implements IntegrationAdapter {
  public platform = PlatformType.SLACK;
  private service: SlackService;

  constructor() {
    this.service = new SlackService();
  }

  public async fetchMessages(): Promise<Message[]> {
    return this.service.getMessages();
  }

  public async getStatus(): Promise<PlatformStatusResult> {
    return {
      platform: PlatformType.SLACK,
      name: 'Slack HQ Connector',
      status: 'connected',
      lastSync: 'Just now',
      account: '#engineering-core',
      activeCount: 28
    };
  }
}
