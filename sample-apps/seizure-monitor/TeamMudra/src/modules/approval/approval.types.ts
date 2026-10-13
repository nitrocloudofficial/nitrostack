import { z } from "@nitrostack/core";

/**
 * ---------------------------------------------------------------------------
 * MCP tool input schema
 * ---------------------------------------------------------------------------
 * Requires only what an administrator actually provides when approving:
 * which request they're deciding on, who they are, and an optional note.
 * How that decision translates into execution (purchase order creation,
 * action execution record, etc.) is entirely the service layer's concern.
 */
export const ApprovePreparedActionInputSchema = z.object({
  approvalRequestId: z.string().describe(
    "ID of the ApprovalRequest being decided on."
  ),

  approverId: z.string().describe(
    "ID of the administrator making the decision."
  ),

  decision: z
    .enum(["APPROVED", "REJECTED"])
    .describe(
      "Administrator decision for the approval request."
    ),

  comments: z
    .string()
    .optional()
    .describe(
      "Optional rationale or notes from the approver."
    ),
});

export type ApprovePreparedActionInput = z.infer<
  typeof ApprovePreparedActionInputSchema
>;

/**
 * ---------------------------------------------------------------------------
 * Execution outcome
 * ---------------------------------------------------------------------------
 * Execution happens synchronously as part of approval — there is no
 * separate "pending execution" state or execution tool. An approval either
 * results in immediate execution (APPROVED) or does not proceed (REJECTED).
 */
export type ApprovalExecutionStatus = "APPROVED" | "REJECTED";

export interface ApprovePreparedActionOutput {
  approvalRequestId: string;
  preparedActionId: string;
  purchaseOrderId: string | null;
  actionExecutionId: string | null;

  status: ApprovalExecutionStatus;
  message: string;
}