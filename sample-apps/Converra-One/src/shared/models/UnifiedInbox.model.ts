import { Message } from '../interfaces/Message.interface.js';
import { Conversation } from '../interfaces/Conversation.interface.js';
import { PlatformType } from '../enums/platform.enum.js';

export class UnifiedInboxModel {
  public conversations: Conversation[];
  public activePlatformFilter?: PlatformType;
  public totalUnread: number;

  constructor(conversations: Conversation[] = []) {
    this.conversations = conversations;
    this.totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  }

  public getFiltered(platform?: PlatformType): Conversation[] {
    if (!platform) return this.conversations;
    return this.conversations.filter(c => c.platform === platform);
  }
}
