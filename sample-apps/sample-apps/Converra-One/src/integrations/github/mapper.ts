import { GitHubNotificationRaw } from './types.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { MessageStatus } from '../../shared/enums/message.enum.js';
import { PriorityLevel } from '../../shared/enums/priority.enum.js';

export class GitHubMapper {
  public static toUnifiedMessage(raw: GitHubNotificationRaw): Message {
    return {
      id: `gh-${raw.id}`,
      conversationId: `conv-gh-${raw.id}`,
      platform: PlatformType.GITHUB,
      externalId: raw.id,
      sender: { id: 'usr-ghbot', name: 'GitHub Actions Bot' },
      recipients: [],
      subject: `[${raw.repository.full_name}] ${raw.subject.title}`,
      content: `Notification Reason: ${raw.reason}. Subject Type: ${raw.subject.type}`,
      timestamp: new Date(raw.updated_at || Date.now()),
      status: raw.unread ? MessageStatus.UNREAD : MessageStatus.READ,
      priority: PriorityLevel.MEDIUM,
      tags: ['GitHub', raw.subject.type]
    };
  }
}
