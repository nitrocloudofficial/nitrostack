import { Message, MessageAuthor } from '../interfaces/Message.interface.js';
import { PlatformType } from '../enums/platform.enum.js';
import { PriorityLevel } from '../enums/priority.enum.js';
import { MessageStatus } from '../enums/message.enum.js';

export class MessageModel implements Message {
  public id: string;
  public conversationId: string;
  public platform: PlatformType;
  public externalId: string;
  public sender: MessageAuthor;
  public recipients: MessageAuthor[];
  public subject?: string;
  public content: string;
  public timestamp: Date;
  public status: MessageStatus;
  public priority: PriorityLevel;
  public tags?: string[];
  public rawPayload?: Record<string, unknown>;

  constructor(data: Message) {
    this.id = data.id;
    this.conversationId = data.conversationId;
    this.platform = data.platform;
    this.externalId = data.externalId;
    this.sender = data.sender;
    this.recipients = data.recipients;
    this.subject = data.subject;
    this.content = data.content;
    this.timestamp = data.timestamp;
    this.status = data.status;
    this.priority = data.priority;
    this.tags = data.tags || [];
    this.rawPayload = data.rawPayload;
  }
}
