import { z } from '@nitrostack/core';

export const maintenanceSummarySchema = z.object({
  ticketId: z.string().min(1), machineId: z.string().min(1), likelyCause: z.string().min(1),
  requiredPart: z.string().min(1), estimatedRepairHours: z.number().nonnegative(), assignedTeam: z.string().min(1),
  urgency: z.enum(['Low', 'Medium', 'High', 'Critical']),
});

export const inventorySummarySchema = z.object({
  ticketId: z.string().min(1), machineId: z.string().min(1),
  decision: z.enum(['in_stock', 'low_stock', 'out_of_stock']), requestedQuantity: z.number().positive(),
  availableQuantity: z.number().nonnegative(), warehouseLocation: z.string().optional(), reorderRequired: z.boolean(),
});

export const purchaseSummarySchema = z.object({
  ticketId: z.string().min(1), purchaseRequestId: z.string().min(1), supplierId: z.string().min(1),
  supplierName: z.string().min(1), totalCost: z.number().nonnegative(), expectedDeliveryDate: z.string().min(1),
  recommendation: z.any(),
});

export const productionSummarySchema = z.object({
  ticketId: z.string().min(1), planId: z.string().min(1), affectedOrderCount: z.number().int().nonnegative(),
  totalDelayHours: z.number().nonnegative(), plan: z.any(),
});

export const approvalDecisionSchema = z.object({
  approvalId: z.string().min(1),
  action: z.enum(['Approve', 'Reject', 'Request Changes']),
  decidedBy: z.string().min(1),
  comments: z.string().optional(),
}).superRefine((value, context) => {
  if (value.action !== 'Approve' && !value.comments?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['comments'], message: 'Comments are required for rejection or changes' });
  }
});
