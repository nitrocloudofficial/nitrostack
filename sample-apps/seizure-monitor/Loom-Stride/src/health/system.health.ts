import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import * as path from 'path';
import { DATA_DIR, readJsonFile } from '../common/file.utils.js';

/**
 * System Health Check
 * 
 * Monitors system resources, uptime, and shoe database status
 */
@HealthCheck({ 
  name: 'system', 
  description: 'System resource, uptime, and shoe database check',
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
      
      // Convert memory to MB
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      
      // Consider unhealthy if memory usage is > 90%
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const isHealthy = memoryPercent < 90;

      // Read shoe database stats
      const dbPath = path.join(DATA_DIR, 'shoes.json');
      const db = readJsonFile<{ meta?: { total_records?: number; last_scraped?: string | null; brands?: string[] } } | null>(dbPath, null);
      const shoeDbRecords = db?.meta?.total_records ?? 0;
      const lastScraped = db?.meta?.last_scraped ?? 'never';
      const brandCount = db?.meta?.brands?.length ?? 0;
      
      return {
        status: isHealthy ? 'up' : 'degraded',
        message: isHealthy 
          ? 'System is healthy' 
          : 'High memory usage detected',
        details: {
          uptime: `${uptimeSeconds}s`,
          memory: `${memoryUsedMB}MB / ${memoryTotalMB}MB (${Math.round(memoryPercent)}%)`,
          pid: process.pid,
          nodeVersion: process.version,
          shoeDatabase: {
            records: shoeDbRecords,
            brands: brandCount,
            lastScraped,
          },
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
