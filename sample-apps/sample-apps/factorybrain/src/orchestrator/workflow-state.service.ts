import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService, type MachineAlert } from '../services/database.service.js';
import { FactoryWorkflow, TransitionInput, WorkflowAgentEvent, WorkflowEventType, WorkflowStage, WorkflowStatus } from './types/workflow.types.js';

const ALLOWED: Partial<Record<WorkflowStage, WorkflowStage[]>> = {
  [WorkflowStage.MACHINE_ALERT]: [WorkflowStage.MAINTENANCE_ANALYSIS],
  [WorkflowStage.MAINTENANCE_ANALYSIS]: [WorkflowStage.INVENTORY_CHECK],
  [WorkflowStage.INVENTORY_CHECK]: [WorkflowStage.PURCHASE_RECOMMENDATION, WorkflowStage.PRODUCTION_PLANNING],
  [WorkflowStage.PURCHASE_RECOMMENDATION]: [WorkflowStage.PRODUCTION_PLANNING],
  [WorkflowStage.PRODUCTION_PLANNING]: [WorkflowStage.MANAGER_REVIEW],
  [WorkflowStage.MANAGER_REVIEW]: [WorkflowStage.HUMAN_APPROVAL, WorkflowStage.NOTIFICATION],
  [WorkflowStage.HUMAN_APPROVAL]: [WorkflowStage.NOTIFICATION],
  [WorkflowStage.NOTIFICATION]: [WorkflowStage.MONITORING],
  [WorkflowStage.MONITORING]: [WorkflowStage.REPORTING],
  [WorkflowStage.REPORTING]: [WorkflowStage.COMPLETED],
};

@Injectable({ deps: [DatabaseService] })
export class WorkflowStateService implements OnModuleInit {
  constructor(private readonly database: DatabaseService) {}
  async onModuleInit(): Promise<void> { await this.database.initializeFactoryWorkflows(); }

  async create(eventId: string, alert: MachineAlert): Promise<{ workflow: FactoryWorkflow; created: boolean }> {
    const now = new Date().toISOString();
    const result = await this.database.createFactoryWorkflow({ workflowId: `WF-${alert.alertId}`, eventId, sourceAlertId: alert.alertId,
      machineId: alert.machineId, status: WorkflowStatus.IN_PROGRESS, currentStage: WorkflowStage.MACHINE_ALERT, completedStages: [],
      context: { machineAlert: structuredClone(alert) }, startedAt: now, lastUpdatedAt: now });
    if (result.created) await this.log(result.workflow, 'WORKFLOW_STARTED', 'Orchestrator', 'Workflow started from machine alert');
    return result;
  }

  require(workflowId: string): FactoryWorkflow { const workflow = this.database.findFactoryWorkflow(workflowId); if (!workflow) throw new Error(`Unknown factory workflow: ${workflowId}`); return workflow; }
  findByAlert(alertId: string): FactoryWorkflow | undefined { return this.database.findFactoryWorkflowByAlert(alertId); }
  list(): FactoryWorkflow[] { return this.database.listFactoryWorkflows(); }

  async patchContext(workflowId: string, patch: Partial<FactoryWorkflow['context']>): Promise<FactoryWorkflow> {
    const workflow = this.require(workflowId); workflow.context = { ...workflow.context, ...structuredClone(patch) }; workflow.lastUpdatedAt = new Date().toISOString(); return this.database.saveFactoryWorkflow(workflow);
  }
  async setStatus(workflowId: string, status: WorkflowStatus, patch: Partial<FactoryWorkflow['context']> = {}): Promise<FactoryWorkflow> {
    const workflow = this.require(workflowId); workflow.status = status; workflow.context = { ...workflow.context, ...structuredClone(patch) }; workflow.lastUpdatedAt = new Date().toISOString();
    if (status === WorkflowStatus.COMPLETED) workflow.completedAt = workflow.lastUpdatedAt;
    return this.database.saveFactoryWorkflow(workflow);
  }
  async transition(input: TransitionInput): Promise<FactoryWorkflow> {
    const workflow = this.require(input.workflowId);
    if (workflow.status === WorkflowStatus.COMPLETED || workflow.status === WorkflowStatus.REJECTED) return workflow;
    if (workflow.currentStage === input.toStage || workflow.completedStages.includes(input.toStage)) return workflow;
    if (workflow.currentStage !== input.fromStage || !ALLOWED[input.fromStage]?.includes(input.toStage)) throw new Error(`Invalid workflow transition ${workflow.currentStage} -> ${input.toStage}`);
    workflow.completedStages.push(input.fromStage); workflow.currentStage = input.toStage; workflow.lastUpdatedAt = new Date().toISOString();
    await this.database.saveFactoryWorkflow(workflow);
    await this.log(workflow, 'STAGE_TRANSITIONED', input.agent, input.message, { fromStage: input.fromStage, toStage: input.toStage });
    return workflow;
  }
  async log(workflow: FactoryWorkflow, eventType: WorkflowEventType, agent: string, message: string, options: Partial<Pick<WorkflowAgentEvent, 'fromStage' | 'toStage' | 'status' | 'inputSummary' | 'outputSummary'>> = {}): Promise<void> {
    const createdAt = new Date().toISOString(); const discriminator = `${eventType}-${agent}-${options.fromStage ?? ''}-${options.toStage ?? ''}-${message}`;
    await this.database.saveWorkflowAgentEvent({ kind: 'orchestration_event', agentEventId: `AE-${workflow.workflowId}-${stable(discriminator)}`,
      workflowId: workflow.workflowId, eventId: workflow.eventId, machineId: workflow.machineId, agent, eventType,
      status: options.status ?? 'SUCCESS', message, createdAt, ...(options.fromStage ? { fromStage: options.fromStage } : {}),
      ...(options.toStage ? { toStage: options.toStage } : {}), ...(options.inputSummary ? { inputSummary: options.inputSummary } : {}),
      ...(options.outputSummary ? { outputSummary: options.outputSummary } : {}) });
  }
}
function stable(value: string): string { let hash = 0; for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0; return hash.toString(36); }
