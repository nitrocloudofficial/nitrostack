export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  lastCheck: Date;
  details?: Record<string, unknown>;
}

export class HealthManager {
  private services = new Map<string, ServiceHealth>();

  register(name: string): void {
    this.services.set(name, {
      name,
      status: 'unknown',
      lastCheck: new Date(),
    });
  }

  update(name: string, status: HealthStatus, details?: Record<string, unknown>): void {
    this.services.set(name, {
      name,
      status,
      lastCheck: new Date(),
      details,
    });
  }

  getStatus(name: string): ServiceHealth | undefined {
    return this.services.get(name);
  }

  getAllStatuses(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  getOverallStatus(): HealthStatus {
    const statuses = this.getAllStatuses();
    if (statuses.length === 0) return 'unknown';
    if (statuses.some((s) => s.status === 'unhealthy')) return 'unhealthy';
    if (statuses.some((s) => s.status === 'degraded')) return 'degraded';
    if (statuses.every((s) => s.status === 'healthy')) return 'healthy';
    return 'degraded';
  }
}
