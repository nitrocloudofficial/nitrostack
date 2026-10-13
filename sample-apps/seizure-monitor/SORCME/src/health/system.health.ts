import {
  HealthCheck,
  HealthCheckInterface,
  HealthCheckResult,
} from "@nitrostack/core";

/**
 * System Health Check
 *
 * Exposed via the HTTP transport at GET /mcp/health when running in
 * dual/http mode. A hosted platform generally probes this endpoint to
 * decide whether a deployment came up successfully.
 */
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
      const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

      const memoryPercent =
        memoryUsage.heapTotal > 0
          ? (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
          : 0;
      const isHealthy = memoryPercent < 90;

      return {
        status: isHealthy ? "up" : "degraded",
        message: isHealthy ? "System is healthy" : "High memory usage detected",
        details: {
          uptime: `${uptimeSeconds}s`,
          memory: `${memoryUsedMB}MB / ${memoryTotalMB}MB (${Math.round(
            memoryPercent
          )}%)`,
          transport: process.env.MCP_TRANSPORT_TYPE ?? "auto",
          nodeEnv: process.env.NODE_ENV ?? "unset",
          nodeVersion: process.version,
        },
      };
    } catch (error: any) {
      return {
        status: "down",
        message: "System health check failed",
        details: error?.message ?? String(error),
      };
    }
  }
}
