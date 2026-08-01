import { Injectable, OnModuleInit } from '@nitrostack/core';
import { ApprovalAction } from '../modules/manager/manager.types.js';
import { ManagerAgent } from '../modules/manager/manager.agent.js';
import { type MachineAlert } from '../services/database.service.js';
import { type AgentEvent, QueueService } from '../services/queue.service.js';
import { ORCHESTRATOR_EVENTS, ORCHESTRATOR_JOBS } from './orchestrator.jobs.js';
import { WorkflowStage, WorkflowStatus } from './types/workflow.types.js';
import { WorkflowStateService } from './workflow-state.service.js';

@Injectable({ deps: [QueueService, WorkflowStateService, ManagerAgent] })
export class OrchestratorService implements OnModuleInit {
  constructor(private readonly queue: QueueService, private readonly state: WorkflowStateService, private readonly manager: ManagerAgent) {}
  async onModuleInit(): Promise<void> {
    this.queue.registerHandler('orchestrator', ORCHESTRATOR_EVENTS.MACHINE_ALERT_CREATED, (event) => this.machineAlert(event));
    this.queue.registerHandler('orchestrator', ORCHESTRATOR_EVENTS.PURCHASE_APPROVED, (event) => this.approval(event, true));
    this.queue.registerHandler('orchestrator', ORCHESTRATOR_EVENTS.PURCHASE_REJECTED, (event) => this.approval(event, false));
    this.queue.registerHandler('orchestrator', ORCHESTRATOR_EVENTS.RECOVERY_COMPLETED, (event) => this.recoveryCompleted(event));
  }

  private async machineAlert(event: AgentEvent<unknown>): Promise<void> {
    const alert = event.payload as MachineAlert;
    if (alert.kind !== 'machine_failure' || !alert.alertId || !alert.machineId) throw new Error('Invalid machine.alert.created payload');
    const result = await this.state.create(event.eventId, alert); if (!result.created) return;
    await this.queue.publish({ from: 'orchestrator', to: 'maintenance', type: ORCHESTRATOR_JOBS.RUN_MAINTENANCE, payload: alert },
      { idempotencyKey: `${result.workflow.workflowId}:maintenance` });
  }

  private async approval(event: AgentEvent<unknown>, approved: boolean): Promise<void> {
    const payload = event.payload as { workflowId: string; approvalRequestId: string; approvedBy?: string; approvedAt?: string; reason?: string };
    const workflow = this.state.require(payload.workflowId);
    if (workflow.status === WorkflowStatus.REJECTED || workflow.status === WorkflowStatus.COMPLETED) return;
    if (workflow.status !== WorkflowStatus.WAITING_FOR_APPROVAL || workflow.currentStage !== WorkflowStage.HUMAN_APPROVAL) throw new Error(`Workflow ${workflow.workflowId} is not waiting for approval`);
    const known = (workflow.context.approval as any)?.approvalId;
    if (known && known !== payload.approvalRequestId) throw new Error(`Approval request ${payload.approvalRequestId} does not match ${known}`);
    const decision = await this.manager.decideApproval({ approvalId: payload.approvalRequestId, action: approved ? ApprovalAction.Approve : ApprovalAction.Reject,
      decidedBy: payload.approvedBy ?? 'Human Manager', comments: payload.reason });
    await this.state.patchContext(workflow.workflowId, { approval: { ...decision.approval, approvedAt: payload.approvedAt } });
    if (!approved) { await this.state.setStatus(workflow.workflowId, WorkflowStatus.REJECTED, { nextAction: 'Review supplier recommendation or stop the workflow' }); await this.state.log(this.state.require(workflow.workflowId), 'APPROVAL_REJECTED', 'ManagerAgent', payload.reason ?? 'Purchase rejected', { status: 'FAILED' }); return; }
    await this.state.setStatus(workflow.workflowId, WorkflowStatus.IN_PROGRESS); const resumed = this.state.require(workflow.workflowId);
    await this.state.log(resumed, 'APPROVAL_GRANTED', 'ManagerAgent', `Approved by ${payload.approvedBy ?? 'Human Manager'}`);
    await this.state.log(resumed, 'WORKFLOW_RESUMED', 'Orchestrator', 'Workflow resumed after human approval');
  }

  private async recoveryCompleted(event: AgentEvent<unknown>): Promise<void> {
    const payload = event.payload as { workflowId: string; machineId: string; machineStatus: string; actualDowntimeHours?: number; actualDowntimeLoss?: number; completedAt?: string };
    const workflow = this.state.require(payload.workflowId);
    if (workflow.status === WorkflowStatus.COMPLETED) return;
    if (workflow.status !== WorkflowStatus.MONITORING || workflow.currentStage !== WorkflowStage.MONITORING) throw new Error(`Workflow ${workflow.workflowId} is not monitoring`);
    if (!['operational', 'running', 'returned to service'].includes(payload.machineStatus.toLowerCase())) throw new Error(`Machine is not operational: ${payload.machineStatus}`);
    const monitoringWorkflowId = (workflow.context.manager as any)?.workflowId ?? workflow.workflowId;
    await this.queue.publish({ from: 'orchestrator', to: 'monitoring', type: 'status_update', payload: { eventId: event.eventId,
      workflowId: monitoringWorkflowId, source: 'machine', status: 'running', occurredAt: payload.completedAt ?? new Date().toISOString(), details: payload } },
      { idempotencyKey: `${workflow.workflowId}:machine-recovery` });
    await this.state.patchContext(workflow.workflowId, { monitoring: payload });
    await this.state.transition({ workflowId: workflow.workflowId, fromStage: WorkflowStage.MONITORING, toStage: WorkflowStage.REPORTING, agent: 'MonitoringAgent', message: 'Machine operational; final KPI report generated' });
    await this.state.transition({ workflowId: workflow.workflowId, fromStage: WorkflowStage.REPORTING, toStage: WorkflowStage.COMPLETED, agent: 'Orchestrator', message: 'Recovery workflow completed' });
    await this.state.setStatus(workflow.workflowId, WorkflowStatus.COMPLETED);
    await this.state.log(this.state.require(workflow.workflowId), 'WORKFLOW_COMPLETED', 'Orchestrator', 'Machine returned to operation and workflow completed');
  }
}
