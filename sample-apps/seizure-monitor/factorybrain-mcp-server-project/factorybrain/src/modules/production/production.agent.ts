import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService, MachineRecord } from '../../services/database.service.js';
import { AgentEvent, QueueService } from '../../services/queue.service.js';
import { ProductionDataService } from './production-data.service.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';
import {
  AlternateMachineAssessment,
  OrderPriority,
  PlannedOrderChange,
  PlanningDecision,
  ProductionDisruption,
  ProductionOrder,
  ProductionPlan,
  ProductionSchedule,
} from './production.types.js';

type RecoveryTicket = {
  ticketId?: string;
  machineId?: string;
  createdAt?: string;
  estimatedRepairHours?: number;
  likelyCause?: string;
};

@Injectable({ deps: [DatabaseService, ProductionDataService, QueueService] })
export class ProductionAgent implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService,
    private readonly productionData: ProductionDataService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queue.registerHandler('production', ORCHESTRATOR_JOBS.RUN_PRODUCTION_PLANNING, async (event) => {
      if ((event.payload as any).expectedDelayDays !== undefined) await this.handlePurchaseDelay(event);
      else await this.handlePartReserved(event);
    });
    this.queue.registerHandler('production', 'replan_requested', async (event) => {
      const payload = event.payload as any;
      await this.planDisruption({
        ...payload.disruption,
        reason: `${payload.disruption.reason}; Manager requested replanning: ${payload.feedback ?? payload.decision}`,
      });
    });
  }

  async handlePartReserved(event: AgentEvent<any>): Promise<void> {
    const ticket = (event.payload.ticket ?? {}) as RecoveryTicket;
    await this.planDisruption(this.disruptionFrom(ticket, ticket.estimatedRepairHours ?? 1, event.eventId));
  }

  async handlePurchaseDelay(event: AgentEvent<any>): Promise<void> {
    const ticket = (event.payload.ticket ?? {}) as RecoveryTicket;
    const deliveryHours = Number(event.payload.expectedDelayDays ?? 0) * 24;
    await this.planDisruption(this.disruptionFrom(
      ticket,
      deliveryHours + Number(ticket.estimatedRepairHours ?? 1),
      event.eventId,
    ));
  }

  async planDisruption(disruption: ProductionDisruption): Promise<ProductionPlan> {
    if (disruption.expectedDowntimeHours < 0) throw new Error('Expected downtime cannot be negative');
    const failedMachine = this.requireMachine(disruption.machineId);
    const downtimeStart = validDate(disruption.downtimeStart, 'downtimeStart');
    const downtimeEnd = new Date(downtimeStart.getTime() + disruption.expectedDowntimeHours * 3_600_000);
    const productionDate = isoDate(downtimeStart);
    const orders = this.productionData.listOrders(productionDate);
    const schedules = this.productionData.listSchedules(productionDate);
    const affectedOrders = orders
      .filter((order) => isAffected(order, failedMachine.machineId, downtimeStart, downtimeEnd))
      .sort(prioritySort);

    const alternate = failedMachine.alternateMachine
      ? this.database.findMachine(failedMachine.alternateMachine)
      : undefined;
    const alternateSchedule = schedules.find((schedule) => schedule.machineId === alternate?.machineId);
    const assessment = assessAlternate(failedMachine, alternate, alternateSchedule);
    const orderChanges = this.buildOrderChanges(
      affectedOrders,
      orders,
      alternate,
      alternateSchedule,
      assessment,
      downtimeStart,
      downtimeEnd,
    );

    const totalDelayHours = round(orderChanges.reduce((sum, change) => sum + change.delayHours, 0));
    const plan: ProductionPlan = {
      planId: `PP-${failedMachine.machineId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'Pending Manager Approval',
      disruption,
      downtimeEnd: downtimeEnd.toISOString(),
      alternateMachine: assessment,
      affectedOrderCount: affectedOrders.length,
      orderChanges,
      totalDelayHours,
      summary: summarize(affectedOrders.length, orderChanges, failedMachine.machineId),
    };

    await this.productionData.savePlan(plan);
    await this.queue.publish({
      from: 'production',
      to: 'manager',
      type: ORCHESTRATOR_JOBS.RUN_MANAGER,
      payload: {
        plan,
        summary: {
          ticketId: plan.disruption.sourceReference ?? `DISRUPTION-${plan.disruption.machineId}`,
          planId: plan.planId,
          affectedOrderCount: plan.affectedOrderCount,
          totalDelayHours: plan.totalDelayHours,
          plan,
        },
      },
    }, { idempotencyKey: `manager-${plan.planId}` });
    return plan;
  }

  private buildOrderChanges(
    affectedOrders: ProductionOrder[],
    allOrders: ProductionOrder[],
    alternate: MachineRecord | undefined,
    alternateSchedule: ProductionSchedule | undefined,
    assessment: AlternateMachineAssessment,
    downtimeStart: Date,
    downtimeEnd: Date,
  ): PlannedOrderChange[] {
    if (affectedOrders.length === 0) return [];
    const occupied = alternate
      ? allOrders
        .filter((order) => order.originalMachineId === alternate.machineId && order.status !== 'Cancelled')
        .map((order) => ({ start: new Date(order.scheduledStart), end: new Date(order.scheduledEnd) }))
      : [];
    let allocatedLoad = 0;
    let delayedUntil = downtimeEnd;

    return affectedOrders.map((order) => {
      const originalStart = new Date(order.scheduledStart);
      const originalEnd = new Date(order.scheduledEnd);
      const durationHours = hoursBetween(originalStart, originalEnd);
      const productSupported = Boolean(
        alternateSchedule?.supportedProducts.includes('*') ||
        alternateSchedule?.supportedProducts.includes(order.productName),
      );
      const typeSupported = alternate?.machineType === order.requiredMachineType;
      const capacityAvailable = Boolean(
        alternateSchedule && alternateSchedule.scheduledLoadHours + allocatedLoad + durationHours <= alternateSchedule.capacityHours,
      );
      const slot = assessment.exists && assessment.statusValid && assessment.productionLineValid &&
        assessment.scheduleAvailable && productSupported && typeSupported && capacityAvailable && alternateSchedule
        ? findSlot(
          new Date(Math.max(downtimeStart.getTime(), originalStart.getTime())),
          durationHours,
          occupied,
          new Date(alternateSchedule.availableFrom),
          new Date(alternateSchedule.availableTo),
        )
        : undefined;

      if (slot && alternate) {
        occupied.push(slot);
        allocatedLoad += durationHours;
        return change(order, PlanningDecision.Reroute, alternate.machineId, slot.start, slot.end,
          `Rerouted to validated alternate ${alternate.machineId}; product, machine type, load, and time slot are compatible.`);
      }

      const revisedStart = new Date(Math.max(delayedUntil.getTime(), originalStart.getTime()));
      const revisedEnd = new Date(revisedStart.getTime() + durationHours * 3_600_000);
      delayedUntil = revisedEnd;
      const reasons = [
        ...assessment.reasons,
        ...(productSupported ? [] : ['alternate does not support the product']),
        ...(typeSupported ? [] : ['alternate machine type is incompatible']),
        ...(capacityAvailable ? [] : ['alternate has insufficient remaining capacity']),
      ];
      return change(order, PlanningDecision.Delay, order.originalMachineId, revisedStart, revisedEnd,
        `Delayed until the disrupted machine is available: ${[...new Set(reasons)].join('; ')}.`);
    });
  }

  private requireMachine(machineId: string): MachineRecord {
    const machine = this.database.findMachine(machineId);
    if (!machine) throw new Error(`Unknown disrupted machine: ${machineId}`);
    return machine;
  }

  private disruptionFrom(ticket: RecoveryTicket, expectedDowntimeHours: number, sourceReference: string): ProductionDisruption {
    if (!ticket.machineId) throw new Error('Recovery ticket is missing machineId');
    return {
      machineId: ticket.machineId,
      downtimeStart: ticket.createdAt ?? new Date().toISOString(),
      expectedDowntimeHours,
      reason: ticket.likelyCause ?? 'Machine disruption',
      sourceReference: ticket.ticketId ?? sourceReference,
    };
  }
}

function assessAlternate(
  failed: MachineRecord,
  alternate: MachineRecord | undefined,
  schedule: ProductionSchedule | undefined,
): AlternateMachineAssessment {
  const reasons: string[] = [];
  const statusValid = Boolean(alternate && !['Down', 'Maintenance'].includes(alternate.status) && alternate.currentState !== 'Stopped');
  const productionLineValid = Boolean(alternate && alternate.productionLine === failed.productionLine);
  const machineTypeValid = Boolean(alternate && alternate.machineType === failed.machineType);
  const scheduleAvailable = schedule?.status === 'Available';
  const loadAvailable = Boolean(schedule && schedule.scheduledLoadHours < schedule.capacityHours);
  if (!alternate) reasons.push('alternate machine is not present in the registry');
  if (alternate && !statusValid) reasons.push('alternate machine status is unavailable');
  if (alternate && !productionLineValid) reasons.push('alternate machine is on another production line');
  if (alternate && !machineTypeValid) reasons.push('alternate machine type differs from the failed machine');
  if (!scheduleAvailable) reasons.push('alternate has no available schedule');
  if (!loadAvailable) reasons.push('alternate is at capacity');
  return { machineId: alternate?.machineId, exists: Boolean(alternate), statusValid, productionLineValid, machineTypeValid, scheduleAvailable, loadAvailable, reasons };
}

function isAffected(order: ProductionOrder, machineId: string, start: Date, end: Date): boolean {
  if (order.originalMachineId !== machineId || order.status === 'Completed' || order.status === 'Cancelled') return false;
  return new Date(order.scheduledStart) < end && new Date(order.scheduledEnd) > start;
}

function prioritySort(left: ProductionOrder, right: ProductionOrder): number {
  const weight = { [OrderPriority.Critical]: 0, [OrderPriority.High]: 1, [OrderPriority.Medium]: 2, [OrderPriority.Low]: 3 };
  return weight[left.priority] - weight[right.priority] || Date.parse(left.dueDate) - Date.parse(right.dueDate);
}

function findSlot(start: Date, durationHours: number, occupied: { start: Date; end: Date }[], availableFrom: Date, availableTo: Date) {
  let cursor = new Date(Math.max(start.getTime(), availableFrom.getTime()));
  for (const interval of occupied.sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const proposedEnd = new Date(cursor.getTime() + durationHours * 3_600_000);
    if (proposedEnd <= interval.start) break;
    if (cursor < interval.end && proposedEnd > interval.start) cursor = new Date(interval.end);
  }
  const end = new Date(cursor.getTime() + durationHours * 3_600_000);
  return end <= availableTo ? { start: cursor, end } : undefined;
}

function change(order: ProductionOrder, decision: PlanningDecision, machineId: string, start: Date, end: Date, rationale: string): PlannedOrderChange {
  return {
    orderId: order.orderId, productName: order.productName, priority: order.priority, decision,
    originalMachineId: order.originalMachineId, originalStart: order.scheduledStart, originalEnd: order.scheduledEnd,
    revisedMachineId: machineId, revisedStart: start.toISOString(), revisedEnd: end.toISOString(),
    delayHours: round(Math.max(0, hoursBetween(new Date(order.scheduledEnd), end))), rationale,
  };
}

function summarize(affected: number, changes: PlannedOrderChange[], machineId: string): string {
  if (affected === 0) return `No orders overlap the disruption window for ${machineId}; no schedule change is required.`;
  const rerouted = changes.filter((item) => item.decision === PlanningDecision.Reroute).length;
  const delayed = changes.filter((item) => item.decision === PlanningDecision.Delay).length;
  return `${affected} affected order(s): ${rerouted} proposed reroute(s), ${delayed} proposed delay(s). Manager approval is required.`;
}

function validDate(value: string, field: string): Date {
  const date = new Date(value); if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${field}: ${value}`); return date;
}

function hoursBetween(start: Date, end: Date): number { return (end.getTime() - start.getTime()) / 3_600_000; }
function isoDate(date: Date): string { return date.toISOString().slice(0, 10); }
function round(value: number): number { return Math.round(value * 100) / 100; }
