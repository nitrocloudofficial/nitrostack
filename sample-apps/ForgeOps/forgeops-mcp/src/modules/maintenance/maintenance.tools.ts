/**
 * ForgeOps — Maintenance MCP Server Module
 *
 * Tools:
 *   - get_machine_alerts: Machine alerts with vibration, temperature, conditions
 *   - get_maintenance_state: Current machine state, health score, service history
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '../../nitrostack.js';
import { MACHINE_ALERTS, MAINTENANCE_STATE } from '../../data/incident-data.js';

export class MaintenanceTools {
  @Tool({
    name: 'get_machine_alerts',
    description: 'Retrieve machine alerts including vibration, temperature, and condition anomalies from the maintenance management system.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier (e.g. MCH-B-007)'),
      time_range: z.string().optional().describe('Time range for alerts (e.g. 24h, 7d)'),
    }),
  })
  async getMachineAlerts(input: { machine_id: string; time_range?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Maintenance: Retrieving machine alerts', { machine_id: input.machine_id });

    const alerts = MACHINE_ALERTS[input.machine_id] || [];
    return {
      source: 'maintenance',
      record_id: `alerts:${input.machine_id}`,
      timestamp: new Date().toISOString(),
      machine_id: input.machine_id,
      alerts,
      total_count: alerts.length,
    };
  }

  @Tool({
    name: 'get_maintenance_state',
    description: 'Retrieve current maintenance state, health score, service history, and open work orders for a machine.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier'),
    }),
  })
  async getMaintenanceState(input: { machine_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Maintenance: Retrieving maintenance state', { machine_id: input.machine_id });

    const state = MAINTENANCE_STATE[input.machine_id];
    if (state) return state;

    return {
      source: 'maintenance',
      record_id: `maint:${input.machine_id}`,
      timestamp: new Date().toISOString(),
      machine_id: input.machine_id,
      error: 'Machine not found in system',
    };
  }
}
