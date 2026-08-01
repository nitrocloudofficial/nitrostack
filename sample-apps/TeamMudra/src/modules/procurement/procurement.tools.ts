import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { procurementService } from './procurement.instance.js';
import { PrepareProcurementActionInputSchema } from './procurement.types.js';

/** MCP tools for the Procurement module. */
export class ProcurementTools {
  @Tool({
    name: 'prepare_procurement_action',
    description:
      'Prepare procurement workflows for pharmacy inventory recommendations. ' +
      'This tool does not create purchase orders directly. It prepares a ' +
      'WorkflowRun, PreparedAction, and ApprovalRequest awaiting ' +
      'administrator approval before execution.',
    inputSchema: PrepareProcurementActionInputSchema,
    examples: {
      request: {
        category: 'antibiotics',
        expiringWithinDays: 30
      },
      response: {
        actions: [
          {
            workflowRunId: 'WF-001',
            preparedActionId: 'PA-001',
            approvalRequestId: 'AR-001',
            approvalPolicyId: 'policy-purchase-low',
            itemName: 'Amoxicillin 500mg',
            supplierName: 'MedLife Supplies',
            quantity: 460,
            estimatedCostPaise: 1840000,
            requiredRoleCode: 'PROCUREMENT_OFFICER',
            requiredApprovals: 1,
            status: 'PENDING_APPROVAL'
          }
        ]
      }
    }
  })
  async prepareProcurementAction(input: unknown, ctx: ExecutionContext) {
    ctx.logger.info('Executing prepare_procurement_action', {
      category: (input as any)?.category,
      expiringWithinDays: (input as any)?.expiringWithinDays
    });

    const parsedInput = PrepareProcurementActionInputSchema.parse(input);
    const result = await procurementService.prepareProcurementActions(
      parsedInput
    );

    ctx.logger.info('Completed prepare_procurement_action', {
      preparedActions: result.actions.length
    });

    return result;
  }
}