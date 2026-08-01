import { RateLimiterService } from '../../services/RateLimiter.service.js';
import { AuthenticationManagerService } from '../../services/AuthenticationManager.service.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { NotionPageRaw } from './types.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export class NotionClient {
  private rateLimiter: RateLimiterService;
  private authManager: AuthenticationManagerService;

  constructor() {
    this.rateLimiter = RateLimiterService.getInstance();
    this.authManager = AuthenticationManagerService.getInstance();
  }

  public async fetchPages(): Promise<NotionPageRaw[]> {
    return this.rateLimiter.executeWithRateLimit(PlatformType.NOTION, async () => {
      const enableDemo = process.env.ENABLE_DEMO_MODE === 'true';
      const creds = this.authManager.getCredentials(PlatformType.NOTION);

      if (enableDemo || !creds.isAuthorized) {
        const pages = DemoStoreService.getInstance().getNotionPages();
        return pages.map(p => ({
          id: p.id,
          created_time: new Date(p.lastEdited).toISOString(),
          last_edited_time: new Date(p.lastEdited).toISOString(),
          properties: {
            Title: { title: [{ plain_text: p.title }] }
          }
        }));
      }


      const res = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Notion API HTTP ${res.status}`);
      const data = await res.json() as { results?: NotionPageRaw[] };
      return data.results || [];
    });
  }
}
