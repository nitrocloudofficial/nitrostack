import { RateLimiterService } from '../../services/RateLimiter.service.js';
import { AuthenticationManagerService } from '../../services/AuthenticationManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { DiscordMessageRaw } from './types.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export class DiscordClient {
  private rateLimiter: RateLimiterService;
  private authManager: AuthenticationManagerService;

  constructor() {
    this.rateLimiter = RateLimiterService.getInstance();
    this.authManager = AuthenticationManagerService.getInstance();
  }

  public async fetchMessages(): Promise<DiscordMessageRaw[]> {
    return this.rateLimiter.executeWithRateLimit(PlatformType.DISCORD, async () => {
      const enableDemo = process.env.ENABLE_DEMO_MODE === 'true';
      const creds = this.authManager.getCredentials(PlatformType.DISCORD);

      if (enableDemo || !creds.isAuthorized) {
        const dscMsgs = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.DISCORD);
        return dscMsgs.map(m => ({
          id: m.externalId || m.id,
          channel_id: 'chn-01',
          content: m.content,
          timestamp: new Date(m.timestamp).toISOString(),
          author: { id: m.sender.id, username: m.sender.name }
        }));
      }


      const res = await fetch('https://discord.com/api/v10/channels/12345/messages', {
        headers: { Authorization: `Bot ${creds.accessToken}` }
      });
      if (!res.ok) throw new Error(`Discord API HTTP ${res.status}`);
      return res.json() as Promise<DiscordMessageRaw[]>;
    });
  }
}
