import { z } from "@nitrostack/core";
import {
  ApprovalRepository,
  ApprovalRequestContext,
} from "./approval.repository.js";
import {
  ApprovePreparedActionInput,
  ApprovePreparedActionOutput,
} from "./approval.types.js";

/**
 * ---------------------------------------------------------------------------
 * Procurement PreparedAction payload shape
 * ---------------------------------------------------------------------------
 * This mirrors what ProcurementService writes into PreparedAction.payloadJson
 * (per HANDOFF.md: itemId, itemName, supplierId, supplierName, quantity,
 * unitPricePaise, gstBasisPoints, estimatedCostPaise). ApprovalService parses
 * ONLY this payload to execute — no repository lookups for supplier/GST/price
 * at approval time, per the agreed design.
 */
const ProcurementPayloadSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  quantity: z.number().int().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  gstBasisPoints: z.number().int().nonnegative(),
  estimatedCostPaise: z.number().int().nonnegative(),
});

type ProcurementPayload = z.infer<typeof ProcurementPayloadSchema>;

/**
 * Status vocabulary used across PreparedAction / WorkflowRun / ActionExecution.
 * Kept local to the service since these are plain strings in the schema
 * (not Prisma enums) — single source of truth for the literals used below.
 */
const PreparedActionStatus = {
  EXECUTED: "EXECUTED",
  REJECTED: "REJECTED",
  EXECUTION_FAILED: "EXECUTION_FAILED",
} as const;

const WorkflowRunStatus = {
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
} as const;

const ActionExecutionStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

/**
 * DESIGN NOTE: payload does not carry an expected delivery date (not part of
 * the agreed payloadJson shape in HANDOFF.md). Defaulting to +7 days from
 * approval time here rather than inventing a repository lookup. Flagging
 * this as an assumption — adjust if procurement should supply it instead.
 */
const DEFAULT_EXPECTED_DELIVERY_DAYS = 7;

export class ApprovalService {
  constructor(private readonly approvalRepository: ApprovalRepository) {}

  async approvePreparedAction(
    input: ApprovePreparedActionInput
  ): Promise<ApprovePreparedActionOutput> {
    const context = await this.approvalRepository.getApprovalRequestContext(
      input.approvalRequestId
    );

    switch (input.decision) {
      case "APPROVED":
        return this.handleApproved(input, context);
      case "REJECTED":
        return this.handleRejected(input, context);
      default:
        throw new Error(
          `Unrecognized approval decision: ${String(
            (input as { decision?: unknown }).decision
          )}`
        );
    }
  }

  private async handleApproved(
    input: ApprovePreparedActionInput,
    context: ApprovalRequestContext
  ): Promise<ApprovePreparedActionOutput> {
    await this.approvalRepository.recordApprovalDecision({
      approvalRequestId: context.approvalRequestId,
      approverUserId: input.approverId,
      decision: "APPROVED",
      rationale: input.comments ?? "",
    });

    let payload: ProcurementPayload;
    try {
      payload = ProcurementPayloadSchema.parse(
        JSON.parse(context.payloadJson)
      );
    } catch (err) {
      // Payload is malformed — execution cannot proceed. This is an
      // EXECUTION failure, not a REJECTION of the approval: the
      // administrator's decision to approve stands. Approval status and
      // execution status track separate stages of the workflow, so the
      // ApprovalRequest still resolves as APPROVED and the decision record
      // stays APPROVED — only the PreparedAction/WorkflowRun reflect that
      // execution did not complete.
      await this.approvalRepository.updatePreparedActionStatus({
        preparedActionId: context.preparedActionId,
        status: PreparedActionStatus.EXECUTION_FAILED,
      });
      await this.approvalRepository.createActionExecution({
        preparedActionId: context.preparedActionId,
        status: ActionExecutionStatus.FAILED,
        errorMessage: `Failed to parse PreparedAction payloadJson: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
      await this.approvalRepository.resolveApprovalRequest({
        approvalRequestId: context.approvalRequestId,
        status: "APPROVED",
      });
      await this.approvalRepository.completeWorkflowRun({
        workflowRunId: context.workflowRunId,
        status: WorkflowRunStatus.FAILED,
      });

      return {
        approvalRequestId: context.approvalRequestId,
        preparedActionId: context.preparedActionId,
        purchaseOrderId: null,
        actionExecutionId: null,
        status: "APPROVED",
        message:
          "Request was approved, but execution failed: PreparedAction payload could not be parsed.",
      };
    }

    const expectedAt = new Date();
    expectedAt.setDate(
      expectedAt.getDate() + DEFAULT_EXPECTED_DELIVERY_DAYS
    );

    const purchaseOrder = await this.approvalRepository.createPurchaseOrder({
      supplierId: payload.supplierId,
      itemId: payload.itemId,
      quantity: payload.quantity,
      unitPricePaise: payload.unitPricePaise,
      gstBasisPoints: payload.gstBasisPoints,
      expectedAt,
    });

    const actionExecution = await this.approvalRepository.createActionExecution(
      {
        preparedActionId: context.preparedActionId,
        status: ActionExecutionStatus.SUCCESS,
        resultType: "PurchaseOrder",
        resultId: purchaseOrder.purchaseOrderId,
      }
    );

    await this.approvalRepository.updatePreparedActionStatus({
      preparedActionId: context.preparedActionId,
      status: PreparedActionStatus.EXECUTED,
    });

    await this.approvalRepository.resolveApprovalRequest({
      approvalRequestId: context.approvalRequestId,
      status: "APPROVED",
    });

    await this.approvalRepository.completeWorkflowRun({
      workflowRunId: context.workflowRunId,
      status: WorkflowRunStatus.COMPLETED,
    });

    return {
      approvalRequestId: context.approvalRequestId,
      preparedActionId: context.preparedActionId,
      purchaseOrderId: purchaseOrder.purchaseOrderId,
      actionExecutionId: actionExecution.actionExecutionId,
      status: "APPROVED",
      message: `Purchase order ${purchaseOrder.purchaseOrderId} created for ${payload.itemName} from ${payload.supplierName}.`,
    };
  }

  private async handleRejected(
    input: ApprovePreparedActionInput,
    context: ApprovalRequestContext
  ): Promise<ApprovePreparedActionOutput> {
    await this.approvalRepository.recordApprovalDecision({
      approvalRequestId: context.approvalRequestId,
      approverUserId: input.approverId,
      decision: "REJECTED",
      rationale: input.comments ?? "",
    });

    await this.approvalRepository.updatePreparedActionStatus({
      preparedActionId: context.preparedActionId,
      status: PreparedActionStatus.REJECTED,
    });

    await this.approvalRepository.resolveApprovalRequest({
      approvalRequestId: context.approvalRequestId,
      status: "REJECTED",
    });

    await this.approvalRepository.completeWorkflowRun({
      workflowRunId: context.workflowRunId,
      status: WorkflowRunStatus.REJECTED,
    });

    return {
      approvalRequestId: context.approvalRequestId,
      preparedActionId: context.preparedActionId,
      purchaseOrderId: null,
      actionExecutionId: null,
      status: "REJECTED",
      message: "Prepared action rejected by approver.",
    };
  }
}