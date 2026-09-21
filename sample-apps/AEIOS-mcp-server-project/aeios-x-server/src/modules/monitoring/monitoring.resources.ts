import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { monitoringService } from './monitoring.service.js';

export class MonitoringResources {
  @Resource({
    uri: 'aeios://monitoring/dashboard',
    name: 'Monitoring Dashboard',
    description: 'Real-time system monitoring dashboard with service health and alerts',
    mimeType: 'application/json',
  })
  async dashboard(ctx: ExecutionContext) {
    monitoringService.runHealthChecks();
    const overview = monitoringService.getSystemOverview();
    const services = monitoringService.getServiceHealth();
    const alerts = monitoringService.getAlerts(true);

    return {
      contents: [{
        uri: 'aeios://monitoring/dashboard',
        mimeType: 'application/json',
        text: JSON.stringify({ overview, services, activeAlerts: alerts }, null, 2),
      }],
    };
  }
}
