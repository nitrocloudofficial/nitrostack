import { NotionPageRaw } from './types.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { MessageStatus } from '../../shared/enums/message.enum.js';
import { PriorityLevel } from '../../shared/enums/priority.enum.js';

export class NotionMapper {
  public static toUnifiedMessage(raw: NotionPageRaw): Message {
    const title = raw.properties.Title?.title?.[0]?.plain_text || raw.properties.Name?.title?.[0]?.plain_text || 'Q3 Product Roadmap Update';

    return {
      id: `ntn-${raw.id}`,
      conversationId: `conv-ntn-${raw.id}`,
      platform: PlatformType.NOTION,
      externalId: raw.id,
      sender: { id: 'usr-pm', name: 'Elena Rostova (Product Lead)' },
      recipients: [],
      subject: title,
      content: 'Updated the Notion database with Q3 deliverables under MCP Protocol Integration.',
      timestamp: new Date(raw.last_edited_time || Date.now()),
      status: MessageStatus.READ,
      priority: PriorityLevel.MEDIUM,
      tags: ['Notion', 'Product']
    };
  }
}
