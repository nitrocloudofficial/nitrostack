import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from '../../shared/database.service.js';
import type { PurchaseOrder, GoodsReceipt } from '../../shared/schemas.js';
import { ErpAdapter } from './erp.adapter.js';

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ deps: [DatabaseService, ErpAdapter] })
export class MasterDataService implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService,
    private readonly erpAdapter: ErpAdapter,
  ) {}

  async onModuleInit(): Promise<void> {
    console.error('[MasterDataService] Ready ✓');
  }

  // ─── ERP Master Data Queries (Delegated) ───────────────────────────────────

  async findPO(poNumber: string): Promise<PurchaseOrder | null> {
    return this.erpAdapter.findPO(poNumber);
  }

  async findBySku(sku: string): Promise<PurchaseOrder | null> {
    return this.erpAdapter.findBySku(sku);
  }

  async getAllPOs(): Promise<PurchaseOrder[]> {
    return this.erpAdapter.getAllPOs();
  }

  // ─── AP Invoice: invoices table ────────────────────────────────────────────

  async upsertInvoice(params: {
    invoiceNumber: string;
    poNumber?: string;
    vendor: string;
    invoiceDate?: string;
    totalAmount?: number;
    currency?: string;
    status: string;
    idempotencyKey?: string;
  }): Promise<void> {
    await this.database.sql(
      `INSERT INTO invoices
         (invoice_number, po_number, vendor, invoice_date, total_amount, currency, status, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(invoice_number) DO UPDATE SET
         status           = excluded.status,
         total_amount     = excluded.total_amount,
         idempotency_key  = excluded.idempotency_key`,
      params.invoiceNumber,
      params.poNumber ?? null,
      params.vendor,
      params.invoiceDate ?? null,
      params.totalAmount ?? null,
      params.currency ?? 'USD',
      params.status,
      params.idempotencyKey ?? null,
    );
  }

  async findInvoice(invoiceNumber: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.database.sql(
      'SELECT * FROM invoices WHERE invoice_number = ?',
      invoiceNumber,
    )) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  async listInvoices(params: { status?: string; vendor?: string; limit?: number; offset?: number }): Promise<Record<string, unknown>[]> {
    const conditions: string[] = [];
    const args: unknown[] = [];

    if (params.status) { conditions.push('status = ?'); args.push(params.status); }
    if (params.vendor) { conditions.push('vendor = ?'); args.push(params.vendor); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    args.push(params.limit ?? 50);
    args.push(params.offset ?? 0);

    return (await this.database.sql(
      `SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ...args,
    )) as Record<string, unknown>[];
  }

  async detectDuplicate(invoiceNumber: string, vendor: string, totalAmount: number): Promise<boolean> {
    const rows = (await this.database.sql(
      `SELECT COUNT(*) AS cnt FROM invoices
       WHERE invoice_number = ? AND vendor = ? AND ABS(total_amount - ?) < 0.01
         AND created_at >= datetime('now', '-30 days')`,
      invoiceNumber, vendor, totalAmount,
    )) as { cnt: number }[];
    return (rows[0]?.cnt ?? 0) > 0;
  }

  // ─── AP Invoice: invoice_line_items table ──────────────────────────────────

  async insertLineItems(invoiceNumber: string, items: Array<{
    sku: string; description: string; quantity: number; unitPrice: number; total: number;
  }>): Promise<void> {
    for (const item of items) {
      await this.database.sql(
        `INSERT INTO invoice_line_items (invoice_number, sku, description, quantity, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        invoiceNumber, item.sku, item.description, item.quantity, item.unitPrice, item.total,
      );
    }
  }

  // ─── AP Invoice: goods_receipts table ─────────────────────────────────────

  async insertGoodsReceipt(gr: Omit<GoodsReceipt, 'id'>): Promise<void> {
    await this.database.sql(
      `INSERT INTO goods_receipts (po_number, sku, received_qty, received_date)
       VALUES (?, ?, ?, ?)`,
      gr.poNumber, gr.sku, gr.receivedQty, gr.receivedDate,
    );
  }

  async findGoodsReceipt(poNumber: string, sku: string): Promise<GoodsReceipt | null> {
    return this.erpAdapter.findGoodsReceipt(poNumber, sku);
  }

  // ─── AP Invoice: exceptions table ─────────────────────────────────────────

  async insertException(params: {
    workflowId: string;
    invoiceNumber?: string;
    reason: string;
    discrepancies?: string[];
  }): Promise<number> {
    await this.database.sql(
      `INSERT INTO exceptions (workflow_id, invoice_number, reason, discrepancies)
       VALUES (?, ?, ?, ?)`,
      params.workflowId,
      params.invoiceNumber ?? null,
      params.reason,
      JSON.stringify(params.discrepancies ?? []),
    );
    const rows = (await this.database.sql('SELECT last_insert_rowid() AS id')) as { id: number }[];
    return rows[0]?.id ?? -1;
  }

  // ─── AP Invoice: audit_log table ──────────────────────────────────────────

  async appendAuditLog(params: {
    workflowId: string;
    toolName: string;
    inputHash: string;
    outputHash: string;
    actor?: string;
    payload?: unknown;
  }): Promise<number> {
    await this.database.sql(
      `INSERT INTO audit_log (workflow_id, tool_name, input_hash, output_hash, actor, payload)
       VALUES (?, ?, ?, ?, ?, ?)`,
      params.workflowId,
      params.toolName,
      params.inputHash,
      params.outputHash,
      params.actor ?? 'system',
      params.payload !== undefined ? JSON.stringify(params.payload) : null,
    );
    const rows = (await this.database.sql('SELECT last_insert_rowid() AS id')) as { id: number }[];
    return rows[0]?.id ?? -1;
  }

  async findAuditLogByIdempotencyKey(workflowId: string, toolName: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.database.sql(
      `SELECT * FROM audit_log WHERE workflow_id = ? AND tool_name = ? ORDER BY id DESC LIMIT 1`,
      workflowId, toolName,
    )) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  // ─── AP Invoice: fx_rates table ───────────────────────────────────────────

  async findFxRate(currencyPair: string): Promise<number | null> {
    return this.erpAdapter.findFxRate(currencyPair);
  }

  // ─── AP Invoice: approval_thresholds table ────────────────────────────────

  async getApprovalThreshold(amount: number): Promise<{ role: string } | null> {
    const thresholds = await this.erpAdapter.getApprovalThresholds();
    for (const t of thresholds) {
      if (amount >= t.min_amount && (t.max_amount === null || amount < t.max_amount)) {
        return { role: t.required_approver_role };
      }
    }
    return null;
  }
}
