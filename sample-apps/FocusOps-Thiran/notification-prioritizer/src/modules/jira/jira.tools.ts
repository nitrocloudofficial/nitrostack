import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Notification } from '../shared/notification.types.js';

export const MOCK_JIRA_NOTIFICATIONS: Omit<Notification, 'accountId' | 'accountEmail'>[] = [
  {
    id: 'jira_1',
    source: 'jira',
    sender: 'Jira System',
    title: '[Jira] FOCUS-101 Assigned: Implement priority engine rules',
    snippet: 'Sarah Chen assigned FOCUS-101 to you: Define rule-based prioritizer logic for notifications and connect dashboard widget.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    link: 'https://company.atlassian.net/browse/FOCUS-101',
    rawMetadata: { issueKey: 'FOCUS-101', type: 'assignment', assignee: 'Jane Doe' }
  },
  {
    id: 'jira_2',
    source: 'jira',
    sender: 'Sarah Chen',
    title: '[Jira] Comment on FOCUS-101: Implement priority engine rules',
    snippet: 'Sarah Chen commented: "Jane, please make sure we support multiple Gmail accounts in the initial schema, as requested by leadership."',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    link: 'https://company.atlassian.net/browse/FOCUS-101#comment-10234',
    rawMetadata: { issueKey: 'FOCUS-101', type: 'comment', commenter: 'Sarah Chen' }
  },
  {
    id: 'jira_3',
    source: 'jira',
    sender: 'Jira System',
    title: '[Jira] FOCUS-99 Due Today: Security review questionnaire',
    snippet: 'Reminder: FOCUS-99 is due today. Complete security assessment before launching Project Focus.',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    link: 'https://company.atlassian.net/browse/FOCUS-99',
    rawMetadata: { issueKey: 'FOCUS-99', type: 'due_soon', dueDate: '2026-07-26' }
  }
];

export class JiraTools {
  @Tool({
    name: 'fetchJiraNotifications',
    description: 'Fetch Jira notifications (assignments, comments, and status updates), optionally since a specific ISO 8601 timestamp.',
    inputSchema: z.object({
      since: z.string().optional().describe('Optional ISO 8601 timestamp to fetch notifications since')
    })
  })
  async fetchJiraNotifications(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching Jira notifications', { since: input.since });

    const domain = process.env.JIRA_DOMAIN;
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;

    const hasCreds = domain && email && token && 
                     !domain.startsWith('company.atlassian') && 
                     !email.startsWith('your-atlassian') && 
                     !token.startsWith('your-copied');

    if (!hasCreds) {
      ctx.logger.info('Jira credentials not set, returning mock Jira feed');
      return this.getMockNotifications(input.since);
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
      
      // Fetch issues assigned to me, watcher of, or recently updated
      const jql = encodeURIComponent('assignee = currentUser() OR watcher = currentUser() order by updated desc');
      const searchUrl = `https://${domain}/rest/api/3/search/jql?jql=${jql}&maxResults=10&fields=summary,description,assignee,updated,status,creator,priority,duedate`;
      
      const searchRes = await fetch(searchUrl, {
        headers: { 
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (!searchRes.ok) {
        throw new Error(`Jira API search failed: ${await searchRes.text()}`);
      }

      const searchData = await searchRes.json() as any;
      const issues = searchData.issues || [];
      const notifications: Notification[] = [];
      const sinceTime = input.since ? new Date(input.since).getTime() : 0;

      for (const issue of issues) {
        const fields = issue.fields || {};
        const updatedTime = new Date(fields.updated).getTime();

        if (updatedTime >= sinceTime) {
          // Parse snippet text from Atlassian Document Format (ADF) description if possible
          let snippet = fields.summary;
          if (fields.description && fields.description.content) {
            try {
              snippet = fields.description.content
                .flatMap((c: any) => c.content || [])
                .map((textNode: any) => textNode.text || '')
                .join(' ')
                .slice(0, 150) || fields.summary;
            } catch {
              snippet = fields.summary;
            }
          }

          notifications.push({
            id: `jira_${issue.id}`,
            source: 'jira',
            sender: fields.creator?.displayName || 'Jira System',
            title: `[Jira] ${issue.key}: ${fields.summary}`,
            snippet: `Status: ${fields.status?.name || 'Open'}. ${snippet}`,
            timestamp: new Date(fields.updated).toISOString(),
            link: `https://${domain}/browse/${issue.key}`,
            accountId: 'default',
            accountEmail: null,
            rawMetadata: {
              issueKey: issue.key,
              priority: fields.priority?.name,
              status: fields.status?.name,
              dueDate: fields.duedate
            }
          });
        }
      }

      return { notifications };
    } catch (err) {
      ctx.logger.error('Failed to fetch real Jira tickets', { error: String(err) });
      return this.getMockNotifications(input.since);
    }
  }

  private getMockNotifications(since?: string) {
    return { notifications: [] };
  }
}
