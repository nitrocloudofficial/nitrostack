import { z } from 'zod';

// ─── Primitive Schemas ────────────────────────────────────────────────────────

export const InvoiceLineItemSchema = z.object({
  sku: z.string().describe('Product SKU'),
  description: z.string().describe('Product description'),
  quantity: z.number().describe('Quantity ordered'),
  unitPrice: z.number().describe('Unit price in USD'),
  total: z.number().describe('Line total (quantity × unitPrice)'),
});

export const ExtractedInvoiceSchema = z.object({
  invoiceNumber: z.string().describe('Invoice identifier'),
  poNumber: z.string().describe('Linked purchase order number'),
  vendor: z.string().describe('Vendor / supplier name'),
  invoiceDate: z.string().describe('ISO 8601 date string'),
  totalAmount: z.number().describe('Invoice grand total in USD'),
  lineItems: z.array(InvoiceLineItemSchema).describe('Line items on the invoice'),
});

export const PurchaseOrderSchema = z.object({
  poNumber: z.string().describe('Purchase order number'),
  vendor: z.string().describe('Vendor / supplier name'),
  sku: z.string().describe('Product SKU'),
  orderedQty: z.number().describe('Quantity ordered'),
  unitPrice: z.number().describe('Agreed unit price in USD'),
  hsCode: z.string().describe('HS tariff code'),
});

export const ValidationResultSchema = z.object({
  status: z.enum(['match', 'mismatch', 'exception']).describe('Validation outcome'),
  discrepancies: z.array(z.string()).describe('Human-readable discrepancy messages'),
  suggestedHsCode: z.string().optional().describe('Recommended HS code if missing'),
});

export const GoodsReceiptSchema = z.object({
  id: z.number().optional().describe('Auto-generated row id'),
  poNumber: z.string().describe('Linked purchase order number'),
  sku: z.string().describe('Product SKU'),
  receivedQty: z.number().describe('Quantity actually received'),
  receivedDate: z.string().describe('ISO 8601 receipt date'),
});

export const ThreeWayMatchResultSchema = z.object({
  matchType: z.enum(['two_way', 'three_way']).describe('Whether GR data was available'),
  status: z.enum(['match', 'mismatch', 'exception']).describe('Overall match status'),
  discrepancies: z.array(z.string()).describe('Human-readable discrepancy messages'),
  grNote: z.string().optional().describe('Note when falling back to two-way match'),
});

export const ApInvoiceResultSchema = z.object({
  invoiceNumber: z.string(),
  status: z
    .enum(['auto_approved', 'pending_approval', 'duplicate', 'exception', 'mismatch'])
    .describe('Final disposition of the invoice'),
  matchType: z.enum(['two_way', 'three_way']).optional(),
  discrepancies: z.array(z.string()).optional(),
  approverRole: z.string().optional().describe('Role required to approve (if not auto-approved)'),
  convertedAmount: z.number().optional().describe('Total amount in USD after FX conversion'),
  currency: z.string().optional().describe('Source currency (e.g. USD, EUR)'),
  idempotent: z.boolean().optional().describe('True when result was served from audit_log cache'),
  auditLogId: z.number().optional(),
  message: z.string().optional(),
});

export const WorkflowContextSchema = z.object({
  workflowId: z.string().describe('Workflow identifier'),
  currentStep: z.string().describe('Name of the current workflow step'),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'failed'])
    .describe('Workflow execution status'),
  data: z.any().describe('Arbitrary step payload'),
});

// ─── TypeScript Types ─────────────────────────────────────────────────────────

export type InvoiceLineItem      = z.infer<typeof InvoiceLineItemSchema>;
export type ExtractedInvoice     = z.infer<typeof ExtractedInvoiceSchema>;
export type PurchaseOrder        = z.infer<typeof PurchaseOrderSchema>;
export type ValidationResult     = z.infer<typeof ValidationResultSchema>;
export type WorkflowContext      = z.infer<typeof WorkflowContextSchema>;
export type GoodsReceipt         = z.infer<typeof GoodsReceiptSchema>;
export type ThreeWayMatchResult  = z.infer<typeof ThreeWayMatchResultSchema>;
export type ApInvoiceResult      = z.infer<typeof ApInvoiceResultSchema>;
