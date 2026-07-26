var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { HealthCheck } from '@nitrostack/core';
/**
 * System Health Check
 *
 * Monitors system resources and uptime
 */
let SystemHealthCheck = class SystemHealthCheck {
    startTime;
    constructor() {
        this.startTime = Date.now();
    }
    async check() {
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
                },
            };
        }
        catch (error) {
            return {
                status: 'down',
                message: 'System health check failed',
                details: error.message,
            };
        }
    }
};
SystemHealthCheck = __decorate([
    HealthCheck({
        name: 'system',
        description: 'System resource and uptime check',
        interval: 30 // Check every 30 seconds
    }),
    __metadata("design:paramtypes", [])
], SystemHealthCheck);
export { SystemHealthCheck };
//# sourceMappingURL=system.health.js.map