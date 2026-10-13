import { Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../shared/database.service.js';
import type { ExtractedInvoice } from '../../shared/schemas.js';

/**
 * InvoiceRepository — persists extracted invoices and line items to SQLite.
 *
 * Called by OrchestratorTools at the end of a successful execute_workflow
 * so the invoices table is populated for analytics queries.
 */
@Injectable({ deps: [DatabaseService] })
export class InvoiceRepository {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Upsert an invoice and its line items.
   * Uses INSERT OR REPLACE so re-running the same workflow doesn't duplicate rows.
   */
  async save(
    invoice:    ExtractedInvoice,
    status:     string,
    workflowId: string,
  ): Promise<void> {
    // Upsert the invoice header
    await this.database.sql(
      `INSERT INTO invoices
         (invoice_number, po_number, vendor, invoice_date, total_amount, status, workflow_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(invoice_number) DO UPDATE SET
         status      = excluded.status,
         workflow_id = excluded.workflow_id`,
      invoice.invoiceNumber,
      invoice.poNumber,
      invoice.vendor,
      invoice.invoiceDate,
      invoice.totalAmount,
      status,
      workflowId,
    );

    // Delete existing line items before re-inserting (handles re-processing)
    await this.database.sql(
      'DELETE FROM invoice_line_items WHERE invoice_number = ?',
      invoice.invoiceNumber,
    );

    for (const item of invoice.lineItems) {
      await this.database.sql(
        `INSERT INTO invoice_line_items
           (invoice_number, sku, description, quantity, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        invoice.invoiceNumber,
        item.sku,
        item.description,
        item.quantity,
        item.unitPrice,
        item.total,
      );
    }
  }

  /** Retrieve a single invoice with its line items. */
  async findByNumber(invoiceNumber: string): Promise<{
    invoice: Record<string, unknown> | null;
    lineItems: Record<string, unknown>[];
  }> {
    const invoiceRows = (await this.database.sql(
      'SELECT * FROM invoices WHERE invoice_number = ?',
      invoiceNumber,
    )) as Record<string, unknown>[];

    if (invoiceRows.length === 0) return { invoice: null, lineItems: [] };

    const lineItems = (await this.database.sql(
      'SELECT * FROM invoice_line_items WHERE invoice_number = ? ORDER BY id',
      invoiceNumber,
    )) as Record<string, unknown>[];

    return { invoice: invoiceRows[0]!, lineItems };
  }
}
