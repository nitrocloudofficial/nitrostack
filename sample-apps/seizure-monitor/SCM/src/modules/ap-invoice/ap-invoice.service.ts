import { Injectable } from '@nitrostack/core';
import { createHash } from 'node:crypto';
import { MasterDataService } from '../master-data/master-data.service.js';
import { ValidationService } from '../orchestrator/validation.service.js';
import type {
  ExtractedInvoice,
  PurchaseOrder,
  GoodsReceipt,
  ApInvoiceResult,
} from '../../shared/schemas.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256(obj: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(obj))
    .digest('hex')
    .slice(0, 16);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ deps: [MasterDataService, ValidationService] })
export class ApInvoiceService {
  constructor(
    private readonly masterData: MasterDataService,
    private readonly validation: ValidationService,
  ) {}

  // ── Full AP processing pipeline ─────────────────────────────────────────

  async processApInvoice(params: {
    invoice: ExtractedInvoice;
    po: PurchaseOrder;
    workflowId: string;
    currency?: string;
    idempotencyKey?: string;
  }): Promise<ApInvoiceResult> {
    const { invoice, po, workflowId, currency = 'USD', idempotencyKey } = params;

    // ── 1. Idempotency check ─────────────────────────────────────────────
    const iKey = idempotencyKey ?? workflowId;
    const existingLog = await this.masterData.findAuditLogByIdempotencyKey(
      iKey,
      'process_ap_invoice',
    );
    if (existingLog) {
      const cached = JSON.parse((existingLog['payload'] as string) ?? '{}') as ApInvoiceResult;
      return { ...cached, idempotent: true };
    }

    // ── 2. Duplicate detection ───────────────────────────────────────────
    const isDuplicate = await this.masterData.detectDuplicate(
      invoice.invoiceNumber,
      invoice.vendor,
      invoice.totalAmount,
    );

    if (isDuplicate) {
      const result: ApInvoiceResult = {
        invoiceNumber: invoice.invoiceNumber,
        status: 'duplicate',
        message:
          `Invoice ${invoice.invoiceNumber} from ${invoice.vendor} ` +
          `for $${invoice.totalAmount} was already processed within the last 30 days.`,
      };
      await this._writeAuditLog(iKey, invoice, result);
      return result;
    }

    // ── 3. FX conversion ────────────────────────────────────────────────
    let convertedAmount = invoice.totalAmount;
    if (currency !== 'USD') {
      const pair = `${currency}/USD`;
      const rate = await this.masterData.findFxRate(pair);
      if (rate) {
        convertedAmount = invoice.totalAmount * rate;
      } else {
        console.warn(
          `[ApInvoiceService] No FX rate for ${pair}, defaulting to 1:1 (assuming USD)`,
        );
      }
    }

    // ── 4. Three-way match (degrades to two-way if no GR) ───────────────
    const sku = invoice.lineItems[0]?.sku ?? po.sku;
    const gr: GoodsReceipt | null = await this.masterData.findGoodsReceipt(
      po.poNumber,
      sku,
    );

    const matchResult = this.validation.threeWayMatch(invoice, po, gr);

    // ── 5. Persist invoice row ───────────────────────────────────────────
    const invoiceStatus =
      matchResult.status === 'mismatch' ? 'mismatch' : 'pending_approval';

    await this.masterData.upsertInvoice({
      invoiceNumber: invoice.invoiceNumber,
      poNumber: po.poNumber,
      vendor: invoice.vendor,
      invoiceDate: invoice.invoiceDate,
      totalAmount: convertedAmount,
      currency,
      status: invoiceStatus,
      idempotencyKey: iKey,
    });

    // Persist line items
    await this.masterData.insertLineItems(
      invoice.invoiceNumber,
      invoice.lineItems,
    );

    // ── 6. Handle mismatch ───────────────────────────────────────────────
    if (matchResult.status === 'mismatch') {
      await this.masterData.insertException({
        workflowId,
        invoiceNumber: invoice.invoiceNumber,
        reason: 'Invoice/PO mismatch detected by AP Invoice Automation',
        discrepancies: matchResult.discrepancies,
      });

      const result: ApInvoiceResult = {
        invoiceNumber: invoice.invoiceNumber,
        status: 'mismatch',
        matchType: matchResult.matchType,
        discrepancies: matchResult.discrepancies,
        convertedAmount,
        currency,
        message: `Mismatch on ${matchResult.matchType} check. Routed to finance team for review.`,
      };
      await this._writeAuditLog(iKey, invoice, result);
      return result;
    }

    // ── 7. Approval threshold routing ───────────────────────────────────
    const threshold = await this.masterData.getApprovalThreshold(convertedAmount);
    const approverRole = threshold?.role ?? 'finance_manager'; // safe default

    let finalStatus: ApInvoiceResult['status'];
    let message: string;

    if (approverRole === 'auto') {
      finalStatus = 'auto_approved';
      message = `Invoice ${invoice.invoiceNumber} auto-approved (amount $${convertedAmount.toFixed(2)} is below auto-approval threshold).`;
    } else {
      finalStatus = 'pending_approval';
      message =
        `Invoice ${invoice.invoiceNumber} pending approval by ${approverRole} ` +
        `(amount $${convertedAmount.toFixed(2)}).`;
    }

    await this.masterData.upsertInvoice({
      invoiceNumber: invoice.invoiceNumber,
      poNumber: po.poNumber,
      vendor: invoice.vendor,
      invoiceDate: invoice.invoiceDate,
      totalAmount: convertedAmount,
      currency,
      status: finalStatus,
      idempotencyKey: iKey,
    });

    const result: ApInvoiceResult = {
      invoiceNumber: invoice.invoiceNumber,
      status: finalStatus,
      matchType: matchResult.matchType,
      discrepancies: [],
      approverRole: approverRole === 'auto' ? undefined : approverRole,
      convertedAmount,
      currency,
      message,
    };

    await this._writeAuditLog(iKey, invoice, result);
    return result;
  }

  // ── Goods receipt logging ───────────────────────────────────────────────

  async logGoodsReceipt(gr: Omit<GoodsReceipt, 'id'>): Promise<void> {
    await this.masterData.insertGoodsReceipt(gr);
  }

  // ── Standalone three-way match (no DB writes) ────────────────────────────

  async matchInvoiceToPO(
    invoice: ExtractedInvoice,
    po: PurchaseOrder,
  ) {
    const sku = invoice.lineItems[0]?.sku ?? po.sku;
    const gr = await this.masterData.findGoodsReceipt(po.poNumber, sku);
    return this.validation.threeWayMatch(invoice, po, gr);
  }

  // ── Invoice status lookup ───────────────────────────────────────────────

  async getInvoiceStatus(invoiceNumber: string): Promise<Record<string, unknown> | null> {
    return this.masterData.findInvoice(invoiceNumber);
  }

  // ── Invoice list ────────────────────────────────────────────────────────

  async listInvoices(params: {
    status?: string;
    vendor?: string;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, unknown>[]> {
    return this.masterData.listInvoices(params);
  }

  // ── Approval thresholds ─────────────────────────────────────────────────

  async getApprovalThresholds(): Promise<Record<string, unknown>> {
    // Returns the effective threshold buckets by probing known amounts
    const probes: Array<[number, string]> = [
      [0,       'auto'],
      [5_000,   'finance_manager'],
      [50_000,  'cfo'],
    ];
    const resolved = await Promise.all(
      probes.map(async ([amount]) => ({
        amount,
        role: (await this.masterData.getApprovalThreshold(amount))?.role ?? 'unknown',
      })),
    );
    return { thresholds: resolved };
  }

  // ── Private: write audit log ────────────────────────────────────────────

  private async _writeAuditLog(
    workflowId: string,
    invoice: ExtractedInvoice,
    result: ApInvoiceResult,
  ): Promise<void> {
    const auditLogId = await this.masterData.appendAuditLog({
      workflowId,
      toolName: 'process_ap_invoice',
      inputHash: sha256({ invoiceNumber: invoice.invoiceNumber, vendor: invoice.vendor }),
      outputHash: sha256(result),
      actor: 'system',
      payload: result,
    });
    result.auditLogId = auditLogId;
  }
}
