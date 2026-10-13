import { PlatformType } from '../shared/enums/platform.enum.js';

export interface RateLimiterConfig {
  maxRequestsPerMinute: number;
  maxRetries: number;
  initialBackoffMs: number;
}

export class RateLimiterService {
  private static instance: RateLimiterService;
  private configs: Map<PlatformType, RateLimiterConfig>;

  constructor() {
    this.configs = new Map();
    this.initializeDefaultConfigs();
  }

  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  private initializeDefaultConfigs(): void {
    const defaults: Record<string, RateLimiterConfig> = {
      GMAIL: { maxRequestsPerMinute: 250, maxRetries: 3, initialBackoffMs: 500 },
      SLACK: { maxRequestsPerMinute: 60, maxRetries: 3, initialBackoffMs: 1000 },
      DISCORD: { maxRequestsPerMinute: 120, maxRetries: 3, initialBackoffMs: 500 },
      GITHUB: { maxRequestsPerMinute: 5000, maxRetries: 3, initialBackoffMs: 200 },
      NOTION: { maxRequestsPerMinute: 180, maxRetries: 3, initialBackoffMs: 400 },
      CALENDAR: { maxRequestsPerMinute: 300, maxRetries: 3, initialBackoffMs: 500 }
    };

    Object.entries(defaults).forEach(([platformKey, cfg]) => {
      this.configs.set(platformKey as PlatformType, cfg);
    });
  }

  public async executeWithRateLimit<T>(
    platform: PlatformType,
    fn: () => Promise<T>
  ): Promise<T> {
    const cfg = this.configs.get(platform) || { maxRequestsPerMinute: 100, maxRetries: 3, initialBackoffMs: 500 };
    let attempt = 0;

    while (attempt <= cfg.maxRetries) {
      try {
        return await fn();
      } catch (err: unknown) {
        attempt++;
        if (attempt > cfg.maxRetries) {
          throw err;
        }

        const backoffMs = cfg.initialBackoffMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error(`Rate limit retries exhausted for ${platform}`);
  }
}
