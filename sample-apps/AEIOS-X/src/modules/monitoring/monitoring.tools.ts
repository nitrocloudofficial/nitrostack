import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { monitoringService, type AlertSeverity } from './monitoring.service.js';

export class MonitoringTools {
  @Tool({
    name: 'monitor_overview',
    description: 'Get complete system monitoring overview - service health, alerts, system resources',
    parameters: z.object({}),
  })
  async overview(ctx: ExecutionContext) {
    monitoringService.runHealthChecks();
    const overview = monitoringService.getSystemOverview();
    return { content: [{ type: 'text' as const, text: JSON.stringify(overview, null, 2) }] };
  }

  @Tool({
    name: 'monitor_services',
    description: 'Get health status of all enterprise services',
    parameters: z.object({}),
  })
  async services(ctx: ExecutionContext) {
    monitoringService.runHealthChecks();
    const services = monitoringService.getServiceHealth();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ services }, null, 2) }] };
  }

  @Tool({
    name: 'monitor_alerts',
    description: 'Get system alerts with optional filter for unacknowledged only',
    parameters: z.object({
      unacknowledgedOnly: z.boolean().optional().describe('Show only unacknowledged alerts'),
    }),
  })
  async alerts(ctx: ExecutionContext) {
    const { unacknowledgedOnly } = ctx.params as { unacknowledgedOnly?: boolean };
    const alerts = monitoringService.getAlerts(unacknowledgedOnly ?? false);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ count: alerts.length, alerts }, null, 2) }] };
  }

  @Tool({
    name: 'monitor_create_alert',
    description: 'Create a manual monitoring alert',
    parameters: z.object({
      severity: z.enum(['info', 'warning', 'critical']).describe('Alert severity'),
      service: z.string().describe('Service name'),
      message: z.string().describe('Alert message'),
    }),
  })
  async createAlert(ctx: ExecutionContext) {
    const { severity, service, message } = ctx.params as { severity: AlertSeverity; service: string; message: string };
    const alert = monitoringService.createAlert(severity, service, message);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, alert }, null, 2) }] };
  }

  @Tool({
    name: 'monitor_acknowledge_alert',
    description: 'Acknowledge a monitoring alert',
    parameters: z.object({
      alertId: z.number().describe('Alert ID to acknowledge'),
    }),
  })
  async acknowledgeAlert(ctx: ExecutionContext) {
    const { alertId } = ctx.params as { alertId: number };
    const success = monitoringService.acknowledgeAlert(alertId);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success, alertId }, null, 2) }] };
  }
}
