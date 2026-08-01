import { Message } from '../interfaces/Message.interface.js';

export class MessageUtilities {
  public static truncateContent(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  }

  public static extractKeywords(content: string): string[] {
    const words = content.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'to', 'for']);
    return Array.from(new Set(words.filter(w => w.length > 3 && !stopWords.has(w))));
  }

  public static sanitizeMessage(message: Message): Message {
    return {
      ...message,
      content: message.content.trim()
    };
  }
}
