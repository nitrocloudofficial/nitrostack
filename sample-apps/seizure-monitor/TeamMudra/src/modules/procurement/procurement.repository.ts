/**
 * Data access contract for the procurement workflow. Business-oriented
 * operations rather than generic CRUD — same contract-first shape as
 * PharmacyRepository. Implementations (e.g. a future
 * SQLitePrisma-backed one) live in a separate file and are swapped in at
 * the module's instance/bootstrap layer, never referenced here.
 */

export interface SupplierSelection {
  organizationId: string;

  supplierId: string;
  supplierName: string;

  unitPricePaise: number;
  gstBasisPoints: number;
  
  performanceScoreBasisPoints: number;
}

export interface ApprovalPolicySelection {
  approvalPolicyId: string;
  requiredRoleCode: string;
  requiredApprovals: number;
}

export interface WorkflowRunRecord {
  workflowRunId: string;
}

export interface PreparedActionRecord {
  preparedActionId: string;
}

export interface ApprovalRequestRecord {
  approvalRequestId: string;
}

/**
 * Request objects for the create* methods, kept separate from primitive
 * parameter lists so the interface can gain fields (e.g. new payload
 * metadata) without breaking every call site.
 */

export interface CreateWorkflowRunInput {
  organizationId: string;
  workflowType: string;
}

export interface CreatePreparedActionInput {
  workflowRunId: string;
  actionType: string;
  requesterType: string;
  requesterId?: string;
  amountPaise?: number;
  targetType: string;
  targetId: string;
  payloadJson: string;
  evidenceJson: string;
  reasoningSummary: string;
}

export interface CreateApprovalRequestInput {
  preparedActionId: string;
  approvalPolicyId: string;
}

export interface ProcurementRepository {
  /**
   * Selects the best supplier for a given catalog item. "Best" is an
   * implementation-level decision (price, performance score, compliance,
   * lead time, etc.) — the interface only guarantees a single selection
   * comes back.
   */
  findBestSupplierForItem(itemId: string): Promise<SupplierSelection>;

  /**
   * Finds the approval policy that governs an action of the given type at
   * the given amount (paise). Matching against amount ranges is an
   * implementation detail.
   */
  findApprovalPolicy(
    actionType: string,
    amountPaise: number
  ): Promise<ApprovalPolicySelection>;

  createWorkflowRun(input: CreateWorkflowRunInput): Promise<WorkflowRunRecord>;

  createPreparedAction(
    input: CreatePreparedActionInput
  ): Promise<PreparedActionRecord>;

  createApprovalRequest(
    input: CreateApprovalRequestInput
  ): Promise<ApprovalRequestRecord>;
}