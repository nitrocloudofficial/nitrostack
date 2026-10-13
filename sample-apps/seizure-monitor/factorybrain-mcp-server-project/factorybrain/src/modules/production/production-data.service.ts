import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { OrderPriority, ProductionOrder, ProductionPlan, ProductionSchedule } from './production.types.js';

@Injectable({ deps: [DatabaseService] })
export class ProductionDataService implements OnModuleInit {
  private readonly dataDir = resolve(process.env.FACTORYBRAIN_DATA_DIR ?? join(process.cwd(), 'data'));
  private orders: ProductionOrder[] = [];
  private schedules: ProductionSchedule[] = [];
  private plans: ProductionPlan[] = [];

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    this.orders = loadCsv(join(this.dataDir, 'production_orders_FIXED.csv')).map(toOrder);
    this.schedules = loadCsv(join(this.dataDir, 'production_schedule_FIXED.csv')).map(toSchedule);
    const state = await this.database.initializeProduction(this.orders, this.schedules);
    this.orders = state.orders;
    this.schedules = state.schedules;
    this.plans = state.plans;
  }

  listOrders(productionDate?: string): ProductionOrder[] {
    return this.orders
      .filter((order) => !productionDate || order.productionDate === productionDate)
      .map((order) => ({ ...order }));
  }

  listSchedules(productionDate?: string): ProductionSchedule[] {
    return this.schedules
      .filter((schedule) => !productionDate || schedule.productionDate === productionDate)
      .map((schedule) => ({ ...schedule, supportedProducts: [...schedule.supportedProducts] }));
  }

  listPlans(): ProductionPlan[] {
    return this.plans.map(clonePlan);
  }

  async savePlan(plan: ProductionPlan): Promise<ProductionPlan> {
    await this.database.insertProductionPlan(plan);
    this.plans.push(plan);
    return clonePlan(plan);
  }
}

function loadCsv(filePath: string): Record<string, string>[] {
  if (!existsSync(filePath)) throw new Error(`Production CSV not found at ${filePath}`);
  const lines = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines.shift() ?? '');
  return lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"'; index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { cells.push(value); value = ''; }
    else value += character;
  }
  cells.push(value);
  return cells;
}

function toOrder(row: Record<string, string>): ProductionOrder {
  return {
    orderId: row.orderId, productName: row.productName, quantity: number(row.quantity),
    priority: priority(row.priority), dueDate: row.dueDate, productionDate: row.productionDate,
    originalMachineId: row.originalMachineId, requiredMachineType: row.requiredMachineType,
    scheduledStart: row.scheduledStart, scheduledEnd: row.scheduledEnd,
    status: orderStatus(row.status),
  };
}

function toSchedule(row: Record<string, string>): ProductionSchedule {
  return {
    machineId: row.machineId, productionDate: row.productionDate,
    availableFrom: row.availableFrom, availableTo: row.availableTo,
    capacityHours: number(row.capacityHours), scheduledLoadHours: number(row.scheduledLoadHours),
    supportedProducts: row.supportedProducts.split(';').map((value) => value.trim()).filter(Boolean),
    status: scheduleStatus(row.status),
  };
}

function priority(value: string): OrderPriority {
  return Object.values(OrderPriority).includes(value as OrderPriority) ? value as OrderPriority : OrderPriority.Medium;
}

function orderStatus(value: string): ProductionOrder['status'] {
  return value === 'In Progress' || value === 'Completed' || value === 'Cancelled' ? value : 'Scheduled';
}

function scheduleStatus(value: string): ProductionSchedule['status'] {
  return value === 'Unavailable' || value === 'Maintenance' ? value : 'Available';
}

function number(value: string): number {
  const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0;
}

function clonePlan(plan: ProductionPlan): ProductionPlan {
  return {
    ...plan,
    disruption: { ...plan.disruption },
    alternateMachine: { ...plan.alternateMachine, reasons: [...plan.alternateMachine.reasons] },
    orderChanges: plan.orderChanges.map((change) => ({ ...change })),
  };
}
