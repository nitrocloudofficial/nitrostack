export interface FeatureFlags {
  ENABLE_DEMO_MODE: boolean;
  ENABLE_REAL_INTEGRATIONS: boolean;
  ENABLE_REPLY: boolean;
  ENABLE_SEARCH: boolean;
  ENABLE_CALENDAR: boolean;
  ENABLE_NOTIFICATIONS: boolean;
  ENABLE_ANALYTICS: boolean;
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: FeatureFlags;

  constructor() {
    this.flags = {
      ENABLE_DEMO_MODE: process.env.ENABLE_DEMO_MODE !== 'false',
      ENABLE_REAL_INTEGRATIONS: process.env.USE_REAL_INTEGRATIONS === 'true',
      ENABLE_REPLY: true,
      ENABLE_SEARCH: true,
      ENABLE_CALENDAR: true,
      ENABLE_NOTIFICATIONS: true,
      ENABLE_ANALYTICS: true
    };
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  public getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  public isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  public setFlag(flag: keyof FeatureFlags, enabled: boolean): void {
    this.flags[flag] = enabled;
  }
}
