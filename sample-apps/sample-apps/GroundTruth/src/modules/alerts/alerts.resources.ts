import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { store } from '../../store/store.js';
import { requireParams } from '../../lib/uri.js';

const ALERTS_URI = 'alerts://team/{teamId}';

export class AlertsResources {
  @Resource({
    uri: ALERTS_URI,
    name: 'Open team alerts',
    description:
      'Unresolved alerts for a team, newest first — what currently needs a manager\'s attention. ' +
      'teamId is e.g. team-platform.',
    mimeType: 'application/json',
  })
  async getTeamAlerts(uri: string, ctx: ExecutionContext) {
    const { teamId } = requireParams(ALERTS_URI, uri);
    ctx.logger.info('Reading open alerts', { teamId });

    const alerts = store
      .listAlerts(teamId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((alert) => ({
        ...alert,
        employeeName: store.getEmployee(alert.employeeId)?.name ?? alert.employeeId,
      }));

    // NitroStack builds the MCP contents envelope; return the payload tagged as JSON.
    return {
      type: 'json' as const,
      data: {
        teamId,
        openCount: alerts.length,
        bySeverity: {
          high: alerts.filter((a) => a.severity === 'high').length,
          medium: alerts.filter((a) => a.severity === 'medium').length,
          low: alerts.filter((a) => a.severity === 'low').length,
        },
        alerts,
      },
    };
  }
}
