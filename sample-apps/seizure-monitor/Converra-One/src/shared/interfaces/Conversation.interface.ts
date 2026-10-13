import { PlatformType } from '../enums/platform.enum.js';
import { PriorityLevel } from '../enums/priority.enum.js';
import { Message, MessageAuthor } from './Message.interface.js';

export interface Conversation {
  id: string;
  platform: PlatformType;
  externalThreadId: string;
  title: string;
  participants: MessageAuthor[];
  lastMessageTimestamp: Date;
  messages: Message[];
  priority: PriorityLevel;
  summary?: string;
  unreadCount: number;
  tags: string[];
}
