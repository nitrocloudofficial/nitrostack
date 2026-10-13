import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

/**
 * System Health Check
 * 
 * Monitors system resources and uptime
 */
@HealthCheck({ 
  name: 'system', 
  description: 'System resource and uptime check',
  interval: 30 // Check every 30 seconds
})
export class SystemHealthCheck implements HealthCheckInterface {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;
      const uptimeSeconds = Math.floor(uptime / 1000);
      
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

      /*
       * heapUsed/heapTotal is not a health signal. V8 sizes heapTotal to just
       * above current demand, so a small idle process sits near 90% by design —
       * the scaffold's original check reported "degraded" on a perfectly healthy
       * 22MB server. Judge against resident memory versus a real ceiling instead,
       * so the warning means something when it does fire.
       */
      const RSS_CEILING_MB = 512;
      const isHealthy = rssMB < RSS_CEILING_MB;

      return {
        status: isHealthy ? 'up' : 'degraded',
        message: isHealthy
          ? 'System is healthy'
          : `Resident memory above ${RSS_CEILING_MB}MB`,
        details: {
          uptime: `${uptimeSeconds}s`,
          rss: `${rssMB}MB / ${RSS_CEILING_MB}MB ceiling`,
          heap: `${memoryUsedMB}MB / ${memoryTotalMB}MB`,
          pid: process.pid,
          nodeVersion: process.version,
        },
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: 'System health check failed',
        details: error.message,
      };
    }
  }
}

