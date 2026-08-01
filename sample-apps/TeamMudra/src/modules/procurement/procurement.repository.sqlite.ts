import { randomUUID } from "crypto";
import { prisma } from "../../data/client.js";
import {
  ProcurementRepository,
  SupplierSelection,
  ApprovalPolicySelection,
  WorkflowRunRecord,
  PreparedActionRecord,
  ApprovalRequestRecord,
  CreateWorkflowRunInput,
  CreatePreparedActionInput,
  CreateApprovalRequestInput,
} from "./procurement.repository.js";

/**
 * SQLite/Prisma-backed ProcurementRepository. Persistence and simple
 * deterministic lookups only — no business logic (that belongs in
 * ProcurementService).
 */
export class SQLiteProcurementRepository implements ProcurementRepository {
  async findBestSupplierForItem(itemId: string): Promise<SupplierSelection> {
    const best = await prisma.supplierItem.findFirst({
        where: {
            itemId,
            supplier: { active: true },
        },
        include: {
            supplier: true,
        },
        orderBy: [
            { supplier: { performanceScoreBasisPoints: "desc" } },
            { unitPricePaise: "asc" },
        ],
    });

    if (!best) {
        throw new Error(`No active supplier found for item: ${itemId}`);
    }

    return {
        organizationId: best.supplier.organizationId,

        supplierId: best.supplier.id,
        supplierName: best.supplier.name,
        unitPricePaise: best.unitPricePaise,
        performanceScoreBasisPoints: best.supplier.performanceScoreBasisPoints,
        gstBasisPoints: best.gstBasisPoints,
        };
    }
  

  async findApprovalPolicy(
    actionType: string,
    amountPaise: number
  ): Promise<ApprovalPolicySelection> {
    const policy = await prisma.approvalPolicy.findFirst({
      where: {
        active: true,
        actionType,
        minimumAmountPaise: { lte: amountPaise },
        OR: [
          { maximumAmountPaise: null },
          { maximumAmountPaise: { gte: amountPaise } },
        ],
      },
    });

    if (!policy) {
      throw new Error(
        `No approval policy found for actionType "${actionType}" at amount ${amountPaise} paise`
      );
    }

    return {
      approvalPolicyId: policy.id,
      requiredRoleCode: policy.requiredRoleCode,
      requiredApprovals: policy.requiredApprovals,
    };
  }

  async createWorkflowRun(
    input: CreateWorkflowRunInput
  ): Promise<WorkflowRunRecord> {
    const id = randomUUID();
    const now = new Date();

    const workflowRun = await prisma.workflowRun.create({
      data: {
        id,
        organizationId: input.organizationId,
        code: `WF-${id}`,
        workflowType: input.workflowType,
        status: "PENDING",
        startedAt: now,
        correlationId: randomUUID(),
      },
    });

    return { workflowRunId: workflowRun.id };
  }

  async createPreparedAction(
    input: CreatePreparedActionInput
  ): Promise<PreparedActionRecord> {
    const id = randomUUID();
    const now = new Date();

    const preparedAction = await prisma.preparedAction.create({
      data: {
        id,
        code: `PA-${id}`,
        workflowRunId: input.workflowRunId,
        actionType: input.actionType,
        requesterType: input.requesterType,
        requesterId: input.requesterId,
        status: "PENDING_APPROVAL",
        amountPaise: input.amountPaise,
        targetType: input.targetType,
        targetId: input.targetId,
        payloadJson: input.payloadJson,
        evidenceJson: input.evidenceJson,
        reasoningSummary: input.reasoningSummary,
        preparedAt: now,
      },
    });

    return { preparedActionId: preparedAction.id };
  }

  async createApprovalRequest(
    input: CreateApprovalRequestInput
  ): Promise<ApprovalRequestRecord> {
    const id = randomUUID();
    const now = new Date();

    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        id,
        code: `AR-${id}`,
        preparedActionId: input.preparedActionId,
        approvalPolicyId: input.approvalPolicyId,
        status: "PENDING",
        requestedAt: now,
      },
    });

    return { approvalRequestId: approvalRequest.id };
  }
}