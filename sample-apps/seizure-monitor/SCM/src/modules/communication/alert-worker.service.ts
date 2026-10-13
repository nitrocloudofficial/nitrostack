import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nitrostack/core';
import { AlertService } from './alert.service.js';

/**
 * AlertWorker — polls the alerts_queue table and flushes pending sends.
 *
 * Design decisions (per AAI2026 production plan):
 *  - Runs as an interval inside the same process; no external job runner needed.
 *  - SQLite's alerts_queue table is the durable store — process restarts don't lose queued rows.
 *  - Interval is configurable via ALERT_FLUSH_INTERVAL_MS (default 10 000ms).
 *  - The flush is a single pass per tick; if the queue is larger than the batch limit (20),
 *    the next tick picks up the remainder — avoids holding a long write lock.
 */
@Injectable({ deps: [AlertService] })
export class AlertWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;

  constructor(private readonly alertService: AlertService) {
    this.intervalMs = parseInt(
      process.env['ALERT_FLUSH_INTERVAL_MS'] ?? '10000',
      10,
    );
  }

  onApplicationBootstrap(): void {
    const smtpNote = this.alertService.isConfigured
      ? 'SMTP active'
      : 'dry-run mode — set SMTP_HOST/SMTP_USER/SMTP_PASS for real delivery';

    console.error(
      `[AlertWorker] Started — flushing every ${this.intervalMs}ms (${smtpNote})`,
    );

    // Kick off an immediate flush so queued alerts from before restart are sent quickly
    void this.tick();

    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.error('[AlertWorker] Stopped');
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.alertService.flush();
    } catch (err) {
      // Worker errors must never crash the process — log and continue
      console.error('[AlertWorker] Unexpected error during flush:', err);
    }
  }
}
