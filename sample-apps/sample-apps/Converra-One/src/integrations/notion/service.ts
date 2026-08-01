import { NotionClient } from './client.js';
import { NotionMapper } from './mapper.js';
import { Message } from '../../shared/interfaces/Message.interface.js';

export class NotionService {
  private client: NotionClient;

  constructor() {
    this.client = new NotionClient();
  }

  public async getMessages(): Promise<Message[]> {
    const raw = await this.client.fetchPages();
    return raw.map(NotionMapper.toUnifiedMessage);
  }
}
