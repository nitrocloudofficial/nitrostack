import { ToolDecorator as Tool, Widget, UseGuards, ExecutionContext, Injectable, RateLimit, z } from '@nitrostack/core';
import { JWTGuard } from '../../guards/jwt.guard.js';
import { InvoicesService } from '../../services/invoices.service.js';

// @Injectable({ deps: [...] }) is required here even though this is a tool
// controller, not a "service" — the DI container resolves controllers via
// container.resolve() too, and without explicit deps it falls back to TS
// design:paramtypes reflection, which only gets emitted for classes that
// carry a class-level decorator. Method-level @Tool() decorators don't
// trigger that emission, so without this the constructor silently runs with
// zero arguments and invoicesService is undefined.
@Injectable({ deps: [InvoicesService] })
export class InvoicesTools {
  constructor(private invoicesService: InvoicesService) {}

  @Tool({
    name: 'list_pending_invoices',
    description:
      'List invoices currently awaiting review and payment drafting. Only returns invoices with status "pending" — drafted, approved, rejected, blocked, and paid invoices are excluded. Optionally filter to a single vendor.',
    inputSchema: z.object({
      vendorId: z
        .string()
        .optional()
        .describe('Vendor ID to filter invoices by, e.g. "ACME-07". Omit to list pending invoices across all vendors.'),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .describe('Maximum number of invoices to return, most recently submitted first. Defaults to 20.'),
    }),
    examples: {
      request: { vendorId: 'ACME-07', limit: 10 },
      response: {
        invoices: [
          {
            id: 'INV-0001',
            vendorId: 'ACME-07',
            amount: 15000000,
            destinationAccount: '1000000001',
            invoiceDate: '2026-07-20',
            submittedAt: '2026-07-22T10:00:00+05:30',
            notes: 'Monthly maintenance',
            status: 'pending',
          },
        ],
      },
    },
  })
  // Deliberate product decision: invoice listing is read-only and
  // non-sensitive, so it's left publicly callable. All write tools
  // (draft_payment_batch, assess_payment_risk, request_approval,
  // execute_payment, get_audit_trail) remain fully guarded.
  @Widget('invoice-queue')
  async listPendingInvoices(input: any, ctx: ExecutionContext) {
    const invoices = this.invoicesService.listPending({
      vendorId: input.vendorId,
      limit: input.limit,
    });
    return { invoices };
  }

  @Tool({
    name: 'draft_payment_batch',
    description:
      'Bundle one or more pending invoices into a payment draft for risk assessment and approval. Marks the included invoices as "drafted". Does NOT execute any payment or require approval by itself.',
    inputSchema: z.object({
      invoiceIds: z
        .array(z.string())
        .min(1)
        .describe('IDs of pending invoices to include in the draft batch, e.g. ["INV-0001", "INV-0002"]. Every ID must reference an invoice currently in "pending" status.'),
    }),
  })
  @UseGuards(JWTGuard)
  @RateLimit({ requests: 10, window: '1m' })
  async draftPaymentBatch(input: any, ctx: ExecutionContext) {
    const createdBy = ctx.auth?.subject ?? 'unknown';
    return this.invoicesService.draftBatch(input.invoiceIds, createdBy);
  }
}
