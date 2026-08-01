import { SlackClient } from './client.js';
import { SlackMapper } from './mapper.js';
import { Message } from '../../shared/interfaces/Message.interface.js';

export class SlackService {
  private client: SlackClient;

  constructor() {
    this.client = new SlackClient();
  }

  public async getMessages(): Promise<Message[]> {
    const raw = await this.client.fetchMessages();
    return raw.map(SlackMapper.toUnifiedMessage);
  }
}
