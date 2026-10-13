import 'dotenv/config';
import { 
  ControllerDecorator as Controller, 
  ToolDecorator as Tool, 
  z, 
  ExecutionContext 
} from '@nitrostack/core';
import { 
  checkMachineHealthLogic,
  predictFailureLogic,
  scheduleMaintenanceLogic 
} from '../maintenance.tools.js';

export const checkMachineHealthSchema = z.object({
  machineId: z.string().optional().describe('Machine ID (e.g. "CNC-01", "PRESS-04", "MCH-212"). Omit for all.'),
});

export const predictFailureSchema = z.object({
  machineId: z.string().describe('Target machine ID (e.g. "MCH-212").'),
  timeframeHours: z.number().optional().default(72),
});

export const scheduleMaintenanceSchema = z.object({
  machineId: z.string().describe('Exact Machine ID to schedule (e.g. MCH-212).'),
  maintenanceType: z.enum(['PREVENTATIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION']).optional().default('EMERGENCY'),
  scheduledDate: z.string().optional().describe('Scheduled date/time for maintenance.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('CRITICAL'),
  assignedTechnician: z.string().optional().default('Alex Vance'),
  recipientEmail: z.string().optional().default('cb.ai.u4aid25043@cb.students.amrita.edu'),
  technicianNotes: z.string().optional().describe('Reason for maintenance or diagnostic notes.'),
});

@Controller()
export class MaintenanceController {
  @Tool({
    name: 'check_machine_health',
    description: 'Checks health status, temperature, and telemetry of plant machinery.',
    inputSchema: checkMachineHealthSchema,
  })
  async checkMachineHealth(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Checking health status for machine: ${input?.machineId || 'All'}`);
    return checkMachineHealthLogic(input);
  }

  @Tool({
    name: 'predict_failure',
    description: 'Predicts failure probability and component risks for plant equipment.',
    inputSchema: predictFailureSchema,
  })
  async predictFailure(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Predicting failure risks for machine: ${input?.machineId}`);
    return predictFailureLogic(input);
  }

  @Tool({
    name: 'schedule_maintenance',
    description: 'Schedules maintenance work orders and dispatches detailed email notifications to technicians.',
    inputSchema: scheduleMaintenanceSchema,
  })
  async scheduleMaintenance(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Scheduling maintenance work order for machine: ${input?.machineId}`);
    return scheduleMaintenanceLogic(input);
  }
}
