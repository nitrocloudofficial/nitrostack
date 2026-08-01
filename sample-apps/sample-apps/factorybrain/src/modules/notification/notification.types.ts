import type { ApprovalRequest, ExecutiveReport, ManagerWorkflow } from '../manager/manager.types.js';

export enum NotificationAudience {
  Maintenance = 'Maintenance',
  Procurement = 'Procurement',
  Requester = 'Requester',
  FloorSupervisor = 'Floor Supervisor',
  ManagerDashboard = 'Manager Dashboard',
}

export enum NotificationChannel {
  Email = 'email',
  Dashboard = 'dashboard',
}

export enum NotificationStatus {
  Pending = 'Pending',
  Sending = 'Sending',
  Sent = 'Sent',
  Failed = 'Failed',
}

export interface ApprovedPlanInput {
  workflowId: string;
  ticketId: string;
  machineId: string;
  approvedAt: string;
  approvedBy: string;
  approval: ApprovalRequest;
  report: ExecutiveReport;
  maintenance: NonNullable<ManagerWorkflow['maintenance']>;
  purchase?: ManagerWorkflow['purchase'];
  production: NonNullable<ManagerWorkflow['production']>;
  originalRequester: string;
}

export interface NotificationRecipient {
  recipientId: string;
  displayName: string;
  address: string;
  audience: NotificationAudience;
  channel: NotificationChannel;
}

export interface NotificationRecord {
  notificationId: string;
  duplicateKey: string;
  sequence: number;
  workflowId: string;
  approvalId: string;
  audience: NotificationAudience;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject: string;
  message: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  lastError?: string;
}

export interface NotificationAuditLog {
  auditId: string;
  workflowId: string;
  notificationId?: string;
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface LiveNotificationEvent {
  type: 'notification.updated';
  sequence: number;
  timestamp: string;
  notification: NotificationRecord;
}
