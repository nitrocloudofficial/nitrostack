import { GitHubClient } from './client.js';
import { GitHubMapper } from './mapper.js';
import { Message } from '../../shared/interfaces/Message.interface.js';

export class GitHubService {
  private client: GitHubClient;

  constructor() {
    this.client = new GitHubClient();
  }

  public async getMessages(): Promise<Message[]> {
    const raw = await this.client.fetchNotifications();
    return raw.map(GitHubMapper.toUnifiedMessage);
  }
}
