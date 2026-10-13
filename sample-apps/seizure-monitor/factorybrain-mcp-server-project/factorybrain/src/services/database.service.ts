import { Injectable, OnModuleInit } from '@nitrostack/core';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Collection, Db, Document, MongoClient } from 'mongodb';
import type { InventoryItem, Reservation } from '../modules/inventory/inventory.types.js';
import type { PurchaseRequestRecord } from '../modules/purchase/purchase.types.js';
import type { ProductionOrder, ProductionPlan, ProductionSchedule } from '../modules/production/production.types.js';
import type { ApprovalRequest, AuditLog, FactoryConfiguration, ManagerWorkflow } from '../modules/manager/manager.types.js';
import type { NotificationAuditLog, NotificationRecord } from '../modules/notification/notification.types.js';
import type { LiveMonitoringEvent, MonitoringAgentEvent, MonitoringAlert, WorkflowTrackingRecord } from '../modules/monitoring/monitoring.types.js';
import type { FactoryWorkflow, WorkflowAgentEvent } from '../orchestrator/types/workflow.types.js';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface MachineRecord {
  machineId: string;
  machineName: string;
  machineType: string;
  productionLine: string;
  location: string;
  installDate: string;
  operatingHours: number;
  healthScore: number;
  status: string;
  currentState: string;
  simulationMode: string;
  riskLevel: RiskLevel;
  sensorProfile: string;
  failureProfile: string;
  primaryPart: string;
  alternateMachine: string;
  currentJob: string;
  operatorId: string;
  maintenanceTeam: string;
  lastMaintenance: string;
  nextMaintenance: string;
  criticality: RiskLevel;
  factory: string;
}

export interface SensorReading {
  machineId: string;
  timestamp: string;
  airTemperature: number;
  processTemperature: number;
  rpm: number;
  torque: number;
  vibration: number;
  pressure: number;
  humidity: number;
  voltage: number;
  current: number;
  powerConsumption: number;
  toolWear: number;
  operatingHours: number;
  maintenanceRequired?: boolean;
}

export interface MachineAlert {
  kind: 'machine_failure';
  alertId: string;
  machineId: string;
  failureProbability: number;
  urgency: RiskLevel;
  likelyCause: string;
  primaryPart: string;
  timestamp: string;
  message: string;
}

export interface MaintenanceLog {
  maintenanceId: string;
  machineId: string;
  telemetryId: string;
  maintenanceDate: string;
  issueDetected: string;
  issueSeverity: RiskLevel;
  maintenanceType: string;
  maintenanceStatus: string;
  assignedTeam: string;
  assignedTechnician: string;
  requiredPart: string;
  inventoryStatus: string;
  estimatedRepairHours: number;
  maintenanceCostGbp: number;
  productionImpact: string;
  rootCause: string;
  nextMaintenanceDate: string;
  remarks: string;
  createdBy: string;
}

export interface TechnicianAssignment {
  technicianId: string;
  team: string;
  availability: 'Available' | 'Busy';
}

export interface MaintenanceTicket {
  ticketId: string;
  machineId: string;
  machineName: string;
  likelyCause: string;
  requiredPart: string;
  estimatedRepairHours: number;
  assignedTeam: string;
  assignedTechnician: string;
  urgency: RiskLevel;
  status: 'Created' | 'Assigned' | 'In Progress' | 'Completed';
  createdAt: string;
  sourceAlertId: string;
  historyMatches: number;
  notes: string[];
}

export interface SparePartRequest {
  requestId: string;
  ticketId: string;
  machineId: string;
  partId: string;
  partName: string;
  urgency: RiskLevel;
  quantity: number;
  requestedBy: string;
  requestedAt: string;
}

export interface AgentEventRecord {
  eventId: string;
  from: string;
  to: string;
  type: string;
  payload: unknown;
  timestamp: string;
  status: 'queued' | 'started' | 'delivered' | 'failed';
  error?: string;
}

const SENSOR_KEYS = [
  'airTemperature',
  'processTemperature',
  'rpm',
  'torque',
  'vibration',
  'pressure',
  'humidity',
  'voltage',
  'current',
  'powerConsumption',
  'toolWear',
  'operatingHours',
] as const;

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly machines = new Map<string, MachineRecord>();
  private readonly sensorData: SensorReading[] = [];
  private readonly alerts: MachineAlert[] = [];
  private readonly maintenanceLogs: MaintenanceLog[] = [];
  private readonly maintenanceTickets: MaintenanceTicket[] = [];
  private readonly sparePartRequests: SparePartRequest[] = [];
  private readonly purchaseRequests = new Map<string, PurchaseRequestRecord>();
  private readonly agentEvents: AgentEventRecord[] = [];
  private readonly managerWorkflows = new Map<string, ManagerWorkflow>();
  private readonly approvalRequests = new Map<string, ApprovalRequest>();
  private readonly auditLogs: AuditLog[] = [];
  private readonly notifications = new Map<string, NotificationRecord>();
  private readonly notificationAudits: NotificationAuditLog[] = [];
  private notificationSequence = 0;
  private readonly monitoringWorkflows = new Map<string, WorkflowTrackingRecord>();
  private readonly monitoringEvents = new Map<string, MonitoringAgentEvent>();
  private readonly monitoringAlerts = new Map<string, MonitoringAlert>();
  private readonly monitoringLiveEvents = new Map<number, LiveMonitoringEvent>();
  private readonly factoryWorkflows = new Map<string, FactoryWorkflow>();
  private readonly workflowAgentEvents = new Map<string, WorkflowAgentEvent>();
  private monitoringSequence = 0;
  private factoryConfiguration?: FactoryConfiguration;
  private readonly dataDir = resolve(process.env.FACTORYBRAIN_DATA_DIR ?? join(process.cwd(), 'data'));
  private mongoClient?: MongoClient;
  private mongoDatabase?: Db;
  private initializationPromise?: Promise<void>;

  async onModuleInit(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      this.loadMachines();
      this.loadMaintenanceLogs();
      this.loadSensorData();
      await this.connectMongo();
    })();

    return this.initializationPromise;
  }

  findMachine(machineId: string): MachineRecord | undefined {
    return this.machines.get(machineId);
  }

  listMachines(): MachineRecord[] {
    return [...this.machines.values()];
  }

  getRecentReadings(machineId: string, limit = 20): SensorReading[] {
    return this.sensorData
      .filter((reading) => reading.machineId === machineId)
      .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
      .slice(-limit);
  }

  async saveSensorReading(reading: SensorReading): Promise<SensorReading> {
    await this.insertDurably('sensor_data', reading);
    this.sensorData.push(reading);
    return reading;
  }

  async saveAlert(alert: MachineAlert): Promise<MachineAlert> {
    await this.insertDurably('alerts', alert);
    this.alerts.push(alert);
    return alert;
  }

  listAlerts(machineId?: string): MachineAlert[] {
    return machineId ? this.alerts.filter((alert) => alert.machineId === machineId) : [...this.alerts];
  }

  getMaintenanceHistory(machineId: string, requiredPart?: string, issueDetected?: string): MaintenanceLog[] {
    return this.maintenanceLogs
      .filter((log) => log.machineId === machineId || log.requiredPart === requiredPart || log.issueDetected === issueDetected)
      .sort((left, right) => Date.parse(right.maintenanceDate) - Date.parse(left.maintenanceDate));
  }

  listMaintenanceLogs(): MaintenanceLog[] {
    return [...this.maintenanceLogs];
  }

  listTechnicians(team: string): TechnicianAssignment[] {
    const activeStatuses = new Set(['Assigned', 'In Progress']);
    const technicianIds = new Set(
      this.maintenanceLogs
        .filter((log) => log.assignedTeam === team)
        .map((log) => log.assignedTechnician)
        .filter(Boolean),
    );

    if (technicianIds.size === 0) {
      technicianIds.add(`${team.replace(/\W+/g, '').toUpperCase()}-TECH-01`);
    }

    return [...technicianIds].map((technicianId) => ({
      technicianId,
      team,
      availability: this.isTechnicianBusy(technicianId, activeStatuses) ? 'Busy' : 'Available',
    }));
  }

  async saveMaintenanceTicket(ticket: MaintenanceTicket): Promise<MaintenanceTicket> {
    await this.insertDurably('maintenance_tickets', ticket);
    this.maintenanceTickets.push(ticket);
    return ticket;
  }

  listMaintenanceTickets(machineId?: string): MaintenanceTicket[] {
    return machineId
      ? this.maintenanceTickets.filter((ticket) => ticket.machineId === machineId)
      : [...this.maintenanceTickets];
  }

  async saveSparePartRequest(request: SparePartRequest): Promise<SparePartRequest> {
    await this.insertDurably('spare_part_requests', request);
    this.sparePartRequests.push(request);
    return request;
  }

  listSparePartRequests(ticketId?: string): SparePartRequest[] {
    return ticketId
      ? this.sparePartRequests.filter((request) => request.ticketId === ticketId)
      : [...this.sparePartRequests];
  }

  async saveAgentEvent(event: AgentEventRecord): Promise<AgentEventRecord> {
    if (this.mongoDatabase) {
      await this.collection('agent_events').updateOne(
        { eventId: event.eventId },
        { $set: event as unknown as Document },
        { upsert: true },
      );
    }
    const index = this.agentEvents.findIndex((candidate) => candidate.eventId === event.eventId);
    if (index >= 0) {
      this.agentEvents[index] = event;
    } else {
      this.agentEvents.push(event);
    }
    return { ...event };
  }

  listAgentEvents(): AgentEventRecord[] {
    return this.agentEvents.map((event) => ({ ...event }));
  }

  async initializeFactoryWorkflows(): Promise<FactoryWorkflow[]> {
    if (this.mongoDatabase) {
      await this.collection('factory_workflows').createIndex({ workflowId: 1 }, { unique: true });
      await this.collection('factory_workflows').createIndex({ sourceAlertId: 1 }, { unique: true });
      const [workflows, events] = await Promise.all([
        this.collection('factory_workflows').find({}, { projection: { _id: 0 } }).toArray(),
        this.collection('agent_events').find({ kind: 'orchestration_event' }, { projection: { _id: 0 } }).toArray(),
      ]);
      this.factoryWorkflows.clear(); for (const item of workflows as unknown as FactoryWorkflow[]) this.factoryWorkflows.set(item.workflowId, clone(item));
      this.workflowAgentEvents.clear(); for (const item of events as unknown as WorkflowAgentEvent[]) this.workflowAgentEvents.set(item.agentEventId, clone(item));
    }
    return this.listFactoryWorkflows();
  }
  async createFactoryWorkflow(workflow: FactoryWorkflow): Promise<{ workflow: FactoryWorkflow; created: boolean }> {
    const local = [...this.factoryWorkflows.values()].find((item) => item.sourceAlertId === workflow.sourceAlertId);
    if (local) return { workflow: clone(local), created: false };
    if (this.mongoDatabase) {
      const saved = await this.collection('factory_workflows').findOneAndUpdate({ sourceAlertId: workflow.sourceAlertId }, { $setOnInsert: workflow as unknown as Document }, { upsert: true, returnDocument: 'after', projection: { _id: 0 } }) as unknown as FactoryWorkflow;
      this.factoryWorkflows.set(saved.workflowId, clone(saved)); return { workflow: clone(saved), created: saved.workflowId === workflow.workflowId };
    }
    this.factoryWorkflows.set(workflow.workflowId, clone(workflow)); return { workflow: clone(workflow), created: true };
  }
  async saveFactoryWorkflow(workflow: FactoryWorkflow): Promise<FactoryWorkflow> {
    if (this.mongoDatabase) await this.collection('factory_workflows').updateOne({ workflowId: workflow.workflowId }, { $set: workflow as unknown as Document }, { upsert: true });
    this.factoryWorkflows.set(workflow.workflowId, clone(workflow)); return clone(workflow);
  }
  findFactoryWorkflow(workflowId: string): FactoryWorkflow | undefined { const item = this.factoryWorkflows.get(workflowId); return item ? clone(item) : undefined; }
  findFactoryWorkflowByAlert(alertId: string): FactoryWorkflow | undefined { const item = [...this.factoryWorkflows.values()].find((value) => value.sourceAlertId === alertId); return item ? clone(item) : undefined; }
  listFactoryWorkflows(): FactoryWorkflow[] { return [...this.factoryWorkflows.values()].map(clone); }
  async saveWorkflowAgentEvent(event: WorkflowAgentEvent): Promise<WorkflowAgentEvent> {
    if (this.workflowAgentEvents.has(event.agentEventId)) return clone(this.workflowAgentEvents.get(event.agentEventId)!);
    if (this.mongoDatabase) await this.collection('agent_events').updateOne({ agentEventId: event.agentEventId }, { $setOnInsert: event as unknown as Document }, { upsert: true });
    this.workflowAgentEvents.set(event.agentEventId, clone(event)); return clone(event);
  }
  listWorkflowAgentEvents(workflowId?: string): WorkflowAgentEvent[] { return [...this.workflowAgentEvents.values()].filter((item) => !workflowId || item.workflowId === workflowId).map(clone); }

  findAgentEvent(eventId: string): AgentEventRecord | undefined {
    const event = this.agentEvents.find((candidate) => candidate.eventId === eventId);
    return event ? { ...event } : undefined;
  }

  hasDurableStore(): boolean {
    return Boolean(this.mongoDatabase);
  }

  async initializeInventory(seedItems: InventoryItem[]): Promise<{ items: InventoryItem[]; reservations: Reservation[] }> {
    if (!this.mongoDatabase) return { items: seedItems, reservations: [] };
    await Promise.all([
      this.collection('inventory').createIndex({ partId: 1 }, { unique: true }),
      this.collection('reservations').createIndex({ reservationId: 1 }, { unique: true }),
    ]);
    await this.seedMongoCollection('inventory', seedItems, 'partId');
    const [items, reservations] = await Promise.all([
      this.collection('inventory').find({}, { projection: { _id: 0 } }).toArray(),
      this.collection('reservations').find({}, { projection: { _id: 0 } }).toArray(),
    ]);
    return {
      items: items as unknown as InventoryItem[],
      reservations: reservations as unknown as Reservation[],
    };
  }

  async reserveInventoryAtomically(
    partId: string,
    quantity: number,
    reservation: Reservation,
  ): Promise<InventoryItem> {
    if (!this.mongoDatabase) throw new Error('MongoDB is not configured');
    const now = reservation.createdAt;
    const updated = await this.collection('inventory').findOneAndUpdate(
      { partId, availableQuantity: { $gte: quantity } },
      {
        $inc: { reservedQuantity: quantity, availableQuantity: -quantity },
        $set: { lastUpdated: now },
      },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (!updated) throw new Error(`Insufficient stock for ${partId}`);

    const item = updated as unknown as InventoryItem;
    item.inventoryStatus = inventoryStatusFor(item);
    try {
      await this.collection('reservations').insertOne(reservation as unknown as Document);
      await this.collection('inventory').updateOne(
        { partId },
        { $set: { inventoryStatus: item.inventoryStatus } },
      );
    } catch (error) {
      await this.collection('inventory').updateOne(
        { partId },
        { $inc: { reservedQuantity: -quantity, availableQuantity: quantity } },
      );
      throw error;
    }
    return item;
  }

  async savePendingReservation(item: InventoryItem, reservation: Reservation): Promise<void> {
    if (!this.mongoDatabase) return;
    await this.collection('reservations').insertOne(reservation as unknown as Document);
    try {
      await this.collection('inventory').updateOne(
        { partId: item.partId },
        { $set: { inventoryStatus: item.inventoryStatus, lastUpdated: item.lastUpdated } },
      );
    } catch (error) {
      await this.collection('reservations').deleteOne({ reservationId: reservation.reservationId });
      throw error;
    }
  }

  async initializePurchaseRequests(seedRequests: PurchaseRequestRecord[]): Promise<PurchaseRequestRecord[]> {
    if (!this.mongoDatabase) {
      this.purchaseRequests.clear();
      for (const request of seedRequests) this.purchaseRequests.set(request.purchaseRequestId, clone(request));
      return this.listPurchaseRequests();
    }
    await this.collection('purchase_requests').createIndex({ purchaseRequestId: 1 }, { unique: true });
    await this.seedMongoCollection('purchase_requests', seedRequests, 'purchaseRequestId');
    const maximum = seedRequests.reduce((highest, request) => {
      const numeric = Number(request.purchaseRequestId.replace(/\D/g, ''));
      return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
    }, 0);
    await this.collection('counters').updateOne(
      { counterId: 'purchase_requests' },
      { $max: { sequence: maximum } },
      { upsert: true },
    );
    const requests = await this.collection('purchase_requests')
      .find({}, { projection: { _id: 0 } })
      .toArray() as unknown as PurchaseRequestRecord[];
    this.purchaseRequests.clear();
    for (const request of requests) this.purchaseRequests.set(request.purchaseRequestId, clone(request));
    return this.listPurchaseRequests();
  }

  async nextPurchaseRequestId(localMaximum: number): Promise<string> {
    if (!this.mongoDatabase) return `PR${String(localMaximum + 1).padStart(3, '0')}`;
    const counter = await this.collection('counters').findOneAndUpdate(
      { counterId: 'purchase_requests' },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    return `PR${String(Number(counter?.sequence ?? 1)).padStart(3, '0')}`;
  }

  async insertPurchaseRequest(request: PurchaseRequestRecord): Promise<void> {
    await this.insertDurably('purchase_requests', request);
    this.purchaseRequests.set(request.purchaseRequestId, clone(request));
  }

  listPurchaseRequests(): PurchaseRequestRecord[] {
    return [...this.purchaseRequests.values()].map(clone);
  }

  findPurchaseRequest(purchaseRequestId: string): PurchaseRequestRecord | undefined {
    const request = this.purchaseRequests.get(purchaseRequestId);
    return request ? clone(request) : undefined;
  }

  async updatePurchaseRequestDecision(
    purchaseRequestId: string,
    decision: Pick<PurchaseRequestRecord, 'approvalStatus' | 'purchaseStatus' | 'approvedBy'>,
  ): Promise<PurchaseRequestRecord> {
    const current = this.purchaseRequests.get(purchaseRequestId);
    if (!current) throw new Error(`Unknown purchase request: ${purchaseRequestId}`);
    const updated: PurchaseRequestRecord = { ...current, ...decision };
    if (this.mongoDatabase) {
      const result = await this.collection('purchase_requests').updateOne(
        { purchaseRequestId },
        { $set: decision as unknown as Document },
      );
      if (result.matchedCount !== 1) throw new Error(`Purchase request not found in MongoDB: ${purchaseRequestId}`);
    }
    this.purchaseRequests.set(purchaseRequestId, clone(updated));
    return clone(updated);
  }

  async initializeProduction(
    seedOrders: ProductionOrder[],
    seedSchedules: ProductionSchedule[],
  ): Promise<{ orders: ProductionOrder[]; schedules: ProductionSchedule[]; plans: ProductionPlan[] }> {
    if (!this.mongoDatabase) return { orders: seedOrders, schedules: seedSchedules, plans: [] };
    await Promise.all([
      this.collection('production_orders').createIndex({ orderId: 1 }, { unique: true }),
      this.collection('production_schedule').createIndex({ machineId: 1, productionDate: 1 }, { unique: true }),
      this.collection('production_plans').createIndex({ planId: 1 }, { unique: true }),
    ]);
    await this.seedMongoCollection('production_orders', seedOrders, 'orderId');
    await this.seedMongoCollection('production_schedule', seedSchedules, ['machineId', 'productionDate']);
    const [orders, schedules, plans] = await Promise.all([
      this.collection('production_orders').find({}, { projection: { _id: 0 } }).toArray(),
      this.collection('production_schedule').find({}, { projection: { _id: 0 } }).toArray(),
      this.collection('production_plans').find({}, { projection: { _id: 0 } }).toArray(),
    ]);
    return {
      orders: orders as unknown as ProductionOrder[],
      schedules: schedules as unknown as ProductionSchedule[],
      plans: plans as unknown as ProductionPlan[],
    };
  }

  async insertProductionPlan(plan: ProductionPlan): Promise<void> {
    await this.insertDurably('production_plans', plan);
  }

  async initializeFactoryConfiguration(defaults: FactoryConfiguration): Promise<FactoryConfiguration> {
    if (!this.mongoDatabase) {
      this.factoryConfiguration = defaults;
      return { ...defaults };
    }
    await this.collection('factory_config').createIndex({ configId: 1 }, { unique: true });
    await this.collection('factory_config').updateOne(
      { configId: defaults.configId },
      { $setOnInsert: defaults as unknown as Document },
      { upsert: true },
    );
    const config = await this.collection('factory_config').findOne(
      { configId: defaults.configId },
      { projection: { _id: 0 } },
    ) as unknown as FactoryConfiguration;
    this.factoryConfiguration = config;
    return { ...config };
  }

  async initializeManagerState(): Promise<{
    workflows: ManagerWorkflow[];
    approvals: ApprovalRequest[];
    audits: AuditLog[];
  }> {
    if (this.mongoDatabase) {
      await Promise.all([
        this.collection('manager_workflows').createIndex({ workflowId: 1 }, { unique: true }),
        this.collection('manager_workflows').createIndex({ ticketId: 1 }, { unique: true }),
        this.collection('approvals').createIndex({ approvalId: 1 }, { unique: true }),
        this.collection('approvals').createIndex({ requestKey: 1 }, { unique: true }),
        this.collection('audit_logs').createIndex({ auditId: 1 }, { unique: true }),
        this.collection('audit_logs').createIndex({ workflowId: 1, timestamp: 1 }),
      ]);
      const [workflows, approvals, audits] = await Promise.all([
        this.collection('manager_workflows').find({}, { projection: { _id: 0 } }).toArray(),
        this.collection('approvals').find({}, { projection: { _id: 0 } }).toArray(),
        this.collection('audit_logs').find({}, { projection: { _id: 0 } }).sort({ timestamp: 1 }).toArray(),
      ]);
      this.managerWorkflows.clear();
      for (const workflow of workflows as unknown as ManagerWorkflow[]) this.managerWorkflows.set(workflow.workflowId, workflow);
      this.approvalRequests.clear();
      for (const approval of approvals as unknown as ApprovalRequest[]) this.approvalRequests.set(approval.approvalId, approval);
      this.auditLogs.splice(0, this.auditLogs.length, ...(audits as unknown as AuditLog[]));
    }
    return {
      workflows: [...this.managerWorkflows.values()].map(clone),
      approvals: [...this.approvalRequests.values()].map(clone),
      audits: this.auditLogs.map(clone),
    };
  }

  async saveManagerWorkflow(workflow: ManagerWorkflow): Promise<ManagerWorkflow> {
    if (this.mongoDatabase) {
      await this.collection('manager_workflows').updateOne(
        { workflowId: workflow.workflowId },
        { $set: workflow as unknown as Document },
        { upsert: true },
      );
    }
    this.managerWorkflows.set(workflow.workflowId, clone(workflow));
    return clone(workflow);
  }

  async createApprovalRequest(request: ApprovalRequest): Promise<{ request: ApprovalRequest; created: boolean }> {
    const existingLocal = [...this.approvalRequests.values()].find((approval) => approval.requestKey === request.requestKey);
    if (existingLocal) return { request: clone(existingLocal), created: false };
    if (this.mongoDatabase) {
      const result = await this.collection('approvals').findOneAndUpdate(
        { requestKey: request.requestKey },
        { $setOnInsert: request as unknown as Document },
        { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
      );
      const saved = result as unknown as ApprovalRequest;
      this.approvalRequests.set(saved.approvalId, clone(saved));
      return { request: clone(saved), created: saved.approvalId === request.approvalId };
    }
    this.approvalRequests.set(request.approvalId, clone(request));
    return { request: clone(request), created: true };
  }

  async updateApprovalRequest(request: ApprovalRequest): Promise<ApprovalRequest> {
    if (this.mongoDatabase) {
      await this.collection('approvals').updateOne(
        { approvalId: request.approvalId },
        { $set: request as unknown as Document },
      );
    }
    this.approvalRequests.set(request.approvalId, clone(request));
    return clone(request);
  }

  findApprovalRequest(approvalId: string): ApprovalRequest | undefined {
    const request = this.approvalRequests.get(approvalId);
    return request ? clone(request) : undefined;
  }

  listApprovalRequests(status?: string): ApprovalRequest[] {
    return [...this.approvalRequests.values()]
      .filter((request) => !status || request.status === status)
      .map(clone);
  }

  listManagerWorkflows(): ManagerWorkflow[] {
    return [...this.managerWorkflows.values()].map(clone);
  }

  async saveAuditLog(log: AuditLog): Promise<AuditLog> {
    await this.insertDurably('audit_logs', log);
    this.auditLogs.push(clone(log));
    return clone(log);
  }

  listAuditLogs(workflowId?: string): AuditLog[] {
    return this.auditLogs.filter((log) => !workflowId || log.workflowId === workflowId).map(clone);
  }

  async initializeNotifications(): Promise<NotificationRecord[]> {
    if (this.mongoDatabase) {
      await Promise.all([
        this.collection('notifications').createIndex({ notificationId: 1 }, { unique: true }),
        this.collection('notifications').createIndex({ duplicateKey: 1 }, { unique: true }),
        this.collection('notifications').createIndex({ sequence: 1 }, { unique: true }),
        this.collection('notification_audit_logs').createIndex({ auditId: 1 }, { unique: true }),
      ]);
      const [records, audits] = await Promise.all([
        this.collection('notifications').find({}, { projection: { _id: 0 } }).sort({ sequence: 1 }).toArray(),
        this.collection('notification_audit_logs').find({}, { projection: { _id: 0 } }).sort({ timestamp: 1 }).toArray(),
      ]);
      this.notifications.clear();
      for (const record of records as unknown as NotificationRecord[]) this.notifications.set(record.notificationId, clone(record));
      this.notificationAudits.splice(0, this.notificationAudits.length, ...(audits as unknown as NotificationAuditLog[]));
    }
    this.notificationSequence = Math.max(0, ...[...this.notifications.values()].map((record) => record.sequence));
    return this.listNotifications();
  }

  async nextNotificationSequence(): Promise<number> {
    if (this.mongoDatabase) {
      const counter = await this.collection('counters').findOneAndUpdate(
        { counterId: 'notifications' }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: 'after' },
      );
      this.notificationSequence = Number(counter?.sequence ?? 1);
      return this.notificationSequence;
    }
    return ++this.notificationSequence;
  }

  async createNotification(record: NotificationRecord): Promise<{ notification: NotificationRecord; created: boolean }> {
    const local = [...this.notifications.values()].find((candidate) => candidate.duplicateKey === record.duplicateKey);
    if (local) return { notification: clone(local), created: false };
    if (this.mongoDatabase) {
      const saved = await this.collection('notifications').findOneAndUpdate(
        { duplicateKey: record.duplicateKey }, { $setOnInsert: record as unknown as Document },
        { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
      ) as unknown as NotificationRecord;
      this.notifications.set(saved.notificationId, clone(saved));
      return { notification: clone(saved), created: saved.notificationId === record.notificationId };
    }
    this.notifications.set(record.notificationId, clone(record));
    return { notification: clone(record), created: true };
  }

  async updateNotification(record: NotificationRecord): Promise<NotificationRecord> {
    if (this.mongoDatabase) await this.collection('notifications').updateOne({ notificationId: record.notificationId }, { $set: record as unknown as Document });
    this.notifications.set(record.notificationId, clone(record));
    return clone(record);
  }

  findNotification(notificationId: string): NotificationRecord | undefined {
    const record = this.notifications.get(notificationId);
    return record ? clone(record) : undefined;
  }

  listNotifications(options: { workflowId?: string; status?: string; afterSequence?: number } = {}): NotificationRecord[] {
    return [...this.notifications.values()]
      .filter((record) => !options.workflowId || record.workflowId === options.workflowId)
      .filter((record) => !options.status || record.status === options.status)
      .filter((record) => record.sequence > (options.afterSequence ?? 0))
      .sort((left, right) => left.sequence - right.sequence).map(clone);
  }

  async saveNotificationAudit(log: NotificationAuditLog): Promise<NotificationAuditLog> {
    await this.insertDurably('notification_audit_logs', log);
    this.notificationAudits.push(clone(log));
    return clone(log);
  }

  listNotificationAudits(workflowId?: string): NotificationAuditLog[] {
    return this.notificationAudits.filter((log) => !workflowId || log.workflowId === workflowId).map(clone);
  }

  async initializeMonitoring(): Promise<WorkflowTrackingRecord[]> {
    if (this.mongoDatabase) {
      await Promise.all([
        this.collection('workflow_tracking').createIndex({ workflowId: 1 }, { unique: true }),
        this.collection('agent_events').createIndex({ duplicateKey: 1 }, { unique: true, sparse: true }),
        this.collection('alerts').createIndex({ alertId: 1 }, { unique: true }),
      ]);
      await this.collection('monitoring_live_events').createIndex({ sequence: 1 }, { unique: true });
      const [workflows, events, alerts, liveEvents] = await Promise.all([
        this.collection('workflow_tracking').find({}, { projection: { _id: 0 } }).toArray(),
        this.collection('agent_events').find({ kind: 'workflow_stage' }, { projection: { _id: 0 } }).toArray(),
        this.collection('alerts').find({ kind: 'workflow_stall' }, { projection: { _id: 0 } }).toArray(),
        this.collection('monitoring_live_events').find({}, { projection: { _id: 0 } }).sort({ sequence: 1 }).toArray(),
      ]);
      this.monitoringWorkflows.clear(); for (const item of workflows as unknown as WorkflowTrackingRecord[]) this.monitoringWorkflows.set(item.workflowId, clone(item));
      this.monitoringEvents.clear(); for (const item of events as unknown as MonitoringAgentEvent[]) this.monitoringEvents.set(item.eventId, clone(item));
      this.monitoringAlerts.clear(); for (const item of alerts as unknown as MonitoringAlert[]) this.monitoringAlerts.set(item.alertId, clone(item));
      this.monitoringLiveEvents.clear(); for (const item of liveEvents as unknown as LiveMonitoringEvent[]) this.monitoringLiveEvents.set(item.sequence, clone(item));
    }
    this.monitoringSequence = Math.max(0, ...this.monitoringLiveEvents.keys());
    if (this.mongoDatabase) await this.collection('counters').updateOne({ counterId: 'monitoring' }, { $max: { sequence: this.monitoringSequence } }, { upsert: true });
    return this.listMonitoringWorkflows();
  }
  async nextMonitoringSequence(): Promise<number> {
    if (this.mongoDatabase) {
      const counter = await this.collection('counters').findOneAndUpdate({ counterId: 'monitoring' }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: 'after' });
      return this.monitoringSequence = Number(counter?.sequence ?? 1);
    }
    return ++this.monitoringSequence;
  }
  async saveMonitoringWorkflow(record: WorkflowTrackingRecord): Promise<WorkflowTrackingRecord> {
    if (this.mongoDatabase) await this.collection('workflow_tracking').updateOne({ workflowId: record.workflowId }, { $set: record as unknown as Document }, { upsert: true });
    this.monitoringWorkflows.set(record.workflowId, clone(record)); return clone(record);
  }
  findMonitoringWorkflow(workflowId: string): WorkflowTrackingRecord | undefined { const value = this.monitoringWorkflows.get(workflowId); return value ? clone(value) : undefined; }
  listMonitoringWorkflows(): WorkflowTrackingRecord[] { return [...this.monitoringWorkflows.values()].map(clone); }
  async createMonitoringEvent(event: MonitoringAgentEvent): Promise<boolean> {
    if ([...this.monitoringEvents.values()].some((item) => item.duplicateKey === event.duplicateKey)) return false;
    if (this.mongoDatabase) {
      const existing = await this.collection('agent_events').findOne({ duplicateKey: event.duplicateKey }); if (existing) return false;
      await this.collection('agent_events').insertOne(event as unknown as Document);
    }
    this.monitoringEvents.set(event.eventId, clone(event)); return true;
  }
  listMonitoringEvents(workflowId?: string): MonitoringAgentEvent[] { return [...this.monitoringEvents.values()].filter((item) => !workflowId || item.workflowId === workflowId).map(clone); }
  async saveMonitoringAlert(alert: MonitoringAlert): Promise<MonitoringAlert> {
    if (this.mongoDatabase) await this.collection('alerts').updateOne({ alertId: alert.alertId }, { $set: alert as unknown as Document }, { upsert: true });
    this.monitoringAlerts.set(alert.alertId, clone(alert)); return clone(alert);
  }
  listMonitoringAlerts(workflowId?: string): MonitoringAlert[] { return [...this.monitoringAlerts.values()].filter((item) => !workflowId || item.workflowId === workflowId).map(clone); }
  async saveMonitoringLiveEvent(event: LiveMonitoringEvent): Promise<LiveMonitoringEvent> {
    if (this.mongoDatabase) await this.collection('monitoring_live_events').updateOne({ sequence: event.sequence }, { $setOnInsert: event as unknown as Document }, { upsert: true });
    this.monitoringLiveEvents.set(event.sequence, clone(event)); return clone(event);
  }
  listMonitoringLiveEvents(afterSequence = 0): LiveMonitoringEvent[] {
    return [...this.monitoringLiveEvents.values()].filter((event) => event.sequence > afterSequence).sort((left, right) => left.sequence - right.sequence).map(clone);
  }

  findManagerWorkflow(workflowId: string): ManagerWorkflow | undefined {
    const workflow = this.managerWorkflows.get(workflowId);
    return workflow ? clone(workflow) : undefined;
  }

  async close(): Promise<void> {
    await this.mongoClient?.close();
    this.mongoClient = undefined;
    this.mongoDatabase = undefined;
  }

  getHealthyBaseline(machineId: string): Record<(typeof SENSOR_KEYS)[number], { mean: number; stdDev: number }> | undefined {
    const healthyRows = this.sensorData
      .filter((reading) => reading.machineId === machineId && !reading.maintenanceRequired)
      .slice(0, 200);

    if (healthyRows.length < 5) {
      return undefined;
    }

    return Object.fromEntries(
      SENSOR_KEYS.map((key) => {
        const values = healthyRows.map((row) => row[key]).filter(Number.isFinite);
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
        return [key, { mean, stdDev: Math.max(Math.sqrt(variance), 0.0001) }];
      }),
    ) as Record<(typeof SENSOR_KEYS)[number], { mean: number; stdDev: number }>;
  }

  private loadMachines(): void {
    const filePath = join(this.dataDir, 'machines_v2_FIXED.csv');
    if (!existsSync(filePath)) {
      throw new Error(`Machine registry not found at ${filePath}`);
    }

    for (const row of parseCsv(readFileSync(filePath, 'utf8'))) {
      const machine = toMachineRecord(row);
      this.machines.set(machine.machineId, machine);
    }
  }

  private loadSensorData(): void {
    const candidates = ['sensor_data_realistic_FIXED.csv', 'sensor_data_realistic.csv'];
    const filePath = candidates.map((name) => join(this.dataDir, name)).find(existsSync);
    if (!filePath || looksLikeZip(filePath)) {
      return;
    }

    for (const row of parseCsv(readFileSync(filePath, 'utf8'))) {
      const reading = toSensorReading(row);
      if (reading.machineId) {
        this.sensorData.push(reading);
      }
    }
  }

  private loadMaintenanceLogs(): void {
    const filePath = join(this.dataDir, 'maintenance_logs_FIXED.csv');
    if (!existsSync(filePath)) {
      return;
    }

    for (const row of parseCsv(readFileSync(filePath, 'utf8'))) {
      const log = toMaintenanceLog(row);
      if (log.maintenanceId) {
        this.maintenanceLogs.push(log);
      }
    }
  }

  private async connectMongo(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return;
    }

    this.mongoClient = new MongoClient(uri);
    await this.mongoClient.connect();
    this.mongoDatabase = this.mongoClient.db(process.env.MONGODB_DATABASE ?? 'factorybrain');

    await Promise.all([
      this.collection('machines').createIndex({ machineId: 1 }, { unique: true }),
      this.collection('sensor_data').createIndex({ machineId: 1, timestamp: 1 }, { unique: true }),
      this.collection('alerts').createIndex({ alertId: 1 }, { unique: true }),
      this.collection('maintenance_logs').createIndex({ maintenanceId: 1 }, { unique: true }),
      this.collection('maintenance_tickets').createIndex({ ticketId: 1 }, { unique: true }),
      this.collection('spare_part_requests').createIndex({ requestId: 1 }, { unique: true }),
      this.collection('agent_events').createIndex({ eventId: 1 }, { unique: true }),
      this.collection('agent_events').createIndex({ timestamp: -1 }),
    ]);

    await this.seedMongoCollection('machines', [...this.machines.values()], 'machineId');
    await this.seedMongoCollection('maintenance_logs', this.maintenanceLogs, 'maintenanceId');
    await this.seedMongoCollection('sensor_data', this.sensorData, ['machineId', 'timestamp']);
    await this.hydrateRuntimeCollections();
  }

  private collection(name: string): Collection<Document> {
    if (!this.mongoDatabase) {
      throw new Error('MongoDB is not configured');
    }
    return this.mongoDatabase.collection(name);
  }

  private async insertDurably(collectionName: string, value: object): Promise<void> {
    if (this.mongoDatabase) {
      await this.collection(collectionName).insertOne(value as Document);
    }
  }

  private async seedMongoCollection(collectionName: string, values: object[], key: string | string[]): Promise<void> {
    if (values.length === 0) return;
    const keys = Array.isArray(key) ? key : [key];
    await this.collection(collectionName).bulkWrite(
      values.map((value) => ({
        updateOne: {
          filter: Object.fromEntries(keys.map((field) => [field, (value as Record<string, unknown>)[field]])),
          update: { $setOnInsert: value as Document },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  private async hydrateRuntimeCollections(): Promise<void> {
    const [machines, sensorData, maintenanceLogs, alerts, tickets, requests, events] = await Promise.all([
      this.collection('machines').find({}, { projection: { _id: 0 } }).toArray(),
      this.collection('sensor_data').find({}, { projection: { _id: 0 } }).sort({ timestamp: 1 }).toArray(),
      this.collection('maintenance_logs').find({}, { projection: { _id: 0 } }).toArray(),
      this.collection('alerts').find({ kind: 'machine_failure' }, { projection: { _id: 0 } }).toArray(),
      this.collection('maintenance_tickets').find({}, { projection: { _id: 0 } }).toArray(),
      this.collection('spare_part_requests').find({}, { projection: { _id: 0 } }).toArray(),
      this.collection('agent_events').find({}, { projection: { _id: 0 } }).sort({ timestamp: 1 }).toArray(),
    ]);
    this.machines.clear();
    for (const machine of machines as unknown as MachineRecord[]) {
      this.machines.set(machine.machineId, machine);
    }
    this.sensorData.splice(0, this.sensorData.length, ...(sensorData as unknown as SensorReading[]));
    this.maintenanceLogs.splice(0, this.maintenanceLogs.length, ...(maintenanceLogs as unknown as MaintenanceLog[]));
    this.alerts.splice(0, this.alerts.length, ...(alerts as unknown as MachineAlert[]));
    this.maintenanceTickets.splice(0, this.maintenanceTickets.length, ...(tickets as unknown as MaintenanceTicket[]));
    this.sparePartRequests.splice(0, this.sparePartRequests.length, ...(requests as unknown as SparePartRequest[]));
    this.agentEvents.splice(0, this.agentEvents.length, ...(events as unknown as AgentEventRecord[]));
  }

  private isTechnicianBusy(technicianId: string, activeStatuses: Set<string>): boolean {
    return this.maintenanceLogs.some(
      (log) => log.assignedTechnician === technicianId && activeStatuses.has(log.maintenanceStatus),
    );
  }
}

function toMachineRecord(row: Record<string, string>): MachineRecord {
  return {
    machineId: row.machineId,
    machineName: row.machineName,
    machineType: row.machineType,
    productionLine: row.productionLine,
    location: row.location,
    installDate: row.installDate,
    operatingHours: toNumber(row.operatingHours),
    healthScore: toNumber(row.healthScore),
    status: row.status,
    currentState: row.currentState,
    simulationMode: row.simulationMode,
    riskLevel: normalizeRisk(row.riskLevel),
    sensorProfile: row.sensorProfile,
    failureProfile: row.failureProfile,
    primaryPart: row.primaryPart,
    alternateMachine: row.alternateMachine,
    currentJob: row.currentJob,
    operatorId: row.operatorId,
    maintenanceTeam: row.maintenanceTeam,
    lastMaintenance: row.lastMaintenance,
    nextMaintenance: row.nextMaintenance,
    criticality: normalizeRisk(row.criticality),
    factory: row.factory,
  };
}

function toSensorReading(row: Record<string, string>): SensorReading {
  return {
    machineId: row.machineId ?? row.machine_id ?? row.id ?? '',
    timestamp: row.timestamp ?? row.time ?? new Date().toISOString(),
    airTemperature: toNumber(row.airTemperature ?? row.air_temperature ?? row.airTemp),
    processTemperature: toNumber(row.processTemperature ?? row.process_temperature ?? row.processTemp),
    rpm: toNumber(row.rpm ?? row.rotationalSpeed),
    torque: toNumber(row.torque),
    vibration: toNumber(row.vibration),
    pressure: toNumber(row.pressure),
    humidity: toNumber(row.humidity),
    voltage: toNumber(row.voltage),
    current: toNumber(row.current),
    powerConsumption: toNumber(row.powerConsumption ?? row.power_consumption),
    toolWear: toNumber(row.toolWear ?? row.tool_wear),
    operatingHours: toNumber(row.operatingHours ?? row.operating_hours),
    maintenanceRequired: parseBoolean(row.maintenanceRequired ?? row.maintenance_required),
  };
}

function toMaintenanceLog(row: Record<string, string>): MaintenanceLog {
  return {
    maintenanceId: row.maintenanceId,
    machineId: row.machineId,
    telemetryId: row.telemetryId,
    maintenanceDate: row.maintenanceDate,
    issueDetected: row.issueDetected,
    issueSeverity: normalizeRisk(row.issueSeverity),
    maintenanceType: row.maintenanceType,
    maintenanceStatus: row.maintenanceStatus,
    assignedTeam: row.assignedTeam,
    assignedTechnician: row.assignedTechnician,
    requiredPart: row.requiredPart,
    inventoryStatus: row.inventoryStatus,
    estimatedRepairHours: toNumber(row.estimatedRepairHours),
    maintenanceCostGbp: toNumber(row.maintenanceCost_GBP),
    productionImpact: row.productionImpact,
    rootCause: row.rootCause,
    nextMaintenanceDate: row.nextMaintenanceDate,
    remarks: row.remarks,
    createdBy: row.createdBy,
  };
}

function parseCsv(source: string): Record<string, string>[] {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine, ...dataLines] = lines;
  if (!headerLine) {
    return [];
  }

  const headers = splitCsvLine(headerLine);
  return dataLines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function normalizeRisk(value: string | undefined): RiskLevel {
  if (value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low') {
    return value;
  }
  return 'Medium';
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}

function toNumber(value: string | number | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function looksLikeZip(filePath: string): boolean {
  const signature = readFileSync(filePath).subarray(0, 2).toString('utf8');
  return signature === 'PK';
}

function inventoryStatusFor(item: InventoryItem): InventoryItem['inventoryStatus'] {
  if (item.availableQuantity <= 0) return 'Out of Stock';
  if (item.availableQuantity <= item.reorderLevel) return 'Low Stock';
  return item.reservedQuantity > 0 ? 'Reserved' : 'Available';
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function getProjectRootFromSource(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}
