import { Injectable, OnModuleInit } from '@nitrostack/core';
import {
  DatabaseService,
  MachineAlert,
  MaintenanceLog,
  MaintenanceTicket,
  RiskLevel,
  SparePartRequest,
  TechnicianAssignment,
} from '../../services/database.service.js';
import { QueueService } from '../../services/queue.service.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';

export interface MaintenancePlan {
  ticket: MaintenanceTicket;
  sparePartRequest: SparePartRequest;
  history: MaintenanceLog[];
  selectedTechnician: TechnicianAssignment;
}

@Injectable({ deps: [DatabaseService, QueueService] })
export class MaintenanceAgent implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queue.registerHandler('maintenance', ORCHESTRATOR_JOBS.RUN_MAINTENANCE, async (event) => {
      await this.handleMachineAlert(event as { payload: MachineAlert });
    });
  }

  async handleMachineAlert(event: { payload: MachineAlert }): Promise<void> {
    await this.createMaintenanceTicket(event.payload);
  }

  async createMaintenanceTicket(alert: MachineAlert): Promise<MaintenancePlan> {
    const machine = this.database.findMachine(alert.machineId);
    if (!machine) {
      throw new Error(`Unknown machine for maintenance alert: ${alert.machineId}`);
    }

    const requiredPart = machine.primaryPart || alert.primaryPart;
    const assignedTeam = machine.maintenanceTeam;
    const history = this.database.getMaintenanceHistory(machine.machineId, requiredPart, alert.likelyCause);
    const selectedTechnician = this.selectTechnician(assignedTeam);
    const estimatedRepairHours = this.estimateRepairHours(history, alert.urgency);
    const ticketId = `MT-${machine.machineId}-${Date.now()}`;

    const ticket = await this.database.saveMaintenanceTicket({
      ticketId,
      machineId: machine.machineId,
      machineName: machine.machineName,
      likelyCause: alert.likelyCause,
      requiredPart,
      estimatedRepairHours,
      assignedTeam,
      assignedTechnician: selectedTechnician.technicianId,
      urgency: alert.urgency,
      status: 'Assigned',
      createdAt: new Date().toISOString(),
      sourceAlertId: alert.alertId,
      historyMatches: history.length,
      notes: this.buildPlanningNotes(history, requiredPart, assignedTeam),
    });

    const sparePartRequest = await this.database.saveSparePartRequest({
      requestId: `SPR-${ticketId}`,
      ticketId,
      machineId: machine.machineId,
      partId: normalizePartId(requiredPart),
      partName: requiredPart,
      urgency: alert.urgency,
      quantity: 1,
      requestedBy: 'Maintenance Agent',
      requestedAt: ticket.createdAt,
    });

    await this.queue.publish({
      from: 'maintenance',
      to: 'manager',
      type: 'maintenance_summary',
      payload: {
        ticketId: ticket.ticketId,
        machineId: ticket.machineId,
        likelyCause: ticket.likelyCause,
        requiredPart: ticket.requiredPart,
        estimatedRepairHours: ticket.estimatedRepairHours,
        assignedTeam: ticket.assignedTeam,
        urgency: ticket.urgency,
      },
    }, { idempotencyKey: `manager-maintenance-${ticket.ticketId}` });

    await this.queue.publish({
      from: 'maintenance',
      to: 'inventory',
      type: ORCHESTRATOR_JOBS.RUN_INVENTORY,
      payload: {
        ticket,
        sparePartRequest,
      },
    }, { idempotencyKey: `${ticket.ticketId}:inventory` });

    return {
      ticket,
      sparePartRequest,
      history,
      selectedTechnician,
    };
  }

  private estimateRepairHours(history: MaintenanceLog[], urgency: RiskLevel): number {
    const completed = history.filter((log) => log.estimatedRepairHours > 0 && log.maintenanceStatus === 'Completed');
    const source = completed.length > 0 ? completed : history.filter((log) => log.estimatedRepairHours > 0);
    const average = source.length > 0
      ? source.reduce((sum, log) => sum + log.estimatedRepairHours, 0) / source.length
      : 3;
    const urgencyFactor = urgency === 'Critical' ? 1.15 : urgency === 'High' ? 1.05 : 1;
    return Math.max(1, Math.round(average * urgencyFactor * 10) / 10);
  }

  private selectTechnician(team: string): TechnicianAssignment {
    const technicians = this.database.listTechnicians(team);
    return technicians.find((technician) => technician.availability === 'Available') ?? technicians[0];
  }

  private buildPlanningNotes(history: MaintenanceLog[], requiredPart: string, assignedTeam: string): string[] {
    const samePartRepairs = history.filter((log) => log.requiredPart === requiredPart);
    const completedRepairs = history.filter((log) => log.maintenanceStatus === 'Completed');
    return [
      `Required part confirmed from machine registry: ${requiredPart}.`,
      `Assigned team confirmed from machine registry: ${assignedTeam}.`,
      `Matched ${history.length} historical maintenance records; ${samePartRepairs.length} used the same part.`,
      `Repair estimate is based on ${completedRepairs.length || history.length || 0} past repair record(s).`,
    ];
  }
}

function normalizePartId(partName: string): string {
  return partName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
