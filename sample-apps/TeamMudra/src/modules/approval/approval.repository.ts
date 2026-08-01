/**
 * Data access contract for the approval workflow. Business-oriented
 * operations rather than generic CRUD, same contract-first shape as
 * PharmacyRepository/ProcurementRepository. No Prisma, no implementation —
 * that lives in a separate approval.repository.sqlite.ts.
 *
 * DESIGN NOTE (flagging, since this commits to a data flow the request
 * didn't fully specify): because execution happens synchronously as part
 * of approval, this interface covers three concerns in one workflow —
 * reading approval context, recording the decision, and (on approval)
 * creating the PurchaseOrder + ActionExecution records and closing out the
 * WorkflowRun. ApprovalService will orchestrate the order of these calls;
 * this file only defines what operations exist.
 */

export interface ApprovalRequestContext {
  approvalRequestId: string;
  preparedActionId: string;
  approvalPolicyId: string;
  requiredApprovals: number;
  existingApprovalCount: number;

  workflowRunId: string;
  targetType: string;
  targetId: string;
  payloadJson: string;
  amountPaise: number | null;
}

export interface ApprovalDecisionRecord {
  approvalDecisionId: string;
}

export interface PurchaseOrderRecord {
  purchaseOrderId: string;
}

export interface ActionExecutionRecord {
  actionExecutionId: string;
}

export interface RecordApprovalDecisionInput {
  approvalRequestId: string;
  approverUserId: string;
  decision: "APPROVED" | "REJECTED";
  rationale: string;
}

export interface ResolveApprovalRequestInput {
  approvalRequestId: string;
  status: "APPROVED" | "REJECTED";
}

export interface UpdatePreparedActionStatusInput {
  preparedActionId: string;
  status: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  itemId: string;
  quantity: number;
  unitPricePaise: number;
  gstBasisPoints: number;
  expectedAt: Date;
}

export interface CreateActionExecutionInput {
  preparedActionId: string;
  status: string;
  resultType?: string;
  resultId?: string;
  errorMessage?: string;
}

export interface CompleteWorkflowRunInput {
  workflowRunId: string;
  status: string;
}

export interface ApprovalRepository {
  /** Fetches everything needed to evaluate and act on an approval decision. Throws if not found. */
  getApprovalRequestContext(
    approvalRequestId: string
  ): Promise<ApprovalRequestContext>;

  recordApprovalDecision(
    input: RecordApprovalDecisionInput
  ): Promise<ApprovalDecisionRecord>;

  resolveApprovalRequest(input: ResolveApprovalRequestInput): Promise<void>;

  updatePreparedActionStatus(
    input: UpdatePreparedActionStatusInput
  ): Promise<void>;

  /** Executes the approved procurement action by creating the PurchaseOrder (and its line). */
  createPurchaseOrder(
    input: CreatePurchaseOrderInput
  ): Promise<PurchaseOrderRecord>;

  createActionExecution(
    input: CreateActionExecutionInput
  ): Promise<ActionExecutionRecord>;

  completeWorkflowRun(input: CompleteWorkflowRunInput): Promise<void>;
}