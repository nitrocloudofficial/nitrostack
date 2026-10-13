import { DiscordMessageRaw } from './types.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { MessageStatus } from '../../shared/enums/message.enum.js';
import { PriorityLevel } from '../../shared/enums/priority.enum.js';

export class DiscordMapper {
  public static toUnifiedMessage(raw: DiscordMessageRaw): Message {
    return {
      id: `dsc-${raw.id}`,
      conversationId: `conv-dsc-${raw.channel_id}`,
      platform: PlatformType.DISCORD,
      externalId: raw.id,
      sender: { id: raw.author.id, name: raw.author.username || 'Marcus Brody (UX Design)' },
      recipients: [],
      subject: 'Figma Token Sync for Glassmorphism Theme',
      content: raw.content,
      timestamp: new Date(raw.timestamp || Date.now()),
      status: MessageStatus.UNREAD,
      priority: PriorityLevel.LOW,
      tags: ['Discord', 'Design']
    };
  }
}
