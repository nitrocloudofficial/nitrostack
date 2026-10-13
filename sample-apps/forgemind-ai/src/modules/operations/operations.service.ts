import { Injectable } from '@nitrostack/core';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const productionSchedule = require('../../../fixtures/productionSchedule.json');
const inventoryData = require('../../../fixtures/inventory.json');

@Injectable()
export class OperationsService {
  private schedule: any = productionSchedule;
  private inventory: any = inventoryData;

  getProductionSchedule() {
    return this.schedule;
  }

  getInventory() {
    return this.inventory;
  }

  checkSpareParts(machineId: string) {
    const parts = this.inventory.parts || [];
    return parts.filter((p: any) => p.compatibleMachines.includes(machineId.toUpperCase()));
  }

  checkInventory(category?: string) {
    const items = this.inventory.parts || [];
    if (category) {
      return items.filter((i: any) => i.category?.toLowerCase() === category.toLowerCase());
    }
    return items;
  }

  recommendMaintenanceWindow(machineId: string) {
    return {
      machineId: machineId.toUpperCase(),
      recommendedWindow: 'Tonight, 22:00 - 02:00 UTC',
      estimatedDowntimeHours: 3.5,
      impactOnProduction: 'Minimal - Off-peak shift gap',
      technicianAssigned: 'Alex Vance (Bearing Specialist)'
    };
  }

  simulateScenario(machineId: string, hours: number) {
    const machineUpper = machineId.toUpperCase();
    const downtimeCostPerHour = 3600;
    const estimatedDowntime = hours > 12 ? 8 : 4;
    const revenueLoss = estimatedDowntime * downtimeCostPerHour;

    return {
      machineId: machineUpper,
      delayedHours: hours,
      failureRiskEscalation: hours >= 24 ? '98% (Catastrophic Failure)' : '75% (High Risk)',
      expectedDowntimeHours: estimatedDowntime,
      lostProductionUnits: hours * 15,
      financialCostImpact: `$${revenueLoss.toLocaleString()} USD`,
      recommendation: 'Immediate repair strongly recommended to avoid revenue loss.'
    };
  }

  recommendProductionReroute(sourceMachineId: string) {
    const schedule = this.schedule.schedule || [];
    const sourceTask = schedule.find((s: any) => s.machineId === sourceMachineId.toUpperCase());

    return {
      success: true,
      sourceMachine: sourceMachineId.toUpperCase(),
      recommendedTargetMachine: 'M6',
      transferredLoad: sourceTask?.assignedLoad || '90%',
      targetCapacityAvailable: '20% Spare Capacity',
      estimatedImpact: 'Zero production downtime. 100% capacity absorption on M6.'
    };
  }

  createMaintenanceTicket(
    machineId: string,
    issue: string,
    priority: string = 'CRITICAL',
    assignedTo: string = 'Alex Vance'
  ) {
    return {
      ticketId: 'TKT-1001',
      machineId: machineId.toUpperCase(),
      issueSummary: issue,
      priority: priority,
      assignedTechnician: assignedTo,
      status: 'OPEN - ASSIGNED',
      partsReserved: ['2x Precision Roller Bearings (Part #BRG-4092)'],
      createdAt: new Date().toISOString()
    };
  }

  notifySupervisor(machineId: string, alertLevel: string = 'CRITICAL', message?: string) {
    return {
      success: true,
      alertId: 'ALT-99201',
      targetMachine: machineId.toUpperCase(),
      severity: alertLevel,
      dispatchedMessage: message || `Critical threshold breach on Machine ${machineId.toUpperCase()}. Ticket TKT-1001 active.`,
      dispatchedChannel: 'SMS / Push Notification / Operations Dashboard',
      recipient: 'Operations Supervisor On-Duty',
      timestamp: new Date().toISOString()
    };
  }
}