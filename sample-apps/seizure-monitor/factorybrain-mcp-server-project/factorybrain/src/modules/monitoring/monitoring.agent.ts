import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { AgentEvent, QueueService } from '../../services/queue.service.js';
import { NotificationRealtimeService } from '../notification/notification-realtime.service.js';
import { ManagerWorkflowState } from '../manager/manager.types.js';
import { DurationRulesService } from './duration-rules.service.js';
import { externalStatusSchema, trackingInputSchema } from './monitoring.schemas.js';
import { MockStatusService } from './mock-status.service.js';
import { ApprovedNotifiedPlan, DeferredStatusEvent, ExternalStatusUpdate, MonitoringAgentEvent, MonitoringAlert, MonitoringAlertStatus, MonitoringWorkflowStatus, WorkflowStage, WorkflowTrackingRecord } from './monitoring.types.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';

const ORDER = [WorkflowStage.Approved, WorkflowStage.Notified, WorkflowStage.SupplierAccepted, WorkflowStage.PartShipped, WorkflowStage.PartDelivered, WorkflowStage.Maintenance, WorkflowStage.Validation, WorkflowStage.Running, WorkflowStage.Completed];

@Injectable({ deps: [DatabaseService, QueueService, DurationRulesService, MockStatusService, NotificationRealtimeService] })
export class MonitoringAgent implements OnModuleInit {
  private timer?: NodeJS.Timeout;
  constructor(private readonly database: DatabaseService, private readonly queue: QueueService, private readonly durations: DurationRulesService, private readonly sources: MockStatusService, private readonly realtime: NotificationRealtimeService) {}

  async onModuleInit(): Promise<void> {
    await this.database.initializeMonitoring();
    this.queue.registerHandler('monitoring', ORCHESTRATOR_JOBS.START_MONITORING, (event) => this.receivePlan(event));
    this.queue.registerHandler('monitoring', 'status_update', async (event) => { await this.handleStatus(event.payload); });
    const interval = Number(process.env.FACTORYBRAIN_MONITOR_POLL_INTERVAL_MS ?? 0);
    if (interval > 0) { this.timer = setInterval(() => { void this.poll(); }, interval); this.timer.unref(); }
  }

  async trackWorkflow(input: ApprovedNotifiedPlan): Promise<WorkflowTrackingRecord> {
    const plan = trackingInputSchema.parse(input) as unknown as ApprovedNotifiedPlan;
    const existing = this.database.findMonitoringWorkflow(plan.workflowId); if (existing) return existing;
    const now = plan.notifiedAt;
    const record: WorkflowTrackingRecord = {
      workflowId: plan.workflowId, ticketId: plan.ticketId, machineId: plan.machineId, approvalId: plan.approval.approvalId,
      purchaseRequired: Boolean(plan.purchase), currentStage: WorkflowStage.Approved, status: MonitoringWorkflowStatus.Active,
      stageStartedAt: plan.approvedAt, stageDeadline: this.durations.deadline(WorkflowStage.Approved, plan.approvedAt),
      history: [], deferredEvents: [], createdAt: now, updatedAt: now,
    };
    await this.changeStage(record, WorkflowStage.Approved, `monitor-approved-${record.workflowId}`, 'manager', plan.approvedAt, {});
    await this.changeStage(record, WorkflowStage.Notified, `monitor-notified-${record.workflowId}`, 'notification', now, {});
    return record;
  }

  normalizeExternalStatus(input: unknown): ExternalStatusUpdate & { target: WorkflowStage } {
    const update = externalStatusSchema.parse(input) as ExternalStatusUpdate;
    const value = update.status.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
    let target: WorkflowStage | undefined;
    if (['failed', 'cancelled', 'rejected', 'repair failed'].includes(value)) target = WorkflowStage.Failed;
    else if (update.source === 'procurement' && ['accepted', 'supplier accepted', 'order accepted', 'ordered', 'purchase ordered'].includes(value)) target = WorkflowStage.SupplierAccepted;
    else if (update.source === 'procurement' && ['shipped', 'part shipped', 'dispatched', 'in transit'].includes(value)) target = WorkflowStage.PartShipped;
    else if (update.source === 'procurement' && ['delivered', 'part delivered', 'received'].includes(value)) target = WorkflowStage.PartDelivered;
    else if (update.source === 'maintenance' && ['started', 'in progress', 'repair started'].includes(value)) target = WorkflowStage.Maintenance;
    else if (update.source === 'maintenance' && ['completed', 'repair completed'].includes(value)) target = WorkflowStage.Validation;
    else if (update.source === 'machine' && ['validating', 'testing'].includes(value)) target = WorkflowStage.Validation;
    else if (update.source === 'machine' && ['running', 'operational', 'returned to service'].includes(value)) target = WorkflowStage.Running;
    if (!target) throw new Error(`Unsupported ${update.source} status: ${update.status}`);
    return { ...update, target };
  }

  async handleStatus(input: unknown): Promise<WorkflowTrackingRecord> {
    const update = this.normalizeExternalStatus(input); const record = this.requireWorkflow(update.workflowId);
    if (this.database.listMonitoringEvents(record.workflowId).some((event) => event.duplicateKey === update.eventId) || record.deferredEvents.some((event) => event.eventId === update.eventId)) return record;
    if (update.target === WorkflowStage.Failed) { await this.changeStage(record, WorkflowStage.Failed, update.eventId, update.source, update.occurredAt, update.details ?? {}); return record; }
    const currentRank = ORDER.indexOf(record.currentStage); const targetRank = ORDER.indexOf(update.target); const next = this.nextStage(record);
    if (targetRank <= currentRank) return record;
    if (update.target !== next) { record.deferredEvents.push(stripTarget(update)); record.updatedAt = new Date().toISOString(); await this.database.saveMonitoringWorkflow(record); return record; }
    await this.changeStage(record, update.target, update.eventId, update.source, update.occurredAt, update.details ?? {});
    await this.drainDeferred(record);
    if (record.currentStage === WorkflowStage.Running) await this.changeStage(record, WorkflowStage.Completed, `${update.eventId}:closed`, 'monitoring', update.occurredAt, { reason: 'Machine returned to service' });
    return this.requireWorkflow(record.workflowId);
  }

  async poll(now = new Date()): Promise<void> {
    for (const record of this.database.listMonitoringWorkflows().filter((item) => item.status !== MonitoringWorkflowStatus.Completed && item.status !== MonitoringWorkflowStatus.Failed)) {
      for (const update of this.sources.poll(record.workflowId)) await this.handleStatus(update);
      await this.detectStall(record.workflowId, now);
    }
  }

  async detectStall(workflowId: string, now = new Date()): Promise<MonitoringAlert | undefined> {
    const record = this.requireWorkflow(workflowId); if (record.status === MonitoringWorkflowStatus.Completed || record.status === MonitoringWorkflowStatus.Failed || now.getTime() <= Date.parse(record.stageDeadline)) return undefined;
    const existing = this.database.listMonitoringAlerts(workflowId).find((alert) => alert.stage === record.currentStage && alert.status === MonitoringAlertStatus.Open); if (existing) return existing;
    record.status = MonitoringWorkflowStatus.Delayed; record.updatedAt = now.toISOString(); await this.database.saveMonitoringWorkflow(record);
    const alert: MonitoringAlert = { kind: 'workflow_stall', alertId: `STALL-${workflowId}-${record.currentStage.replace(/\W/g, '')}`, workflowId, machineId: record.machineId, stage: record.currentStage, severity: now.getTime() - Date.parse(record.stageDeadline) > this.durations.durationMs(record.currentStage) ? 'Critical' : 'High', message: `${workflowId} is stalled in ${record.currentStage}.`, status: MonitoringAlertStatus.Open, createdAt: now.toISOString() };
    await this.database.saveMonitoringAlert(alert); await this.realtime.publishMonitoring(record, alert);
    await this.reportManagerState(record.workflowId, ManagerWorkflowState.Delayed, { stage: record.currentStage, alertId: alert.alertId });
    return alert;
  }

  private async receivePlan(event: AgentEvent<unknown>): Promise<void> { await this.trackWorkflow(event.payload as ApprovedNotifiedPlan); }
  private async changeStage(record: WorkflowTrackingRecord, target: WorkflowStage, eventId: string, source: string, occurredAt: string, details: Record<string, unknown>): Promise<void> {
    const fromStage = record.currentStage; const event: MonitoringAgentEvent = { kind: 'workflow_stage', eventId: `MON-${eventId}`, duplicateKey: eventId, workflowId: record.workflowId, machineId: record.machineId, ...(record.history.length ? { fromStage } : {}), toStage: target, source, occurredAt, recordedAt: new Date().toISOString(), details };
    if (!await this.database.createMonitoringEvent(event)) return;
    record.currentStage = target; record.stageStartedAt = occurredAt; record.stageDeadline = this.durations.deadline(target, occurredAt); record.updatedAt = new Date().toISOString();
    record.status = target === WorkflowStage.Completed ? MonitoringWorkflowStatus.Completed : target === WorkflowStage.Failed ? MonitoringWorkflowStatus.Failed : MonitoringWorkflowStatus.Active;
    if (target === WorkflowStage.Completed) record.completedAt = occurredAt;
    record.history.push({ stage: target, enteredAt: occurredAt, deadline: record.stageDeadline, sourceEventId: event.eventId });
    for (const alert of this.database.listMonitoringAlerts(record.workflowId).filter((item) => item.status === MonitoringAlertStatus.Open)) { alert.status = MonitoringAlertStatus.Resolved; alert.resolvedAt = record.updatedAt; alert.resolution = `Advanced to ${target}`; await this.database.saveMonitoringAlert(alert); }
    await this.database.saveMonitoringWorkflow(record); await this.realtime.publishMonitoring(record);
    const managerState = target === WorkflowStage.Completed ? ManagerWorkflowState.Completed
      : target === WorkflowStage.Failed ? ManagerWorkflowState.Failed
        : ManagerWorkflowState.MonitoringActive;
    await this.reportManagerState(record.workflowId, managerState, { stage: target });
  }
  private async reportManagerState(workflowId: string, state: ManagerWorkflowState, details: Record<string, unknown>): Promise<void> {
    await this.queue.publish({ from: 'monitoring', to: 'manager', type: 'workflow_status', payload: { workflowId, state, details } },
      { idempotencyKey: `manager-state-${workflowId}-${state}-${String(details.stage ?? details.alertId ?? 'workflow')}` });
  }
  private async drainDeferred(record: WorkflowTrackingRecord): Promise<void> {
    let found = true; while (found) { const next = this.nextStage(record); const index = record.deferredEvents.findIndex((item) => this.normalizeExternalStatus(item).target === next); if (index < 0) { found = false; continue; } const [item] = record.deferredEvents.splice(index, 1); const normalized = this.normalizeExternalStatus(item); await this.changeStage(record, normalized.target, item.eventId, item.source, item.occurredAt, item.details ?? {}); }
  }
  private nextStage(record: WorkflowTrackingRecord): WorkflowStage | undefined { if (record.currentStage === WorkflowStage.Notified && !record.purchaseRequired) return WorkflowStage.Maintenance; return ORDER[ORDER.indexOf(record.currentStage) + 1]; }
  private requireWorkflow(id: string): WorkflowTrackingRecord { const value = this.database.findMonitoringWorkflow(id); if (!value) throw new Error(`Unknown monitored workflow: ${id}`); return value; }
}
function stripTarget(update: ExternalStatusUpdate & { target: WorkflowStage }): DeferredStatusEvent { const { target: _target, ...event } = update; return event; }
