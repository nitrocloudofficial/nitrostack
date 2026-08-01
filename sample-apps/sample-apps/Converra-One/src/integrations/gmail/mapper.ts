import { GmailMessage } from './types.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { MessageStatus } from '../../shared/enums/message.enum.js';
import { PriorityLevel } from '../../shared/enums/priority.enum.js';

export class GmailMapper {
  public static toUnifiedMessage(raw: GmailMessage): Message {
    const headers = raw.payload.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject') || 'No Subject';
    const from = getHeader('From') || 'Unknown Sender';
    const isUnread = raw.labelIds?.includes('UNREAD');

    return {
      id: `gm-${raw.id}`,
      conversationId: `conv-gm-${raw.threadId}`,
      platform: PlatformType.GMAIL,
      externalId: raw.id,
      sender: {
        id: from,
        name: from.split('<')[0].trim() || from,
        email: from.includes('<') ? from.split('<')[1].replace('>', '').trim() : from
      },
      recipients: [],
      subject,
      content: raw.snippet || 'Gmail message payload',
      timestamp: new Date(parseInt(raw.internalDate, 10) || Date.now()),
      status: isUnread ? MessageStatus.UNREAD : MessageStatus.READ,
      priority: subject.toLowerCase().includes('urgent') ? PriorityLevel.URGENT : PriorityLevel.MEDIUM,
      tags: raw.labelIds
    };
  }
}
