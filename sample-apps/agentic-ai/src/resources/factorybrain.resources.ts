import { ExecutionContext, Injectable, ResourceDecorator as Resource } from '@nitrostack/core';
import { DatabaseService } from '../services/database.service.js';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

@Injectable({ deps: [DatabaseService] })
export class FactoryBrainResources {
  private readonly dataDir = resolve(process.env.FACTORYBRAIN_DATA_DIR ?? join(process.cwd(), 'data'));
  constructor(private readonly database: DatabaseService) {}
  @Resource({ uri: 'machine://registry', name: 'Machine Registry', description: 'Factory machine configuration and current registry state.', mimeType: 'application/json' })
  machines(uri: string, ctx: ExecutionContext) { return this.json(uri, this.database.listMachines(), ctx); }
  @Resource({ uri: 'inventory://parts', name: 'Inventory Parts', description: 'Spare-part inventory seed and demo state.', mimeType: 'text/csv' })
  inventory(uri: string, ctx: ExecutionContext) { return this.csv(uri, process.env.FACTORYBRAIN_INVENTORY_CSV ?? join(this.dataDir, 'inventory_FIXED.csv'), ctx); }
  @Resource({ uri: 'supplier://suppliers', name: 'Supplier Catalog', description: 'Supplier capabilities, lead time, rating, and status.', mimeType: 'text/csv' })
  suppliers(uri: string, ctx: ExecutionContext) { return this.csv(uri, process.env.FACTORYBRAIN_SUPPLIERS_CSV ?? join(this.dataDir, 'suppliers_FIXED.csv'), ctx); }
  @Resource({ uri: 'orders://today', name: 'Production Orders', description: 'Current production orders used by disruption planning.', mimeType: 'text/csv' })
  orders(uri: string, ctx: ExecutionContext) { return this.csv(uri, process.env.FACTORYBRAIN_PRODUCTION_ORDERS_CSV ?? join(this.dataDir, 'production_orders_FIXED.csv'), ctx); }
  @Resource({ uri: 'production://schedule', name: 'Production Schedule', description: 'Machine capacity, load, supported products, and available slots.', mimeType: 'text/csv' })
  schedule(uri: string, ctx: ExecutionContext) { return this.csv(uri, process.env.FACTORYBRAIN_PRODUCTION_SCHEDULE_CSV ?? join(this.dataDir, 'production_schedule_FIXED.csv'), ctx); }
  @Resource({ uri: 'employees://technicians', name: 'Technician Directory', description: 'Technicians and maintenance-team assignments derived from maintenance history.', mimeType: 'application/json' })
  technicians(uri: string, ctx: ExecutionContext) { const technicians = [...new Map(this.database.listMaintenanceLogs().filter((log) => log.assignedTechnician).map((log) => [log.assignedTechnician, { technicianId: log.assignedTechnician, team: log.assignedTeam }])).values()]; return this.json(uri, technicians, ctx); }
  @Resource({ uri: 'maintenance://history', name: 'Maintenance History', description: 'Maintenance records and active tickets.', mimeType: 'application/json' })
  maintenance(uri: string, ctx: ExecutionContext) { return this.json(uri, { history: this.database.listMaintenanceLogs(), tickets: this.database.listMaintenanceTickets() }, ctx); }
  @Resource({ uri: 'approvals://requests', name: 'Approval Requests', description: 'Manager approval requests and outcomes.', mimeType: 'application/json' })
  approvals(uri: string, ctx: ExecutionContext) { return this.json(uri, this.database.listApprovalRequests(), ctx); }
  @Resource({ uri: 'notifications://history', name: 'Notification History', description: 'Notification recipients, channels, attempts, and delivery states.', mimeType: 'application/json' })
  notifications(uri: string, ctx: ExecutionContext) { return this.json(uri, this.database.listNotifications(), ctx); }
  @Resource({ uri: 'monitoring://workflows', name: 'Monitored Workflows', description: 'Workflow stages, deadlines, alerts, and completion state.', mimeType: 'application/json' })
  monitoring(uri: string, ctx: ExecutionContext) { return this.json(uri, { workflows: this.database.listMonitoringWorkflows(), alerts: this.database.listMonitoringAlerts() }, ctx); }
  @Resource({ uri: 'agent-events://audit', name: 'Agent Event Audit', description: 'Durable queue and workflow transition audit records.', mimeType: 'application/json' })
  events(uri: string, ctx: ExecutionContext) { return this.json(uri, { queueEvents: this.database.listAgentEvents(), stageEvents: this.database.listMonitoringEvents() }, ctx); }
  private json(uri: string, value: unknown, ctx: ExecutionContext) { ctx.logger.info(`Reading resource ${uri}`); return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(value, null, 2) }] }; }
  private csv(uri: string, path: string, ctx: ExecutionContext) { ctx.logger.info(`Reading resource ${uri}`); return { contents: [{ uri, mimeType: 'text/csv', text: readFileSync(path, 'utf8') }] }; }
}
