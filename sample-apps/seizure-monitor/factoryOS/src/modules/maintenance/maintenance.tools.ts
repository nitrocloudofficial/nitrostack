import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MachineService } from '../../services/machine.service.js';

@Injectable({ deps: [MachineService] })
export class MaintenanceTools {
  constructor(private machineService: MachineService) {}

  @Tool({
    name: 'predict_failure',
    description: 'Failure Prediction Tool: Uses predictive ML models to estimate failure probability, risk levels, and component anomaly windows based on current machine temperature and vibration.',
    inputSchema: z.object({
      machineId: z.string().describe('ID of the machine to evaluate (e.g. "M12", "M21")')
    })
  })
  async predictFailure(input: { machineId: string }, _ctx: ExecutionContext) {
    return await this.machineService.predictFailure(input.machineId);
  }

  @Tool({
    name: 'estimate_repair',
    description: 'Repair Estimation Tool: Calculates estimated repair duration, required replacement parts, labor costs, and financial downtime impact for a machine.',
    inputSchema: z.object({
      machineId: z.string().describe('ID of the machine to estimate repair for (e.g. "M12", "M21")')
    })
  })
  async estimateRepair(input: { machineId: string }, _ctx: ExecutionContext) {
    return await this.machineService.estimateRepair(input.machineId);
  }

  @Tool({
    name: 'shutdown_machine',
    description: 'Shutdown Machine Tool: Safety tool to trigger an immediate shut down of a faulted or warning-state machine to prevent safety hazards or severe hardware damage.',
    inputSchema: z.object({
      machineId: z.string().describe('ID of the machine to shut down safely (e.g. "M12", "M21")')
    })
  })
  async shutdownMachine(input: { machineId: string }, _ctx: ExecutionContext) {
    return await this.machineService.shutdownMachine(input.machineId);
  }

  @Tool({
    name: 'assign_technician',
    description: 'Technician Assignment Tool: Assigns a mechanical or electrical repair technician to service a machine.',
    inputSchema: z.object({
      machineId: z.string().describe('ID of the machine requiring maintenance'),
      technicianId: z.string().describe('ID of the technician assigned (e.g. "TECH-302")'),
      taskDetails: z.string().describe('Details of the diagnostic or repair task')
    })
  })
  async assignTechnician(input: { machineId: string; technicianId: string; taskDetails: string }, _ctx: ExecutionContext) {
    return await this.machineService.assignTechnician(input.machineId, input.technicianId, input.taskDetails);
  }
}
