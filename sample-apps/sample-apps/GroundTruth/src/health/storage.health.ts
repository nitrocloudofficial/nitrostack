import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import { store } from '../store/store.js';

/**
 * Storage durability check.
 *
 * The store degrades to memory-only rather than crashing when it cannot write,
 * which is the right behaviour but also silent. This is how you find out — and
 * on a deployed container it is the difference between "reports vanished on
 * redeploy because the filesystem is ephemeral" and "reports were never being
 * written at all".
 */
@HealthCheck({
  name: 'storage',
  description: 'Whether report data is being written to disk',
  interval: 60,
})
export class StorageHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    const status = store.persistenceStatus();
    const counts = {
      employees: store.listEmployees().length,
      reports: store.listReports().length,
      openAlerts: store.listAlerts().length,
    };

    if (status.durable) {
      return {
        status: 'up',
        message: 'Report data is being written to disk',
        details: { file: status.file, ...counts },
      };
    }

    return {
      status: 'degraded',
      message: 'Running in memory only — data will not survive a restart',
      details: {
        file: status.file,
        reason: status.error,
        fix: 'Ensure the working directory is writable, or accept that a redeploy resets the demo data.',
        ...counts,
      },
    };
  }
}
