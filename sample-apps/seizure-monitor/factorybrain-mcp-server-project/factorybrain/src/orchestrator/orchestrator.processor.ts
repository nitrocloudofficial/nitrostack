import { Injectable, OnModuleInit } from '@nitrostack/core';
import { ApprovalStatus } from '../modules/manager/manager.types.js';
import { DatabaseService, type AgentEventRecord } from '../services/database.service.js';
import { QueueService } from '../services/queue.service.js';
import { ORCHESTRATOR_JOBS } from './orchestrator.jobs.js';
import { WorkflowStateService } from './workflow-state.service.js';
import { FactoryWorkflow, WorkflowStage, WorkflowStatus } from './types/workflow.types.js';

const JOB_AGENT: Record<string, string> = {
  [ORCHESTRATOR_JOBS.RUN_MAINTENANCE]: 'MaintenanceAgent', [ORCHESTRATOR_JOBS.RUN_INVENTORY]: 'InventoryAgent',
  [ORCHESTRATOR_JOBS.RUN_PURCHASE]: 'PurchaseAgent', [ORCHESTRATOR_JOBS.RUN_PRODUCTION_PLANNING]: 'ProductionPlanningAgent',
  [ORCHESTRATOR_JOBS.RUN_MANAGER]: 'ManagerAgent', [ORCHESTRATOR_JOBS.RUN_NOTIFICATION]: 'NotificationAgent',
  [ORCHESTRATOR_JOBS.START_MONITORING]: 'MonitoringAgent',
};

@Injectable({ deps: [DatabaseService, QueueService, WorkflowStateService] })
export class OrchestratorProcessor implements OnModuleInit {
  constructor(private readonly database: DatabaseService, private readonly queue: QueueService, private readonly state: WorkflowStateService) {}
  async onModuleInit(): Promise<void> { this.queue.registerObserver('factory-workflow-processor', (record) => this.process(record)); }

  private async process(record: AgentEventRecord): Promise<void> {
    const agent = JOB_AGENT[record.type]; if (!agent) return;
    const workflow = this.resolve(record.payload) ?? (record.type === ORCHESTRATOR_JOBS.RUN_NOTIFICATION
      ? this.state.list().find((item) => item.currentStage === WorkflowStage.HUMAN_APPROVAL && item.status === WorkflowStatus.WAITING_FOR_APPROVAL)
      : undefined); if (!workflow) return;
    if (record.status === 'queued') { await this.state.log(workflow, 'AGENT_QUEUED', agent, `${agent} job queued`, { status: 'PENDING', inputSummary: summarize(record.payload) }); await this.onQueued(workflow, record); return; }
    if (record.status === 'started') { await this.state.log(workflow, 'AGENT_STARTED', agent, `${agent} started`); return; }
    if (record.status === 'failed') { await this.state.log(workflow, 'AGENT_FAILED', agent, record.error ?? `${agent} failed`, { status: 'FAILED' }); await this.state.setStatus(workflow.workflowId, WorkflowStatus.FAILED, { error: record.error ?? `${agent} failed` }); await this.state.log(this.state.require(workflow.workflowId), 'WORKFLOW_FAILED', 'Orchestrator', record.error ?? `${agent} failed`, { status: 'FAILED' }); return; }
    await this.state.log(this.state.require(workflow.workflowId), 'AGENT_COMPLETED', agent, `${agent} completed`, { outputSummary: summarize(record.payload) });
    if (record.type === ORCHESTRATOR_JOBS.RUN_MANAGER) await this.afterManager(workflow.workflowId);
  }

  private async onQueued(workflow: FactoryWorkflow, record: AgentEventRecord): Promise<void> {
    const current = this.state.require(workflow.workflowId);
    if (record.type === ORCHESTRATOR_JOBS.RUN_MAINTENANCE) await this.move(current, WorkflowStage.MAINTENANCE_ANALYSIS, 'MaintenanceAgent', 'Machine alert sent for maintenance analysis');
    else if (record.type === ORCHESTRATOR_JOBS.RUN_INVENTORY) { await this.state.patchContext(current.workflowId, { maintenance: record.payload }); await this.move(this.state.require(current.workflowId), WorkflowStage.INVENTORY_CHECK, 'InventoryAgent', 'Required part sent for inventory check'); }
    else if (record.type === ORCHESTRATOR_JOBS.RUN_PURCHASE) { await this.state.patchContext(current.workflowId, { inventory: (record.payload as any)?.inventory }); await this.move(this.state.require(current.workflowId), WorkflowStage.PURCHASE_RECOMMENDATION, 'PurchaseAgent', 'Part unavailable; supplier recommendation requested'); }
    else if (record.type === ORCHESTRATOR_JOBS.RUN_PRODUCTION_PLANNING) {
      if (current.currentStage === WorkflowStage.INVENTORY_CHECK) await this.state.log(current, 'STEP_SKIPPED', 'Orchestrator', 'Purchase recommendation skipped because the part is available');
      await this.move(current, WorkflowStage.PRODUCTION_PLANNING, 'ProductionPlanningAgent', 'Production replanning requested with downtime estimate');
    } else if (record.type === ORCHESTRATOR_JOBS.RUN_MANAGER) { await this.state.patchContext(current.workflowId, { productionPlanning: record.payload }); await this.move(this.state.require(current.workflowId), WorkflowStage.MANAGER_REVIEW, 'ManagerAgent', 'Production plan sent for executive review'); }
    else if (record.type === ORCHESTRATOR_JOBS.RUN_NOTIFICATION) { await this.move(current, WorkflowStage.NOTIFICATION, 'NotificationAgent', 'Approved workflow sent for team notification'); }
    else if (record.type === ORCHESTRATOR_JOBS.START_MONITORING) { await this.state.patchContext(current.workflowId, { notifications: (record.payload as any)?.notifications }); await this.move(this.state.require(current.workflowId), WorkflowStage.MONITORING, 'MonitoringAgent', 'Notifications completed; monitoring started'); await this.state.setStatus(current.workflowId, WorkflowStatus.MONITORING); await this.state.log(this.state.require(current.workflowId), 'MONITORING_STARTED', 'MonitoringAgent', 'Recovery monitoring started'); }
  }

  private async afterManager(workflowId: string): Promise<void> {
    const workflow = this.state.require(workflowId); if (workflow.currentStage !== WorkflowStage.MANAGER_REVIEW) return;
    const ticketId = (workflow.context.maintenance as any)?.ticket?.ticketId ?? (workflow.context.maintenance as any)?.sparePartRequest?.ticketId;
    const manager = ticketId ? this.database.findManagerWorkflow(`WF-${ticketId}`) : undefined;
    const approval = manager?.approvalId ? this.database.findApprovalRequest(manager.approvalId) : undefined;
    await this.state.patchContext(workflowId, { manager, approval });
    if (approval?.status === ApprovalStatus.Pending) {
      await this.move(this.state.require(workflowId), WorkflowStage.HUMAN_APPROVAL, 'ManagerAgent', 'Human approval required');
      await this.state.setStatus(workflowId, WorkflowStatus.WAITING_FOR_APPROVAL);
      const paused = this.state.require(workflowId); await this.state.log(paused, 'APPROVAL_REQUESTED', 'ManagerAgent', `Approval ${approval.approvalId} requested`, { status: 'PENDING' }); await this.state.log(paused, 'WORKFLOW_PAUSED', 'Orchestrator', 'Workflow paused for a human decision', { status: 'PENDING' });
    }
  }

  private resolve(payload: unknown): FactoryWorkflow | undefined {
    const text = JSON.stringify(payload); return this.state.list().find((workflow) => text.includes(workflow.sourceAlertId) || text.includes(workflow.workflowId) || text.includes((workflow.context.maintenance as any)?.ticket?.ticketId ?? '__none__'));
  }
  private async move(workflow: FactoryWorkflow, target: WorkflowStage, agent: string, message: string): Promise<void> {
    if (workflow.currentStage === target || workflow.completedStages.includes(target) || [WorkflowStatus.COMPLETED, WorkflowStatus.REJECTED, WorkflowStatus.FAILED].includes(workflow.status)) return;
    await this.state.transition({ workflowId: workflow.workflowId, fromStage: workflow.currentStage, toStage: target, agent, message });
  }
}
function summarize(payload: unknown): Record<string, unknown> { if (!payload || typeof payload !== 'object') return {}; const value = payload as Record<string, any>; return { workflowId: value.workflowId, alertId: value.alertId, ticketId: value.ticketId ?? value.ticket?.ticketId ?? value.request?.ticketId, planId: value.plan?.planId, approvalId: value.approval?.approvalId }; }
