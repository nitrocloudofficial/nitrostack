import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { AgentEvent, QueueService } from '../../services/queue.service.js';
import { ApprovalStatus as PurchaseApprovalStatus, PurchaseStatus } from '../purchase/purchase.types.js';
import { FactoryConfigService } from './factory-config.service.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';
import {
  approvalDecisionSchema,
  inventorySummarySchema,
  maintenanceSummarySchema,
  productionSummarySchema,
  purchaseSummarySchema,
} from './manager.schemas.js';
import {
  ApprovalAction,
  ApprovalRequest,
  ApprovalStatus,
  AuditLog,
  ExecutiveReport,
  FactoryConfiguration,
  InventorySummary,
  LossEstimate,
  MaintenanceSummary,
  ManagerWorkflow,
  ManagerWorkflowState,
  ProductionSummary,
  PurchaseSummary,
} from './manager.types.js';

@Injectable({ deps: [DatabaseService, FactoryConfigService, QueueService] })
export class ManagerAgent implements OnModuleInit {
  private readonly workflows = new Map<string, ManagerWorkflow>();
  private config!: FactoryConfiguration;

  constructor(
    private readonly database: DatabaseService,
    private readonly factoryConfig: FactoryConfigService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.config = await this.factoryConfig.initialize();
    const state = await this.database.initializeManagerState();
    for (const workflow of state.workflows) this.workflows.set(workflow.workflowId, workflow);
    this.queue.registerHandler('manager', 'maintenance_summary', (event) => this.receiveMaintenance(event));
    this.queue.registerHandler('manager', 'inventory_summary', (event) => this.receiveInventory(event));
    this.queue.registerHandler('manager', 'purchase_recommendation', (event) => this.receivePurchase(event));
    this.queue.registerHandler('manager', ORCHESTRATOR_JOBS.RUN_MANAGER, (event) => this.receiveProduction(event));
    this.queue.registerHandler('manager', 'workflow_status', (event) => this.receiveWorkflowStatus(event));
  }

  estimateLoss(workflow: ManagerWorkflow): LossEstimate {
    const downtimeHours = workflow.production?.plan.disruption.expectedDowntimeHours ?? workflow.maintenance?.estimatedRepairHours ?? 0;
    const productionDelayHours = workflow.production?.totalDelayHours ?? 0;
    const purchaseCost = workflow.purchase?.totalCost ?? 0;
    const downtimeLoss = roundMoney(downtimeHours * this.config.downtimeCostPerHour);
    const productionDelayLoss = roundMoney(
      productionDelayHours * this.config.downtimeCostPerHour * this.config.productionDelayCostFactor,
    );
    return {
      downtimeHours,
      downtimeLoss,
      productionDelayLoss,
      purchaseCost,
      totalEstimatedImpact: roundMoney(downtimeLoss + productionDelayLoss + purchaseCost),
      currency: this.config.currency,
    };
  }

  generateExecutiveReport(workflow: ManagerWorkflow): ExecutiveReport {
    if (!workflow.maintenance || !workflow.inventory || !workflow.production) {
      throw new Error(`Workflow ${workflow.workflowId} is incomplete`);
    }
    const lossEstimate = this.estimateLoss(workflow);
    return {
      reportId: `REPORT-${workflow.ticketId}-${Date.now()}`,
      workflowId: workflow.workflowId,
      generatedAt: new Date().toISOString(),
      machineId: workflow.machineId,
      incident: `${workflow.maintenance.urgency} ${workflow.maintenance.likelyCause} on ${workflow.machineId}.`,
      maintenancePlan: `${workflow.maintenance.assignedTeam} requires ${workflow.maintenance.requiredPart}; estimated repair ${workflow.maintenance.estimatedRepairHours} hour(s).`,
      inventoryPosition: `${workflow.inventory.decision}; ${workflow.inventory.availableQuantity} available at ${workflow.inventory.warehouseLocation ?? 'unassigned warehouse'}.`,
      purchaseRecommendation: workflow.purchase
        ? `${workflow.purchase.supplierName}, ${this.config.currency} ${workflow.purchase.totalCost.toFixed(2)}, expected ${workflow.purchase.expectedDeliveryDate}.`
        : 'No purchase is required.',
      productionImpact: `${workflow.production.affectedOrderCount} affected order(s), ${workflow.production.totalDelayHours} aggregate delay hour(s).`,
      lossEstimate,
      recommendation: workflow.purchase
        ? 'Evaluate the purchase under factory approval policy and adopt the proposed production plan.'
        : 'Proceed with the proposed production plan using reserved inventory.',
    };
  }

  evaluateApprovalRule(workflow: ManagerWorkflow): { autoApprove: boolean; reason: string } {
    const amount = workflow.purchase?.totalCost ?? 0;
    const autoApprove = this.config.autoApprovalEnabled && amount <= this.config.approvalThreshold;
    return {
      autoApprove,
      reason: autoApprove
        ? `${this.config.currency} ${amount.toFixed(2)} is within the ${this.config.currency} ${this.config.approvalThreshold.toFixed(2)} threshold.`
        : `${this.config.currency} ${amount.toFixed(2)} requires human approval above the ${this.config.currency} ${this.config.approvalThreshold.toFixed(2)} threshold.`,
    };
  }

  async approvePurchase(workflow: ManagerWorkflow): Promise<ApprovalRequest> {
    if (!workflow.production || !workflow.report) throw new Error('A production plan and report are required for approval');
    const rule = this.evaluateApprovalRule(workflow);
    const now = new Date().toISOString();
    const request: ApprovalRequest = {
      approvalId: `APR-${workflow.ticketId}-${Date.now()}`,
      requestKey: `${workflow.ticketId}:${workflow.purchase?.purchaseRequestId ?? 'NO_PURCHASE'}:${workflow.production.planId}`,
      workflowId: workflow.workflowId,
      purchaseRequestId: workflow.purchase?.purchaseRequestId,
      productionPlanId: workflow.production.planId,
      amount: workflow.purchase?.totalCost ?? 0,
      threshold: this.config.approvalThreshold,
      currency: this.config.currency,
      status: rule.autoApprove ? ApprovalStatus.Approved : ApprovalStatus.Pending,
      autoApproved: rule.autoApprove,
      requestedAt: now,
      ...(rule.autoApprove ? { decidedAt: now, decidedBy: 'Manager Agent', comments: rule.reason } : {}),
      report: workflow.report,
    };
    const saved = await this.database.createApprovalRequest(request);
    workflow.approvalId = saved.request.approvalId;
    await this.audit(workflow.workflowId, saved.created ? 'approval_request_created' : 'duplicate_approval_suppressed', 'Manager Agent', {
      approvalId: saved.request.approvalId,
      requestKey: saved.request.requestKey,
      autoApproved: saved.request.autoApproved,
    });
    if (saved.request.status === ApprovalStatus.Approved) {
      await this.persistPurchaseDecision(workflow, ApprovalStatus.Approved, saved.request.decidedBy ?? 'Manager Agent');
    }
    return saved.request;
  }

  async decideApproval(input: unknown): Promise<{ approval: ApprovalRequest; workflow: ManagerWorkflow }> {
    const decision = approvalDecisionSchema.parse(input);
    const approval = this.database.findApprovalRequest(decision.approvalId);
    if (!approval) throw new Error(`Unknown approval request: ${decision.approvalId}`);
    if (approval.status !== ApprovalStatus.Pending) {
      throw new Error(`Approval ${approval.approvalId} is already ${approval.status}`);
    }
    const workflow = this.requireWorkflow(approval.workflowId);
    approval.status = decision.action === ApprovalAction.Approve
      ? ApprovalStatus.Approved
      : decision.action === ApprovalAction.Reject
        ? ApprovalStatus.Rejected
        : ApprovalStatus.ChangesRequested;
    approval.decidedAt = new Date().toISOString();
    approval.decidedBy = decision.decidedBy;
    approval.comments = decision.comments;
    await this.database.updateApprovalRequest(approval);
    await this.persistPurchaseDecision(workflow, approval.status, decision.decidedBy);
    await this.audit(workflow.workflowId, `human_${decision.action.toLowerCase().replace(/\s+/g, '_')}`, decision.decidedBy, {
      approvalId: approval.approvalId,
      comments: decision.comments ?? '',
    });

    if (decision.action === ApprovalAction.Approve) {
      workflow.state = ManagerWorkflowState.Approved;
      await this.resumeApprovedWorkflow(workflow, approval);
      return { approval, workflow: clone(this.requireWorkflow(workflow.workflowId)) };
    } else {
      workflow.state = decision.action === ApprovalAction.Reject
        ? ManagerWorkflowState.Rejected
        : ManagerWorkflowState.Replanning;
      await this.requestReplanning(workflow, approval);
    }
    await this.saveWorkflow(workflow);
    return { approval, workflow: clone(workflow) };
  }

  listWorkflows(): ManagerWorkflow[] { return [...this.workflows.values()].map(clone); }

  private async receiveMaintenance(event: AgentEvent<unknown>): Promise<void> {
    const summary = maintenanceSummarySchema.parse(event.payload) as MaintenanceSummary;
    const workflow = this.getOrCreateWorkflow(summary.ticketId, summary.machineId);
    workflow.maintenance = summary;
    await this.receiveAndEvaluate(workflow, 'maintenance_received');
  }

  private async receiveInventory(event: AgentEvent<unknown>): Promise<void> {
    const summary = inventorySummarySchema.parse(event.payload) as InventorySummary;
    const workflow = this.getOrCreateWorkflow(summary.ticketId, summary.machineId);
    workflow.inventory = summary;
    await this.receiveAndEvaluate(workflow, 'inventory_received');
  }

  private async receivePurchase(event: AgentEvent<any>): Promise<void> {
    if (event.payload.summary) {
      const summary = purchaseSummarySchema.parse(event.payload.summary) as PurchaseSummary;
      const machineId = event.payload.ticket?.machineId ?? summary.recommendation.purchaseRequest.partId;
      const workflow = this.getOrCreateWorkflow(summary.ticketId, machineId);
      workflow.purchase = summary;
      await this.receiveAndEvaluate(workflow, 'purchase_received');
      return;
    }
    const recommendation = event.payload.recommendation;
    const ticketId = event.payload.ticket?.ticketId ?? recommendation.purchaseRequest.requestReason;
    const summary = purchaseSummarySchema.parse({
      ticketId,
      purchaseRequestId: recommendation.purchaseRequest.purchaseRequestId,
      supplierId: recommendation.purchaseRequest.supplierId,
      supplierName: recommendation.purchaseRequest.supplierName,
      totalCost: recommendation.purchaseRequest.totalCostGbp,
      expectedDeliveryDate: recommendation.purchaseRequest.expectedDeliveryDate,
      recommendation,
    }) as PurchaseSummary;
    const machineId = event.payload.ticket?.machineId ?? recommendation.purchaseRequest.partId;
    const workflow = this.getOrCreateWorkflow(summary.ticketId, machineId);
    workflow.purchase = summary;
    await this.receiveAndEvaluate(workflow, 'purchase_received');
  }

  private async receiveProduction(event: AgentEvent<any>): Promise<void> {
    const plan = event.payload.plan;
    const summary = productionSummarySchema.parse(event.payload.summary ?? {
      ticketId: plan.disruption.sourceReference ?? `DISRUPTION-${plan.disruption.machineId}`,
      planId: plan.planId, affectedOrderCount: plan.affectedOrderCount, totalDelayHours: plan.totalDelayHours, plan,
    }) as ProductionSummary;
    const workflow = this.getOrCreateWorkflow(summary.ticketId, plan.disruption.machineId);
    if (workflow.production?.planId !== summary.planId) workflow.approvalId = undefined;
    workflow.production = summary;
    await this.receiveAndEvaluate(workflow, 'production_received');
  }

  private async receiveWorkflowStatus(event: AgentEvent<unknown>): Promise<void> {
    const payload = event.payload as { workflowId?: string; state?: string; details?: Record<string, unknown> };
    if (!payload.workflowId || !payload.state) throw new Error('Manager workflow status requires workflowId and state');
    const workflow = this.requireWorkflow(payload.workflowId);
    const states = new Set<string>(Object.values(ManagerWorkflowState));
    if (!states.has(payload.state)) throw new Error(`Unsupported Manager workflow state: ${payload.state}`);
    workflow.state = payload.state as ManagerWorkflowState;
    await this.saveWorkflow(workflow);
    await this.audit(workflow.workflowId, 'workflow_status_updated', event.from, {
      state: payload.state,
      ...(payload.details ?? {}),
    });
  }

  private async receiveAndEvaluate(workflow: ManagerWorkflow, action: string): Promise<void> {
    workflow.updatedAt = new Date().toISOString();
    await this.audit(workflow.workflowId, action, 'Agent Pipeline', {});
    if (!this.isReady(workflow)) {
      workflow.state = ManagerWorkflowState.Collecting;
      await this.saveWorkflow(workflow);
      return;
    }
    workflow.state = ManagerWorkflowState.Ready;
    workflow.report = this.generateExecutiveReport(workflow);
    const approval = await this.approvePurchase(workflow);
    if (approval.status === ApprovalStatus.Approved) {
      workflow.state = ManagerWorkflowState.Approved;
      await this.resumeApprovedWorkflow(workflow, approval);
      return;
    } else if (approval.status === ApprovalStatus.Pending) {
      workflow.state = ManagerWorkflowState.PendingHuman;
    }
    await this.saveWorkflow(workflow);
  }

  private isReady(workflow: ManagerWorkflow): boolean {
    return Boolean(
      workflow.maintenance && workflow.inventory && workflow.production &&
      (!workflow.inventory.reorderRequired || workflow.purchase),
    );
  }

  private async resumeApprovedWorkflow(workflow: ManagerWorkflow, approval: ApprovalRequest): Promise<void> {
    workflow.state = ManagerWorkflowState.NotificationPending;
    await this.saveWorkflow(workflow);
    await this.queue.publish({
      from: 'manager', to: 'notification', type: ORCHESTRATOR_JOBS.RUN_NOTIFICATION,
      payload: { workflow, approval, report: workflow.report },
    }, { idempotencyKey: `notification-approved-${approval.approvalId}` });
    await this.audit(workflow.workflowId, 'notification_handoff_created', 'Manager Agent', { approvalId: approval.approvalId });
  }

  private async requestReplanning(workflow: ManagerWorkflow, approval: ApprovalRequest): Promise<void> {
    if (!workflow.production) throw new Error('Cannot request replanning without a production plan');
    await this.queue.publish({
      from: 'manager', to: 'production', type: 'replan_requested',
      payload: {
        workflowId: workflow.workflowId,
        priorPlanId: workflow.production.planId,
        disruption: workflow.production.plan.disruption,
        decision: approval.status,
        feedback: approval.comments,
      },
    }, { idempotencyKey: `replan-${approval.approvalId}` });
    workflow.state = ManagerWorkflowState.Replanning;
    await this.audit(workflow.workflowId, 'replanning_handoff_created', 'Manager Agent', { approvalId: approval.approvalId });
  }

  private getOrCreateWorkflow(ticketId: string, machineId: string): ManagerWorkflow {
    const workflowId = `WF-${ticketId}`;
    const existing = this.workflows.get(workflowId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const workflow: ManagerWorkflow = {
      workflowId, ticketId, machineId, state: ManagerWorkflowState.Collecting,
      createdAt: now, updatedAt: now,
    };
    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  private requireWorkflow(workflowId: string): ManagerWorkflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Unknown Manager workflow: ${workflowId}`);
    return workflow;
  }

  private async saveWorkflow(workflow: ManagerWorkflow): Promise<void> {
    workflow.updatedAt = new Date().toISOString();
    await this.database.saveManagerWorkflow(workflow);
    this.workflows.set(workflow.workflowId, clone(workflow));
  }

  private async persistPurchaseDecision(workflow: ManagerWorkflow, status: ApprovalStatus, decidedBy: string): Promise<void> {
    if (!workflow.purchase) return;
    const decision = status === ApprovalStatus.Approved
      ? { approvalStatus: PurchaseApprovalStatus.Approved, purchaseStatus: PurchaseStatus.Ordered, approvedBy: decidedBy }
      : status === ApprovalStatus.Rejected
        ? { approvalStatus: PurchaseApprovalStatus.Rejected, purchaseStatus: PurchaseStatus.Cancelled, approvedBy: decidedBy }
        : { approvalStatus: PurchaseApprovalStatus.Pending, purchaseStatus: PurchaseStatus.Requested, approvedBy: '' };
    const purchase = await this.database.updatePurchaseRequestDecision(workflow.purchase.purchaseRequestId, decision);
    workflow.purchase.recommendation.purchaseRequest = purchase;
    await this.audit(workflow.workflowId, 'purchase_request_status_updated', decidedBy, {
      purchaseRequestId: purchase.purchaseRequestId,
      approvalStatus: purchase.approvalStatus,
      purchaseStatus: purchase.purchaseStatus,
    });
  }

  private async audit(workflowId: string, action: string, actor: string, details: Record<string, unknown>): Promise<void> {
    const log: AuditLog = {
      auditId: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workflowId, action, actor, timestamp: new Date().toISOString(), details,
    };
    await this.database.saveAuditLog(log);
  }
}

function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function clone<T>(value: T): T { return structuredClone(value); }
