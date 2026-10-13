import { DiscordClient } from './client.js';
import { DiscordMapper } from './mapper.js';
import { Message } from '../../shared/interfaces/Message.interface.js';

export class DiscordService {
  private client: DiscordClient;

  constructor() {
    this.client = new DiscordClient();
  }

  public async getMessages(): Promise<Message[]> {
    const raw = await this.client.fetchMessages();
    return raw.map(DiscordMapper.toUnifiedMessage);
  }
}
