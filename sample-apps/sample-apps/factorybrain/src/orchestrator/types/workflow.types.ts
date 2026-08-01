import type { MachineAlert } from '../../services/database.service.js';

export enum WorkflowStatus {
  IN_PROGRESS = 'IN_PROGRESS', WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL', MONITORING = 'MONITORING',
  COMPLETED = 'COMPLETED', FAILED = 'FAILED', REJECTED = 'REJECTED',
}

export enum WorkflowStage {
  MACHINE_ALERT = 'MACHINE_ALERT', MAINTENANCE_ANALYSIS = 'MAINTENANCE_ANALYSIS', INVENTORY_CHECK = 'INVENTORY_CHECK',
  PURCHASE_RECOMMENDATION = 'PURCHASE_RECOMMENDATION', PRODUCTION_PLANNING = 'PRODUCTION_PLANNING', MANAGER_REVIEW = 'MANAGER_REVIEW',
  HUMAN_APPROVAL = 'HUMAN_APPROVAL', NOTIFICATION = 'NOTIFICATION', MONITORING = 'MONITORING', REPORTING = 'REPORTING', COMPLETED = 'COMPLETED',
}

export interface FactoryWorkflowContext {
  machineAlert: MachineAlert;
  maintenance?: unknown; inventory?: unknown; purchase?: unknown; productionPlanning?: unknown;
  manager?: unknown; approval?: unknown; notifications?: unknown; monitoring?: unknown;
  nextAction?: string; error?: string;
}

export interface FactoryWorkflow {
  workflowId: string; eventId: string; sourceAlertId: string; machineId: string;
  status: WorkflowStatus; currentStage: WorkflowStage; completedStages: WorkflowStage[];
  context: FactoryWorkflowContext; startedAt: string; lastUpdatedAt: string; completedAt?: string;
}

export type WorkflowEventType = 'WORKFLOW_STARTED' | 'AGENT_QUEUED' | 'AGENT_STARTED' | 'AGENT_COMPLETED' | 'AGENT_FAILED' |
  'STAGE_TRANSITIONED' | 'STEP_SKIPPED' | 'WORKFLOW_PAUSED' | 'WORKFLOW_RESUMED' | 'APPROVAL_REQUESTED' |
  'APPROVAL_GRANTED' | 'APPROVAL_REJECTED' | 'MONITORING_STARTED' | 'WORKFLOW_COMPLETED' | 'WORKFLOW_FAILED';

export interface WorkflowAgentEvent {
  kind: 'orchestration_event'; agentEventId: string; workflowId: string; eventId: string; machineId: string;
  agent: string; eventType: WorkflowEventType; fromStage?: WorkflowStage; toStage?: WorkflowStage;
  status: 'SUCCESS' | 'FAILED' | 'PENDING'; message: string; inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>; createdAt: string;
}

export interface TransitionInput { workflowId: string; fromStage: WorkflowStage; toStage: WorkflowStage; agent: string; message: string; }
