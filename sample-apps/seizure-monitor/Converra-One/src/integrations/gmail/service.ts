import { GmailClient } from './client.js';
import { GmailMapper } from './mapper.js';
import { Message } from '../../shared/interfaces/Message.interface.js';

export class GmailService {
  private client: GmailClient;

  constructor() {
    this.client = new GmailClient();
  }

  public async getMessages(): Promise<Message[]> {
    const raw = await this.client.fetchMessages();
    return raw.map(GmailMapper.toUnifiedMessage);
  }
}
