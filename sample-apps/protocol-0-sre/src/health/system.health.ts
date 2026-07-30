import {
  HealthCheck,
  HealthCheckInterface,
  HealthCheckResult,
} from "@nitrostack/core";

@HealthCheck({
  name: "system",
  description: "System resource and uptime check",
  interval: 30,
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

      const memoryPercent =
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const isHealthy = memoryPercent < 98;

      return {
        status: isHealthy ? "up" : "degraded",
        message: isHealthy ? "System is healthy" : "High memory usage detected",
        details: {
          uptime: `${uptimeSeconds}s`,
          memory: `${memoryUsedMB}MB / ${memoryTotalMB}MB (${Math.round(memoryPercent)}%)`,
          pid: process.pid,
          nodeVersion: process.version,
        },
      };
    } catch (error: any) {
      return {
        status: "down",
        message: "System health check failed",
        details: error.message,
      };
    }
  }
}
