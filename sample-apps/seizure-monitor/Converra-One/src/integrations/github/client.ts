import { RateLimiterService } from '../../services/RateLimiter.service.js';
import { AuthenticationManagerService } from '../../services/AuthenticationManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { GitHubNotificationRaw } from './types.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export class GitHubClient {
  private rateLimiter: RateLimiterService;
  private authManager: AuthenticationManagerService;

  constructor() {
    this.rateLimiter = RateLimiterService.getInstance();
    this.authManager = AuthenticationManagerService.getInstance();
  }

  public async fetchNotifications(): Promise<GitHubNotificationRaw[]> {
    return this.rateLimiter.executeWithRateLimit(PlatformType.GITHUB, async () => {
      const enableDemo = process.env.ENABLE_DEMO_MODE === 'true';
      const creds = this.authManager.getCredentials(PlatformType.GITHUB);

      if (enableDemo || !creds.isAuthorized) {
        const ghMsgs = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.GITHUB);
        return ghMsgs.map((m, idx) => ({
          id: m.externalId || `4410${idx}`,
          unread: m.status === 'UNREAD',
          reason: idx % 2 === 0 ? 'review_requested' : 'ci_passed',
          updated_at: new Date(m.timestamp).toISOString(),
          subject: {
            title: m.subject || '[GitHub Notification]',
            url: `https://api.github.com/repos/converra-labs/converra-one/builds/${1840 + idx}`,
            type: idx % 2 === 0 ? 'PullRequest' : 'CheckSuite'
          },
          repository: {
            full_name: 'converra-labs/converra-one'
          }
        }));
      }


      const res = await fetch('https://api.github.com/notifications', {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'User-Agent': 'Converra-One-App/1.0.0'
        }
      });
      if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
      return res.json() as Promise<GitHubNotificationRaw[]>;
    });
  }
}
