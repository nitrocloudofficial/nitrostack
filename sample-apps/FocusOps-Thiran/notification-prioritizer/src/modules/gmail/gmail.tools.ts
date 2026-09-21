import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Notification } from '../shared/notification.types.js';
import { ConnectedAccount } from './gmail.types.js';
import { GoogleAuthHelper } from '../shared/google-auth.helper.js';

export const MOCK_ACCOUNTS: ConnectedAccount[] = [
  { accountId: 'gmail_work', accountEmail: 'jane@company.com' },
  { accountId: 'gmail_personal', accountEmail: 'jane.personal@gmail.com' }
];

export const MOCK_EMAILS: Record<string, Omit<Notification, 'accountId' | 'accountEmail'>[]> = {
  gmail_work: [
    {
      id: 'gmail_w1',
      source: 'gmail',
      sender: 'Sarah Chen <sarah.chen@company.com>',
      title: 'Urgent: Project Focus launch roadmap review',
      snippet: 'Hi Jane, we need to finalize the prioritizer module for the Q3 roadmap by end of day today. Please review the updated milestones.',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      link: 'https://mail.google.com/mail/u/0/#inbox/gmail_w1',
      rawMetadata: { threadId: 'thread_w1', unread: true }
    },
    {
      id: 'gmail_w2',
      source: 'gmail',
      sender: 'HR Portal <no-reply@company.com>',
      title: 'Complete your mid-year feedback by Friday',
      snippet: 'Dear Employee, this is a reminder to submit your self-evaluation and peer feedback prior to the upcoming performance review cycle.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      link: 'https://mail.google.com/mail/u/0/#inbox/gmail_w3',
      rawMetadata: { threadId: 'thread_w3', unread: true }
    }
  ],
  gmail_personal: [
    {
      id: 'gmail_p1',
      source: 'gmail',
      sender: 'Netflix <info@netflix.com>',
      title: 'New arrival: What to watch this weekend',
      snippet: "Hi Jane, we've added new shows matching your interests, including the latest season of 'Silicon Valley Chronicles'. Watch now.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      link: 'https://mail.google.com/mail/u/0/#inbox/gmail_p3',
      rawMetadata: { threadId: 'thread_p3', unread: false }
    }
  ]
};

export class GmailTools {
  @Tool({
    name: 'listConnectedAccounts',
    description: 'Retrieve the list of connected Gmail accounts for the user',
    inputSchema: z.object({})
  })
  async listConnectedAccounts(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Listing connected Gmail accounts');
    const token = await GoogleAuthHelper.getValidAccessToken();
    if (!token) {
      return { accounts: MOCK_ACCOUNTS };
    }

    try {
      // Fetch profile email for active Google account
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json() as any;
        return {
          accounts: [
            { accountId: 'google_active', accountEmail: profile.emailAddress }
          ]
        };
      }
    } catch (err) {
      ctx.logger.error('Failed to fetch real Gmail account profile', { error: String(err) });
    }

    return {
      accounts: MOCK_ACCOUNTS
    };
  }

  @Tool({
    name: 'fetchGmailNotifications',
    description: 'Fetch email notifications from all connected Gmail accounts, optionally since a specific ISO 8601 timestamp.',
    inputSchema: z.object({
      since: z.string().optional().describe('Optional ISO 8601 timestamp to fetch notifications since')
    })
  })
  async fetchGmailNotifications(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching Gmail notifications', { since: input.since });
    
    const token = await GoogleAuthHelper.getValidAccessToken();
    if (!token) {
      ctx.logger.info('Google token not found, falling back to mock Gmail feed');
      return this.getMockNotifications(input.since);
    }

    try {
      // 1. Fetch unread email message metadata
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!listRes.ok) {
        throw new Error(`Gmail API messages list failed: ${await listRes.text()}`);
      }

      const listData = await listRes.json() as any;
      const messagesList = listData.messages || [];

      // 2. Fetch profile email address for mapping
      let accountEmail = 'gmail.active@gmail.com';
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profile = await profileRes.json() as any;
        accountEmail = profile.emailAddress;
      }

      // 3. Fetch details for each message
      const notifications: Notification[] = [];
      const sinceTime = input.since ? new Date(input.since).getTime() : 0;

      for (const msg of messagesList) {
        const detailsRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!detailsRes.ok) continue;

        const details = await detailsRes.json() as any;
        const headers = details.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const dateStr = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || new Date().toISOString();
        const timestamp = new Date(dateStr).toISOString();

        if (new Date(timestamp).getTime() >= sinceTime) {
          notifications.push({
            id: details.id,
            source: 'gmail',
            sender: from,
            title: subject,
            snippet: details.snippet || '',
            timestamp,
            link: `https://mail.google.com/mail/u/0/#inbox/${details.id}`,
            accountId: 'google_active',
            accountEmail,
            rawMetadata: { threadId: details.threadId, labelIds: details.labelIds }
          });
        }
      }

      // Sort by timestamp descending
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return { notifications };
    } catch (err) {
      ctx.logger.error('Failed to fetch real Gmail notifications', { error: String(err) });
      // Fallback on error
      return this.getMockNotifications(input.since);
    }
  }

  private getMockNotifications(since?: string) {
    return { notifications: [] };
  }
}
