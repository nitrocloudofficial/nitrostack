import { IntegrationAdapter, PlatformStatusResult } from '../../services/ConnectorManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { GitHubService } from './service.js';

export class GitHubIntegrationAdapter implements IntegrationAdapter {
  public platform = PlatformType.GITHUB;
  private service: GitHubService;

  constructor() {
    this.service = new GitHubService();
  }

  public async fetchMessages(): Promise<Message[]> {
    return this.service.getMessages();
  }

  public async getStatus(): Promise<PlatformStatusResult> {
    return {
      platform: PlatformType.GITHUB,
      name: 'GitHub Enterprise Connector',
      status: 'connected',
      lastSync: '12 mins ago',
      account: 'converra-labs',
      activeCount: 19
    };
  }
}
