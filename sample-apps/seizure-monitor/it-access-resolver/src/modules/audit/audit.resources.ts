import { ResourceDecorator as Resource, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';
import { getAuditLog, getRecentAuditLog } from './audit.service.js';

/**
 * AuditResources — exposes the compliance audit log as MCP resources.
 *
 * audit://history  → full immutable audit trail (all records)
 * audit://recent   → last 10 records, most recent first
 */
@Controller('audit')
export class AuditResources {

  @Resource({
    uri: 'audit://history',
    name: 'Audit History',
    description:
      'Full SOC-2 style compliance audit trail. Returns every automated action taken by the ' +
      'IT Access Resolver since server start, including ticket creation, diagnosis, resolution, ' +
      'and escalation events with simulated employee notifications.',
    mimeType: 'application/json',
  })
  async getHistory(uri: string, ctx: ExecutionContext) {
    ctx?.logger?.info('Reading audit://history resource');
    const log = getAuditLog();
    return {
      contents: [
        {
          uri: uri || 'audit://history',
          mimeType: 'application/json',
          text: JSON.stringify({ totalRecords: log.length, records: log }, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'audit://recent',
    name: 'Recent Audit Events',
    description:
      'The 10 most recent compliance audit events, ordered newest-first. ' +
      'Use this to get a quick real-time snapshot of what the resolver has been doing.',
    mimeType: 'application/json',
  })
  async getRecent(uri: string, ctx: ExecutionContext) {
    ctx?.logger?.info('Reading audit://recent resource');
    const records = getRecentAuditLog(10);
    return {
      contents: [
        {
          uri: uri || 'audit://recent',
          mimeType: 'application/json',
          text: JSON.stringify({ count: records.length, records }, null, 2),
        },
      ],
    };
  }
}
