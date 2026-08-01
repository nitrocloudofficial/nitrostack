import type { PurchaseRecommendation } from '../purchase/purchase.types.js';
import type { ProductionPlan } from '../production/production.types.js';

export interface FactoryConfiguration {
  configId: 'factory-default';
  currency: 'GBP';
  downtimeCostPerHour: number;
  approvalThreshold: number;
  productionDelayCostFactor: number;
  autoApprovalEnabled: boolean;
  updatedAt: string;
}

export interface MaintenanceSummary {
  ticketId: string;
  machineId: string;
  likelyCause: string;
  requiredPart: string;
  estimatedRepairHours: number;
  assignedTeam: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface InventorySummary {
  ticketId: string;
  machineId: string;
  decision: 'in_stock' | 'low_stock' | 'out_of_stock';
  requestedQuantity: number;
  availableQuantity: number;
  warehouseLocation?: string;
  reorderRequired: boolean;
}

export interface PurchaseSummary {
  ticketId: string;
  purchaseRequestId: string;
  supplierId: string;
  supplierName: string;
  totalCost: number;
  expectedDeliveryDate: string;
  recommendation: PurchaseRecommendation;
}

export interface ProductionSummary {
  ticketId: string;
  planId: string;
  affectedOrderCount: number;
  totalDelayHours: number;
  plan: ProductionPlan;
}

export interface LossEstimate {
  downtimeHours: number;
  downtimeLoss: number;
  productionDelayLoss: number;
  purchaseCost: number;
  totalEstimatedImpact: number;
  currency: 'GBP';
}

export interface ExecutiveReport {
  reportId: string;
  workflowId: string;
  generatedAt: string;
  machineId: string;
  incident: string;
  maintenancePlan: string;
  inventoryPosition: string;
  purchaseRecommendation: string;
  productionImpact: string;
  lossEstimate: LossEstimate;
  recommendation: string;
}

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  ChangesRequested = 'Changes Requested',
}

export enum ApprovalAction {
  Approve = 'Approve',
  Reject = 'Reject',
  RequestChanges = 'Request Changes',
}

export enum ManagerWorkflowState {
  Collecting = 'Collecting Inputs',
  Ready = 'Ready for Decision',
  PendingHuman = 'Pending Human Approval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Replanning = 'Replanning Requested',
  NotificationPending = 'Notification Pending',
  NotificationsSent = 'Notifications Sent',
  MonitoringActive = 'Monitoring Active',
  Delayed = 'Delayed',
  Failed = 'Failed',
  Completed = 'Completed',
}

export interface ApprovalRequest {
  approvalId: string;
  requestKey: string;
  workflowId: string;
  purchaseRequestId?: string;
  productionPlanId: string;
  amount: number;
  threshold: number;
  currency: 'GBP';
  status: ApprovalStatus;
  autoApproved: boolean;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  comments?: string;
  report: ExecutiveReport;
}

export interface ManagerWorkflow {
  workflowId: string;
  ticketId: string;
  machineId: string;
  state: ManagerWorkflowState;
  maintenance?: MaintenanceSummary;
  inventory?: InventorySummary;
  purchase?: PurchaseSummary;
  production?: ProductionSummary;
  report?: ExecutiveReport;
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  auditId: string;
  workflowId: string;
  action: string;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
}
