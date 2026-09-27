import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Notification } from '../shared/notification.types.js';

export const MOCK_GITHUB_NOTIFICATIONS: Omit<Notification, 'accountId' | 'accountEmail'>[] = [
  {
    id: 'gh_1',
    source: 'github',
    sender: 'GitHub Actions',
    title: '[GitHub] Build failed: main branch - push by david-miller',
    snippet: 'Workflow "Production CI / CD" failed at step "Build and Test Docker Image". Error exit code 1. Commit: "feat: update prioritizer dependencies"',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    link: 'https://github.com/company/notification-prioritizer/actions/runs/987654',
    rawMetadata: { repo: 'company/notification-prioritizer', branch: 'main', event: 'push', reason: 'ci_failure' }
  },
  {
    id: 'gh_2',
    source: 'github',
    sender: 'david-miller',
    title: '[GitHub] Review requested: PR #24 - Fix OAuth token refresh bug',
    snippet: 'david-miller requested your review on PR #24: "This PR fixes the refresh token expiration issue and updates app.module.ts with oauth callbacks."',
    timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    link: 'https://github.com/company/notification-prioritizer/pull/24',
    rawMetadata: { repo: 'company/notification-prioritizer', prNumber: 24, reason: 'review_request' }
  }
];

export class GithubTools {
  @Tool({
    name: 'fetchGithubNotifications',
    description: 'Fetch GitHub notifications (PR review requests, build statuses, and mentions), optionally since a specific ISO 8601 timestamp.',
    inputSchema: z.object({
      since: z.string().optional().describe('Optional ISO 8601 timestamp to fetch notifications since')
    })
  })
  async fetchGithubNotifications(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching GitHub notifications', { since: input.since });

    const token = process.env.GITHUB_TOKEN;
    if (!token || token.startsWith('ghp_your')) {
      ctx.logger.info('GitHub token not found, returning mock GitHub feed');
      return this.getMockNotifications(input.since);
    }

    try {
      let url = 'https://api.github.com/notifications';
      if (input.since) {
        url += `?since=${encodeURIComponent(input.since)}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'FocusOps-Prioritizer'
        }
      });

      if (!res.ok) {
        throw new Error(`GitHub API notifications failed: ${await res.text()}`);
      }

      const rawNotifs = await res.json() as any[];
      const notifications: Notification[] = [];
      const sinceTime = input.since ? new Date(input.since).getTime() : 0;

      for (const item of rawNotifs) {
        const updatedAtTime = new Date(item.updated_at).getTime();
        if (updatedAtTime >= sinceTime) {
          const repo = item.repository?.full_name || 'unknown-repo';
          const type = item.subject?.type || 'Issue';
          
          // Parse entity number from API url path
          const number = item.subject?.url?.split('/').pop() || '';
          
          // Construct HTML link
          let link = item.repository?.html_url || 'https://github.com';
          if (type === 'PullRequest') {
            link += `/pull/${number}`;
          } else if (type === 'Issue') {
            link += `/issues/${number}`;
          } else if (type === 'Commit') {
            link += `/commit/${number}`;
          }

          notifications.push({
            id: `github_${item.id}`,
            source: 'github',
            sender: item.subject?.latest_comment_author?.login || 'GitHub',
            title: `[GitHub] ${type === 'PullRequest' ? 'PR #' + number : type}: ${item.subject?.title}`,
            snippet: `Repo: ${repo}. Reason: ${item.reason.replace(/_/g, ' ')}.`,
            timestamp: new Date(item.updated_at).toISOString(),
            link,
            accountId: 'default',
            accountEmail: null,
            rawMetadata: {
              repo,
              reason: item.reason,
              type
            }
          });
        }
      }

      // Sort newest first
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { notifications };
    } catch (err) {
      ctx.logger.error('Failed to fetch real GitHub notifications', { error: String(err) });
      return this.getMockNotifications(input.since);
    }
  }

  private getMockNotifications(since?: string) {
    return { notifications: [] };
  }
}
