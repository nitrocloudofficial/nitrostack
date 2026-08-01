import { PlatformType } from '../shared/enums/platform.enum.js';
import { ConnectorManagerService } from './ConnectorManager.service.js';

export class SyncSchedulerService {
  private static instance: SyncSchedulerService;
  private syncIntervals: Map<PlatformType, number>;
  private lastSyncMap: Map<PlatformType, Date>;

  constructor() {
    this.syncIntervals = new Map();
    this.lastSyncMap = new Map();
    this.initializeIntervals();
  }

  public static getInstance(): SyncSchedulerService {
    if (!SyncSchedulerService.instance) {
      SyncSchedulerService.instance = new SyncSchedulerService();
    }
    return SyncSchedulerService.instance;
  }

  private initializeIntervals(): void {
    const defaults: Record<string, number> = {
      GMAIL: 60,
      SLACK: 15,
      DISCORD: 30,
      GITHUB: 300,
      NOTION: 120,
      CALENDAR: 60
    };

    Object.entries(defaults).forEach(([k, secs]) => {
      this.syncIntervals.set(k as PlatformType, secs);
      this.lastSyncMap.set(k as PlatformType, new Date());
    });
  }

  public async triggerSync(platform?: PlatformType): Promise<{ syncedCount: number; timestamp: Date }> {
    const manager = ConnectorManagerService.getInstance();
    const messages = await manager.fetchAllMessages();
    const now = new Date();

    if (platform) {
      this.lastSyncMap.set(platform, now);
    } else {
      this.lastSyncMap.forEach((_, k) => this.lastSyncMap.set(k, now));
    }

    return {
      syncedCount: messages.length,
      timestamp: now
    };
  }

  public getLastSyncTime(platform: PlatformType): Date {
    return this.lastSyncMap.get(platform) || new Date();
  }
}
