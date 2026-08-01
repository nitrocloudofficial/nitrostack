import { PlatformType } from '../enums/platform.enum.js';
import { PriorityLevel } from '../enums/priority.enum.js';
import { MessageStatus } from '../enums/message.enum.js';

export interface MessageAuthor {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  platform: PlatformType;
  externalId: string;
  sender: MessageAuthor;
  recipients: MessageAuthor[];
  subject?: string;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  priority: PriorityLevel;
  tags?: string[];
  rawPayload?: Record<string, unknown>;
}
