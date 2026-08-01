import { NitroServer } from '../../sdk/nitrostack';
import { telemetryStore } from '../../db/telemetryStore.js';

export function registerAlertsModule(server: NitroServer) {
  server.registerTool({
    name: 'isolate_fault_component',
    description: 'Issues command to isolate suspect satellite component or switch to redundant subsystem.',
    parameters: {
      type: 'object',
      properties: {
        component: {
          type: 'string',
          enum: ['PRIMARY_GYRO', 'PAYLOAD_POWER', 'MAIN_BATTERY_BANK_A', 'STAR_TRACKER_1']
        },
        action: {
          type: 'string',
          enum: ['DEWEIGHT', 'POWER_CYCLE', 'ISOLATE', 'SWITCH_REDUNDANT']
        },
        satellite_id: { type: 'string' }
      },
      required: ['component', 'action']
    },
    handler: async (args: { component: string; action: string; satellite_id?: string }) => {
      const satId = args.satellite_id || 'SAT-ALPHA-1';
      return {
        success: true,
        satellite_id: satId,
        target_component: args.component,
        action_taken: args.action,
        new_state: 'ISOLATED_REDUNDANT_ACTIVE',
        timestamp: new Date().toISOString(),
        audit_id: `AUDIT-${Math.floor(100000 + Math.random() * 900000)}`
      };
    }
  });

  server.registerTool({
    name: 'trigger_safe_mode',
    description: 'Triggers emergency spacecraft safe-mode sequence to protect bus hardware.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for manual or automated safe-mode trigger' },
        satellite_id: { type: 'string' }
      },
      required: ['reason']
    },
    handler: async (args: { reason: string; satellite_id?: string }) => {
      return {
        success: true,
        mode: 'SAFE_MODE',
        satellite_id: args.satellite_id || 'SAT-ALPHA-1',
        reason: args.reason,
        actions_executed: [
          'Payloads unpowered',
          'ADCS switched to Sun-pointing detumble',
          'Telemetry transmitter set to low-rate beacon',
          'Heaters set to survival setpoint'
        ],
        timestamp: new Date().toISOString()
      };
    }
  });
}
