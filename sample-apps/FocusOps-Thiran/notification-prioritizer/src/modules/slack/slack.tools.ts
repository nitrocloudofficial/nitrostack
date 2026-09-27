import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Notification } from '../shared/notification.types.js';

export const MOCK_SLACK_NOTIFICATIONS: Omit<Notification, 'accountId' | 'accountEmail'>[] = [
  {
    id: 'slack_1',
    source: 'slack',
    sender: 'Sarah Chen',
    title: 'Direct Message',
    snippet: "Hey Jane, let's sync up on Project Focus. Do you have 15 minutes before the daily demo?",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    link: 'https://slack.com/app_redirect?channel=D12345',
    rawMetadata: { channel: 'D12345', type: 'im' }
  },
  {
    id: 'slack_2',
    source: 'slack',
    sender: 'David Miller',
    title: 'Mention in #proj-focus',
    snippet: '@jane check this out. We found a critical bug in the priority categorization logic when a notification has no email.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    link: 'https://slack.com/app_redirect?channel=C98765&message=1711234',
    rawMetadata: { channel: 'C98765', type: 'mention' }
  },
  {
    id: 'slack_3',
    source: 'slack',
    sender: 'Emily Rose',
    title: 'Message in #random',
    snippet: 'Anyone up for coffee downstairs? ☕',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    link: 'https://slack.com/app_redirect?channel=C22222',
    rawMetadata: { channel: 'C22222', type: 'channel' }
  }
];

export class SlackTools {
  @Tool({
    name: 'fetchSlackNotifications',
    description: 'Fetch realistic Slack notifications (DMs, mentions, and channel messages), optionally since a specific ISO 8601 timestamp.',
    inputSchema: z.object({
      since: z.string().optional().describe('Optional ISO 8601 timestamp to fetch notifications since')
    })
  })
  async fetchSlackNotifications(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching Slack notifications', { since: input.since });

    const token = process.env.SLACK_USER_TOKEN;
    if (!token || token.startsWith('xoxp-your-')) {
      ctx.logger.info('Slack token not found or placeholder, returning mock Slack feed');
      return this.getMockNotifications(input.since);
    }

    try {
      // 1. Get auth details (current user's ID)
      const authRes = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const authData = await authRes.json() as any;
      if (!authData.ok) {
        throw new Error(`Slack Auth Test failed: ${authData.error}`);
      }
      const myUserId = authData.user_id;

      // 2. Fetch workspace users map (to resolve display names)
      const usersRes = await fetch('https://slack.com/api/users.list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersData = await usersRes.json() as any;
      const userMap: Record<string, string> = {};
      if (usersData.ok) {
        for (const user of usersData.members || []) {
          userMap[user.id] = user.profile?.real_name || user.name;
        }
      }

      // 3. Fetch public channels & IMs (DMs)
      const convRes = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel,im,mpim&exclude_members=true&limit=100',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const convData = await convRes.json() as any;
      if (!convData.ok) {
        throw new Error(`Slack conversations.list failed: ${convData.error}`);
      }

      // Filter to conversations the user is a member of, or DMs
      const activeConversations = (convData.channels || []).filter(
        (c: any) => c.is_member || c.is_im || c.is_mpim
      );

      const notifications: Notification[] = [];
      const sinceTime = input.since ? new Date(input.since).getTime() : 0;

      // 4. Fetch history for active conversations (limit to top 10 to avoid rate limits)
      const conversationsToFetch = activeConversations.slice(0, 10);
      for (const channel of conversationsToFetch) {
        const histRes = await fetch(
          `https://slack.com/api/conversations.history?channel=${channel.id}&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const histData = await histRes.json() as any;
        if (!histData.ok) continue;

        const messages = histData.messages || [];
        for (const msg of messages) {
          // Skip bot messages unless they are integrations, and skip edit/delete submessages
          if (msg.subtype === 'message_changed' || msg.subtype === 'message_deleted') continue;
          if (msg.user === myUserId) continue; // Skip messages sent by the user themselves

          const senderName = userMap[msg.user] || msg.username || 'Workspace Partner';
          const msgTime = parseFloat(msg.ts) * 1000;
          const timestamp = new Date(msgTime).toISOString();

          if (msgTime >= sinceTime) {
            const isDM = channel.is_im || channel.is_mpim;
            const isMention = msg.text?.includes(`<@${myUserId}>`);
            
            // Only capture DMs, Mentions, or standard channel messages in designated work channels
            const shouldAdd = isDM || isMention || channel.name === 'proj-focus' || channel.name === 'alerts';
            
            if (shouldAdd) {
              notifications.push({
                id: `slack_${channel.id}_${msg.ts}`,
                source: 'slack',
                sender: senderName,
                title: isDM ? 'Direct Message' : `Mention in #${channel.name || 'group-chat'}`,
                snippet: this.cleanMessageText(msg.text || '', userMap),
                timestamp,
                link: `https://slack.com/app_redirect?channel=${channel.id}&message=${msg.ts}`,
                accountId: 'default',
                accountEmail: null,
                rawMetadata: {
                  channelId: channel.id,
                  userId: msg.user,
                  type: isMention ? 'mention' : isDM ? 'im' : 'channel'
                }
              });
            }
          }
        }
      }

      // Sort by timestamp descending
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { notifications };
    } catch (err) {
      ctx.logger.error('Failed to fetch real Slack notifications', { error: String(err) });
      return this.getMockNotifications(input.since);
    }
  }

  /**
   * Helper to clean Slack markdown user mentions (e.g. <@U123> -> @Sarah)
   */
  private cleanMessageText(text: string, userMap: Record<string, string>): string {
    return text.replace(/<@([A-Z0-9]+)>/g, (match, userId) => {
      return `@${userMap[userId] || userId}`;
    });
  }

  private getMockNotifications(since?: string) {
    return { notifications: [] };
  }
}
