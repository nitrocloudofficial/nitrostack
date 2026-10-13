import { randomUUID } from "crypto";
import { prisma } from "../../data/client.js";
import {
  ApprovalRepository,
  ApprovalRequestContext,
  ApprovalDecisionRecord,
  PurchaseOrderRecord,
  ActionExecutionRecord,
  RecordApprovalDecisionInput,
  ResolveApprovalRequestInput,
  UpdatePreparedActionStatusInput,
  CreatePurchaseOrderInput,
  CreateActionExecutionInput,
  CompleteWorkflowRunInput,
} from "./approval.repository.js";

/**
 * SQLite/Prisma-backed ApprovalRepository. Persistence only — no pricing,
 * GST, or supplier lookups here; the approval flow runs entirely off the
 * PreparedAction's payloadJson, resolved by ApprovalService. Single-approver
 * semantics: existingApprovalCount is reported for context but this
 * repository does not enforce multi-approval thresholds itself.
 */
export class SQLiteApprovalRepository implements ApprovalRepository {
  async getApprovalRequestContext(
    approvalRequestId: string
  ): Promise<ApprovalRequestContext> {
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { preparedAction: true, approvalPolicy: true },
    });

    if (!approvalRequest) {
      throw new Error(`Approval request not found: ${approvalRequestId}`);
    }

    const existingApprovalCount = await prisma.approvalDecision.count({
      where: { approvalRequestId },
    });

    return {
      approvalRequestId: approvalRequest.id,
      preparedActionId: approvalRequest.preparedAction.id,
      approvalPolicyId: approvalRequest.approvalPolicy.id,
      requiredApprovals: approvalRequest.approvalPolicy.requiredApprovals,
      existingApprovalCount,
      workflowRunId: approvalRequest.preparedAction.workflowRunId,
      targetType: approvalRequest.preparedAction.targetType,
      targetId: approvalRequest.preparedAction.targetId,
      payloadJson: approvalRequest.preparedAction.payloadJson,
      amountPaise: approvalRequest.preparedAction.amountPaise,
    };
  }

  async recordApprovalDecision(
    input: RecordApprovalDecisionInput
  ): Promise<ApprovalDecisionRecord> {
    const decision = await prisma.approvalDecision.create({
      data: {
        id: randomUUID(),
        approvalRequestId: input.approvalRequestId,
        approverUserId: input.approverUserId,
        decision: input.decision,
        rationale: input.rationale,
        decidedAt: new Date(),
      },
    });

    return { approvalDecisionId: decision.id };
  }

  async resolveApprovalRequest(
    input: ResolveApprovalRequestInput
  ): Promise<void> {
    await prisma.approvalRequest.update({
      where: { id: input.approvalRequestId },
      data: { status: input.status, resolvedAt: new Date() },
    });
  }

  async updatePreparedActionStatus(
    input: UpdatePreparedActionStatusInput
  ): Promise<void> {
    await prisma.preparedAction.update({
      where: { id: input.preparedActionId },
      data: { status: input.status },
    });
  }

  async createPurchaseOrder(
    input: CreatePurchaseOrderInput
  ): Promise<PurchaseOrderRecord> {
    const id = randomUUID();
    const now = new Date();

    const subtotalPaise = input.unitPricePaise * input.quantity;
    const gstPaise = Math.round(
      (subtotalPaise * input.gstBasisPoints) / 10000
    );
    const totalPaise = subtotalPaise + gstPaise;

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        id,
        code: `PO-${id}`,
        supplierId: input.supplierId,
        status: "CREATED",
        orderedAt: now,
        expectedAt: input.expectedAt,
        subtotalPaise,
        gstPaise,
        totalPaise,
        lines: {
          create: [
            {
              id: randomUUID(),
              lineNumber: 1,
              itemId: input.itemId,
              orderedBaseUnits: input.quantity,
              unitPricePaise: input.unitPricePaise,
              gstBasisPoints: input.gstBasisPoints,
              lineSubtotalPaise: subtotalPaise,
            },
          ],
        },
      },
    });

    return { purchaseOrderId: purchaseOrder.id };
  }

  async createActionExecution(
    input: CreateActionExecutionInput
  ): Promise<ActionExecutionRecord> {
    const id = randomUUID();
    const now = new Date();

    const actionExecution = await prisma.actionExecution.create({
      data: {
        id,
        code: `AE-${id}`,
        preparedActionId: input.preparedActionId,
        status: input.status,
        startedAt: now,
        completedAt: now,
        resultType: input.resultType,
        resultId: input.resultId,
        errorMessage: input.errorMessage,
      },
    });

    return { actionExecutionId: actionExecution.id };
  }

  async completeWorkflowRun(input: CompleteWorkflowRunInput): Promise<void> {
    await prisma.workflowRun.update({
      where: { id: input.workflowRunId },
      data: { status: input.status, completedAt: new Date() },
    });
  }
}