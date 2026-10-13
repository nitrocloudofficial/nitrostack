import { SlackMessageRaw } from './types.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { MessageStatus } from '../../shared/enums/message.enum.js';
import { PriorityLevel } from '../../shared/enums/priority.enum.js';

export class SlackMapper {
  public static toUnifiedMessage(raw: SlackMessageRaw): Message {
    return {
      id: `slk-${raw.ts}`,
      conversationId: `conv-slk-${raw.thread_ts || raw.channel}`,
      platform: PlatformType.SLACK,
      externalId: raw.ts,
      sender: { id: raw.user || 'usr-devlead', name: 'Sarah Chen (Lead Architect)' },
      recipients: [],
      subject: 'NitroStack Core v1.4 Deployment Blockers',
      content: raw.text,
      timestamp: new Date(parseFloat(raw.ts) * 1000 || Date.now()),
      status: MessageStatus.UNREAD,
      priority: PriorityLevel.HIGH,
      tags: ['Slack', 'Channel']
    };
  }
}
