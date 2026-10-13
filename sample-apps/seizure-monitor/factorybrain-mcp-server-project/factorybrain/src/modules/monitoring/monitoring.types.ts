import type { ApprovedPlanInput, NotificationRecord } from '../notification/notification.types.js';

export enum WorkflowStage {
  Approved = 'Purchase Approved', Notified = 'Teams Notified', SupplierAccepted = 'Supplier Accepted',
  PartShipped = 'Part Shipped', PartDelivered = 'Part Delivered', Maintenance = 'Repair Started', Validation = 'Machine Validation',
  Running = 'Machine Running', Completed = 'Completed', Failed = 'Failed',
}
export enum MonitoringWorkflowStatus { Active = 'Active', Delayed = 'Delayed', Failed = 'Failed', Completed = 'Completed' }
export enum MonitoringAlertStatus { Open = 'Open', Resolved = 'Resolved' }

export interface ApprovedNotifiedPlan extends ApprovedPlanInput { notifications: NotificationRecord[]; notifiedAt: string; }
export interface StageHistoryEntry { stage: WorkflowStage; enteredAt: string; deadline: string; sourceEventId: string; }
export interface DeferredStatusEvent { eventId: string; workflowId: string; source: string; status: string; occurredAt: string; details?: Record<string, unknown>; }
export interface WorkflowTrackingRecord {
  workflowId: string; ticketId: string; machineId: string; approvalId: string;
  purchaseRequired: boolean;
  currentStage: WorkflowStage; status: MonitoringWorkflowStatus; stageStartedAt: string; stageDeadline: string;
  history: StageHistoryEntry[]; deferredEvents: DeferredStatusEvent[]; createdAt: string; updatedAt: string; completedAt?: string;
}
export interface MonitoringAgentEvent {
  kind: 'workflow_stage'; eventId: string; duplicateKey: string; workflowId: string; machineId: string;
  fromStage?: WorkflowStage; toStage: WorkflowStage; source: string; occurredAt: string; recordedAt: string; details: Record<string, unknown>;
}
export interface MonitoringAlert {
  kind: 'workflow_stall'; alertId: string; workflowId: string; machineId: string; stage: WorkflowStage;
  severity: 'High' | 'Critical'; message: string; status: MonitoringAlertStatus; createdAt: string; resolvedAt?: string; resolution?: string;
}
export interface ExternalStatusUpdate { eventId: string; workflowId: string; source: 'procurement' | 'maintenance' | 'machine'; status: string; occurredAt: string; details?: Record<string, unknown>; }
export interface LiveMonitoringEvent { type: 'monitoring.updated'; sequence: number; timestamp: string; workflow: WorkflowTrackingRecord; alert?: MonitoringAlert; }
