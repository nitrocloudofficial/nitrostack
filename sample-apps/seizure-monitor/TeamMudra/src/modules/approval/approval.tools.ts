import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { approvalService } from './approval.instance.js';
import { ApprovePreparedActionInputSchema } from './approval.types.js';

/** MCP tools for the Approval module. */
export class ApprovalTools {
  @Tool({
    name: 'approve_prepared_action',
    description:
      'Administrator approves or rejects a prepared procurement action. ' +
      'Approved actions immediately execute and create Purchase Orders. ' +
      'Rejected actions close the workflow without execution.',
    inputSchema: ApprovePreparedActionInputSchema,
    examples: {
      request: {
        approvalRequestId: 'AR-001',
        approverId: 'user-042',
        decision: 'APPROVED',
        comments: 'Confirmed with pharmacy lead.'
      },
      response: {
        approvalRequestId: 'AR-001',
        preparedActionId: 'PA-001',
        purchaseOrderId: 'PO-001',
        actionExecutionId: 'AE-001',
        status: 'APPROVED',
        message: 'Purchase order PO-001 created for Amoxicillin 500mg from MedLife Supplies.'
      }
    }
  })
  async approvePreparedAction(input: unknown, ctx: ExecutionContext) {
    ctx.logger.info('Executing approve_prepared_action', {
      approvalRequestId: (input as any)?.approvalRequestId,
      approverId: (input as any)?.approverId,
      decision: (input as any)?.decision
    });

    const parsedInput = ApprovePreparedActionInputSchema.parse(input);
    const result = await approvalService.approvePreparedAction(parsedInput);

    ctx.logger.info('Completed approve_prepared_action', {
      approvalRequestId: result.approvalRequestId,
      status: result.status
    });

    return result;
  }
}