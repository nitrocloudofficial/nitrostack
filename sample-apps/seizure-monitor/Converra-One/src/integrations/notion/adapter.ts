import { IntegrationAdapter, PlatformStatusResult } from '../../services/ConnectorManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { NotionService } from './service.js';

export class NotionIntegrationAdapter implements IntegrationAdapter {
  public platform = PlatformType.NOTION;
  private service: NotionService;

  constructor() {
    this.service = new NotionService();
  }

  public async fetchMessages(): Promise<Message[]> {
    return this.service.getMessages();
  }

  public async getStatus(): Promise<PlatformStatusResult> {
    return {
      platform: PlatformType.NOTION,
      name: 'Notion Workspace Connector',
      status: 'connected',
      lastSync: '5 mins ago',
      account: 'Engineering Hub',
      activeCount: 6
    };
  }
}
