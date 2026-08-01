import { Message } from '../shared/interfaces/Message.interface.js';

export interface IndexedDocument {
  id: string;
  title: string;
  content: string;
  platform: string;
  timestamp: Date;
  keywords: string[];
}

export class SearchIndexBuilderService {
  private static instance: SearchIndexBuilderService;
  private index: Map<string, IndexedDocument>;

  constructor() {
    this.index = new Map();
  }

  public static getInstance(): SearchIndexBuilderService {
    if (!SearchIndexBuilderService.instance) {
      SearchIndexBuilderService.instance = new SearchIndexBuilderService();
    }
    return SearchIndexBuilderService.instance;
  }

  public buildIndex(messages: Message[]): void {
    messages.forEach((msg) => {
      const keywords = (msg.subject + ' ' + msg.content)
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3);

      this.index.set(msg.id, {
        id: msg.id,
        title: msg.subject || 'Direct Message',
        content: msg.content,
        platform: msg.platform,
        timestamp: new Date(msg.timestamp),
        keywords: Array.from(new Set(keywords))
      });
    });
  }

  public getIndexedCount(): number {
    return this.index.size;
  }
}
