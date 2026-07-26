import { HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
/**
 * System Health Check
 *
 * Monitors system resources and uptime
 */
export declare class SystemHealthCheck implements HealthCheckInterface {
    private startTime;
    constructor();
    check(): Promise<HealthCheckResult>;
}
//# sourceMappingURL=system.health.d.ts.map