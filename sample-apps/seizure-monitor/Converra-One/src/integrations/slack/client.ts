import { RateLimiterService } from '../../services/RateLimiter.service.js';
import { AuthenticationManagerService } from '../../services/AuthenticationManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { SlackMessageRaw } from './types.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export class SlackClient {
  private rateLimiter: RateLimiterService;
  private authManager: AuthenticationManagerService;

  constructor() {
    this.rateLimiter = RateLimiterService.getInstance();
    this.authManager = AuthenticationManagerService.getInstance();
  }

  public async fetchMessages(): Promise<SlackMessageRaw[]> {
    return this.rateLimiter.executeWithRateLimit(PlatformType.SLACK, async () => {
      const enableDemo = process.env.ENABLE_DEMO_MODE === 'true';
      const creds = this.authManager.getCredentials(PlatformType.SLACK);

      if (enableDemo || !creds.isAuthorized) {
        const slackMsgs = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.SLACK);
        return slackMsgs.map((m, idx) => ({
          ts: `${1721900000 + idx * 3600}.000100`,
          user: m.sender.id,
          channel: 'C01234567',
          text: m.content
        }));
      }


      const res = await fetch('https://slack.com/api/conversations.history?channel=C01234567', {
        headers: { Authorization: `Bearer ${creds.accessToken}` }
      });
      if (!res.ok) throw new Error(`Slack API HTTP ${res.status}`);
      const data = await res.json() as { messages?: SlackMessageRaw[] };
      return data.messages || [];
    });
  }
}
