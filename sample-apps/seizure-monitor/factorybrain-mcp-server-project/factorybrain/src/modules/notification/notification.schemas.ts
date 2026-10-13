import { z } from '@nitrostack/core';

export const approvedPlanSchema = z.object({
  workflowId: z.string().min(1), ticketId: z.string().min(1), machineId: z.string().min(1),
  approvedAt: z.string().datetime(), approvedBy: z.string().min(1), originalRequester: z.string().min(1),
  approval: z.object({ approvalId: z.string().min(1), status: z.literal('Approved') }).passthrough(),
  report: z.object({ reportId: z.string().min(1), workflowId: z.string().min(1) }).passthrough(),
  maintenance: z.object({ ticketId: z.string().min(1), assignedTeam: z.string().min(1) }).passthrough(),
  purchase: z.object({ purchaseRequestId: z.string().min(1), supplierName: z.string().min(1), totalCost: z.number().nonnegative() }).passthrough().optional(),
  production: z.object({ planId: z.string().min(1), plan: z.object({ orderChanges: z.array(z.unknown()) }).passthrough() }).passthrough(),
});
