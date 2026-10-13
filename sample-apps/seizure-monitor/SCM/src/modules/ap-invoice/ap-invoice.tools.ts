import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ResourceDecorator,
  ExecutionContext,
  UseGuards,
  RateLimit,
  z,
} from '@nitrostack/core';

import { ApInvoiceService } from './ap-invoice.service.js';
import {
  ExtractedInvoiceSchema,
  PurchaseOrderSchema,
  GoodsReceiptSchema,
  ApInvoiceResultSchema,
  ThreeWayMatchResultSchema,
} from '../../shared/schemas.js';

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * ApInvoiceTools — MCP controller for the AP Invoice Automation module.
 *
 * Exposed tools (all protected by API-key guard):
 *   • ap_invoice_process_ap_invoice        — full pipeline: duplicate → match → FX → approval
 *   • ap_invoice_match_invoice_to_po       — standalone 2-way / 3-way match
 *   • ap_invoice_log_goods_receipt         — insert a goods receipt record
 *   • ap_invoice_get_invoice_status        — query invoices table by invoice number
 *   • ap_invoice_list_invoices             — paginated invoice list with optional status/vendor filter
 *   • ap_invoice_get_approval_thresholds   — read current approval threshold configuration
 *
 * Exposed resources:
 *   • ap-invoice://status                  — capability / health summary
 */
@Controller('ap_invoice')
export class ApInvoiceTools {
  constructor(private readonly apInvoice: ApInvoiceService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // process_ap_invoice
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'process_ap_invoice',
    description:
      'Full AP Invoice Automation pipeline for a single invoice: ' +
      '(1) idempotency guard — re-running with the same idempotencyKey returns the cached result, ' +
      '(2) duplicate detection — same invoice/vendor/amount within 30 days is rejected, ' +
      '(3) FX conversion to USD using the fx_rates table, ' +
      '(4) three-way match (PO ↔ Goods Receipt ↔ Invoice) — degrades to two-way if no GR is logged, ' +
      '(5) approval threshold routing (auto / finance_manager / cfo). ' +
      'Writes to the invoices, invoice_line_items, and audit_log tables.',
    inputSchema: z.object({
      invoice: ExtractedInvoiceSchema.describe('The extracted invoice data'),
      po: PurchaseOrderSchema.describe('The matched purchase order'),
      workflowId: z.string().describe('The workflow run ID (used for audit logging)'),
      currency: z
        .string()
        .default('USD')
        .describe('Invoice currency code (e.g. USD, EUR, GBP). Defaults to USD.'),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Optional idempotency key. If provided, a second call with the same key returns the cached result. ' +
          'Defaults to workflowId.',
        ),
    }),
    outputSchema: ApInvoiceResultSchema,
  })

  @RateLimit({ requests: 30, window: '1m' })
  async processApInvoice(
    input: {
      invoice: z.infer<typeof ExtractedInvoiceSchema>;
      po: z.infer<typeof PurchaseOrderSchema>;
      workflowId: string;
      currency?: string;
      idempotencyKey?: string;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger?.info(
      `[ap_invoice_process_ap_invoice] Processing invoice #${input.invoice.invoiceNumber}`,
    );

    const result = await this.apInvoice.processApInvoice({
      invoice: input.invoice,
      po: input.po,
      workflowId: input.workflowId,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
    });

    ctx.logger?.info(
      `[ap_invoice_process_ap_invoice] Result: ${result.status}${result.idempotent ? ' (idempotent)' : ''}`,
    );

    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // match_invoice_to_po (standalone — includes 3-way when GR exists)
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'match_invoice_to_po',
    description:
      'Standalone invoice-to-PO matching tool. ' +
      'If a goods receipt exists for the PO/SKU, performs a three-way match (PO ↔ GR ↔ Invoice). ' +
      'Falls back to two-way match when no GR is found. ' +
      'Does not write to the database — use process_ap_invoice for the full persisted pipeline.',
    inputSchema: z.object({
      invoice: ExtractedInvoiceSchema.describe('The extracted invoice'),
      po: PurchaseOrderSchema.describe('The purchase order to match against'),
    }),
    outputSchema: ThreeWayMatchResultSchema,
  })

  @RateLimit({ requests: 60, window: '1m' })
  async matchInvoiceToPO(
    input: {
      invoice: z.infer<typeof ExtractedInvoiceSchema>;
      po: z.infer<typeof PurchaseOrderSchema>;
    },
    ctx: ExecutionContext,
  ) {
    ctx.logger?.info(
      `[ap_invoice_match_invoice_to_po] Matching invoice #${input.invoice.invoiceNumber}`,
    );

    return this.apInvoice.matchInvoiceToPO(input.invoice, input.po);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // log_goods_receipt
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'log_goods_receipt',
    description:
      'Record a goods receipt against a purchase order. ' +
      'Once logged, subsequent process_ap_invoice or match_invoice_to_po calls for the same PO/SKU ' +
      'will automatically use this GR to perform a three-way match.',
    inputSchema: GoodsReceiptSchema.omit({ id: true }),
    outputSchema: z.object({
      logged: z.boolean(),
      message: z.string(),
    }),
  })

  @RateLimit({ requests: 60, window: '1m' })
  async logGoodsReceipt(
    input: z.infer<typeof GoodsReceiptSchema>,
    ctx: ExecutionContext,
  ) {
    ctx.logger?.info(
      `[ap_invoice_log_goods_receipt] Logging GR for PO ${input.poNumber}, SKU ${input.sku}`,
    );

    await this.apInvoice.logGoodsReceipt({
      poNumber: input.poNumber,
      sku: input.sku,
      receivedQty: input.receivedQty,
      receivedDate: input.receivedDate,
    });

    return {
      logged: true,
      message: `Goods receipt logged: PO ${input.poNumber}, SKU ${input.sku}, qty ${input.receivedQty} received on ${input.receivedDate}.`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // get_invoice_status
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_invoice_status',
    description:
      'Look up the current status of a processed invoice by its invoice number. ' +
      'Returns the full invoice row from the database (status, amounts, timestamps, etc.).',
    inputSchema: z.object({
      invoiceNumber: z.string().describe('The invoice number to look up'),
    }),
    outputSchema: z.object({
      found: z.boolean(),
      invoice: z.any().optional(),
    }),
  })

  @RateLimit({ requests: 120, window: '1m' })
  async getInvoiceStatus(
    input: { invoiceNumber: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger?.info(`[ap_invoice_get_invoice_status] Looking up invoice #${input.invoiceNumber}`);
    const invoice = await this.apInvoice.getInvoiceStatus(input.invoiceNumber);
    return { found: !!invoice, invoice: invoice ?? undefined };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // list_invoices
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'list_invoices',
    description:
      'List processed invoices from the database. ' +
      'Filter by status (e.g. auto_approved, pending_approval, mismatch, duplicate) and/or vendor. ' +
      'Supports pagination via limit and offset.',
    inputSchema: z.object({
      status: z
        .enum(['auto_approved', 'pending_approval', 'mismatch', 'duplicate', 'exception', 'pending'])
        .optional()
        .describe('Filter by invoice status'),
      vendor: z.string().optional().describe('Filter by vendor name (exact match)'),
      limit: z.number().int().min(1).max(200).default(50).describe('Max results to return'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    }),
    outputSchema: z.object({
      invoices: z.array(z.any()),
      count: z.number(),
    }),
  })

  @RateLimit({ requests: 60, window: '1m' })
  async listInvoices(
    input: { status?: string; vendor?: string; limit?: number; offset?: number },
    ctx: ExecutionContext,
  ) {
    ctx.logger?.info('[ap_invoice_list_invoices] Listing invoices');
    const invoices = await this.apInvoice.listInvoices(input);
    return { invoices, count: invoices.length };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // get_approval_thresholds
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_approval_thresholds',
    description:
      'Return the current approval threshold configuration. ' +
      'Shows which approver role is required at each amount tier (auto / finance_manager / cfo).',
    inputSchema: z.object({}),
    outputSchema: z.object({
      thresholds: z.array(
        z.object({
          amount: z.number().describe('Sample amount used to probe the threshold'),
          role: z.string().describe('Approver role for this amount'),
        }),
      ),
    }),
  })

  @RateLimit({ requests: 60, window: '1m' })
  async getApprovalThresholds(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger?.info('[ap_invoice_get_approval_thresholds] Reading approval thresholds');
    return this.apInvoice.getApprovalThresholds();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Resource: ap-invoice://status
  // ══════════════════════════════════════════════════════════════════════════

  @ResourceDecorator({
    uri: 'ap-invoice://status',
    name: 'AP Invoice Module Status',
    description: 'Returns the current status and capability summary of the AP Invoice Automation module.',
    mimeType: 'application/json',
  })
  async getStatus(_ctx: ExecutionContext) {
    return {
      module: 'ApInvoiceModule',
      version: '1.0.0',
      status: 'operational',
      tools: [
        'ap_invoice_process_ap_invoice',
        'ap_invoice_match_invoice_to_po',
        'ap_invoice_log_goods_receipt',
        'ap_invoice_get_invoice_status',
        'ap_invoice_list_invoices',
        'ap_invoice_get_approval_thresholds',
      ],
      features: [
        'idempotency via audit_log',
        'duplicate detection (30-day window)',
        'FX conversion via fx_rates table',
        'three-way match (PO ↔ GR ↔ Invoice)',
        'two-way fallback when no goods receipt',
        'approval threshold routing (auto / finance_manager / cfo)',
        'SQLite WAL mode with FK enforcement',
      ],
      timestamp: new Date().toISOString(),
    };
  }
}
