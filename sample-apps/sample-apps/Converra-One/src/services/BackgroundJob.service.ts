import { SyncSchedulerService } from './SyncScheduler.service.js';

export class BackgroundJobService {
  private static instance: BackgroundJobService;
  private isRunning: boolean = false;

  constructor() {}

  public static getInstance(): BackgroundJobService {
    if (!BackgroundJobService.instance) {
      BackgroundJobService.instance = new BackgroundJobService();
    }
    return BackgroundJobService.instance;
  }

  public startBackgroundJobs(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run scheduled inbox & platform sync
    SyncSchedulerService.getInstance().triggerSync().catch(() => {});
  }

  public stopBackgroundJobs(): void {
    this.isRunning = false;
  }
}
