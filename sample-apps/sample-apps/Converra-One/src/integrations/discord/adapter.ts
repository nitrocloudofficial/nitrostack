import { IntegrationAdapter, PlatformStatusResult } from '../../services/ConnectorManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { DiscordService } from './service.js';

export class DiscordIntegrationAdapter implements IntegrationAdapter {
  public platform = PlatformType.DISCORD;
  private service: DiscordService;

  constructor() {
    this.service = new DiscordService();
  }

  public async fetchMessages(): Promise<Message[]> {
    return this.service.getMessages();
  }

  public async getStatus(): Promise<PlatformStatusResult> {
    return {
      platform: PlatformType.DISCORD,
      name: 'Discord Devs Connector',
      status: 'connected',
      lastSync: '3 mins ago',
      account: 'AlexM#4920',
      activeCount: 8
    };
  }
}
