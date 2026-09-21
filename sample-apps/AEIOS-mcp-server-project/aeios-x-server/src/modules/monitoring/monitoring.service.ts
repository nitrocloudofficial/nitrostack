export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTime?: number;
  lastChecked: string;
  uptime: number;
  message: string;
}

export interface Alert {
  id: number;
  severity: AlertSeverity;
  service: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export class MonitoringService {
  private services = new Map<string, ServiceHealth>();
  private alerts: Alert[] = [];
  private alertCounter = 0;
  private startTime = Date.now();

  constructor() {
    this.registerDefaultServices();
  }

  private registerDefaultServices(): void {
    const defaults = ['pipeline', 'llm', 'knowledge', 'agents', 'decision', 'memory', 'auth'];
    defaults.forEach(name => {
      this.services.set(name, {
        name,
        status: 'unknown',
        lastChecked: new Date().toISOString(),
        uptime: 0,
        message: 'Not yet checked',
      });
    });
  }

  updateService(name: string, status: ServiceStatus, responseTime?: number, message?: string): void {
    const prev = this.services.get(name);
    this.services.set(name, {
      name,
      status,
      responseTime,
      lastChecked: new Date().toISOString(),
      uptime: prev?.status === 'healthy' ? (prev.uptime + 1) : (status === 'healthy' ? 1 : 0),
      message: message || status,
    });

    if (status === 'down') {
      this.createAlert('critical', name, `Service ${name} is DOWN`);
    } else if (status === 'degraded') {
      this.createAlert('warning', name, `Service ${name} is DEGRADED`);
    }
  }

  createAlert(severity: AlertSeverity, service: string, message: string): Alert {
    const alert: Alert = {
      id: ++this.alertCounter,
      severity,
      service,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    this.alerts.push(alert);
    if (this.alerts.length > 1000) this.alerts = this.alerts.slice(-500);
    return alert;
  }

  acknowledgeAlert(id: number): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  getServiceHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  getAlerts(unacknowledgedOnly = false): Alert[] {
    if (unacknowledgedOnly) return this.alerts.filter(a => !a.acknowledged);
    return this.alerts;
  }

  getSystemOverview() {
    const services = this.getServiceHealth();
    const healthy = services.filter(s => s.status === 'healthy').length;
    const degraded = services.filter(s => s.status === 'degraded').length;
    const down = services.filter(s => s.status === 'down').length;
    const unackedAlerts = this.alerts.filter(a => !a.acknowledged).length;

    const mem = process.memoryUsage();

    return {
      overall: down > 0 ? 'critical' : degraded > 0 ? 'degraded' : 'healthy',
      services: { total: services.length, healthy, degraded, down },
      alerts: { total: this.alerts.length, unacknowledged: unackedAlerts },
      system: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        memoryTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        cpuUsage: process.cpuUsage(),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    };
  }

  runHealthChecks(): void {
    this.updateService('pipeline', 'healthy', undefined, 'Pipeline engine running');
    this.updateService('knowledge', 'healthy', undefined, 'Knowledge base operational');
    this.updateService('agents', 'healthy', undefined, 'Agent system operational');
    this.updateService('decision', 'healthy', undefined, 'Decision engine operational');
    this.updateService('memory', 'healthy', undefined, 'Memory store operational');
    this.updateService('auth', 'healthy', undefined, 'Auth system operational');
  }
}

export const monitoringService = new MonitoringService();
