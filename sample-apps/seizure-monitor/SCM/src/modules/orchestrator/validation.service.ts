import { Injectable } from '@nitrostack/core';
import type {
  ExtractedInvoice,
  PurchaseOrder,
  ValidationResult,
  GoodsReceipt,
  ThreeWayMatchResult,
} from '../../shared/schemas.js';

const PRICE_TOLERANCE = 0.01; // 1%

@Injectable()
export class ValidationService {
  // ── Two-way match: PO ↔ Invoice (price + qty) ─────────────────────────────

  matchInvoiceToPO(
    invoice: ExtractedInvoice,
    po: PurchaseOrder,
  ): ValidationResult {
    const discrepancies: string[] = [];

    // Match each invoice line item against the PO
    for (const item of invoice.lineItems) {
      if (item.sku !== po.sku) continue; // different product, skip

      const priceDiff = Math.abs(item.unitPrice - po.unitPrice) / po.unitPrice;
      if (priceDiff > PRICE_TOLERANCE) {
        discrepancies.push(
          `Unit price for SKU ${item.sku}: expected $${po.unitPrice.toFixed(2)}, got $${item.unitPrice.toFixed(2)}`,
        );
      }

      const qtyDiff = Math.abs(item.quantity - po.orderedQty) / po.orderedQty;
      if (qtyDiff > PRICE_TOLERANCE) {
        discrepancies.push(
          `Quantity for SKU ${item.sku}: expected ${po.orderedQty}, got ${item.quantity}`,
        );
      }
    }

    const status: ValidationResult['status'] =
      discrepancies.length === 0 ? 'match' : 'mismatch';

    return { status, discrepancies };
  }

  // ── Three-way match: PO ↔ Goods Receipt ↔ Invoice ────────────────────────
  //
  // Degrades gracefully to two-way when `gr` is null (GR not yet logged).

  threeWayMatch(
    invoice: ExtractedInvoice,
    po: PurchaseOrder,
    gr: GoodsReceipt | null,
  ): ThreeWayMatchResult {
    if (!gr) {
      // No GR available — fall back to two-way match
      const twoWay = this.matchInvoiceToPO(invoice, po);
      return {
        matchType: 'two_way',
        status: twoWay.status,
        discrepancies: twoWay.discrepancies,
        grNote: 'No goods receipt found for this PO/SKU. Fell back to two-way match.',
      };
    }

    const discrepancies: string[] = [];

    for (const item of invoice.lineItems) {
      if (item.sku !== po.sku) continue;

      // Price check: invoice vs PO agreed price
      const priceDiff = Math.abs(item.unitPrice - po.unitPrice) / po.unitPrice;
      if (priceDiff > PRICE_TOLERANCE) {
        discrepancies.push(
          `[PO↔INV] Unit price for SKU ${item.sku}: PO agreed $${po.unitPrice.toFixed(2)}, invoiced $${item.unitPrice.toFixed(2)}`,
        );
      }

      // Qty check: invoice vs GR received qty
      if (gr.sku === item.sku) {
        const grQtyDiff = Math.abs(item.quantity - gr.receivedQty) / gr.receivedQty;
        if (grQtyDiff > PRICE_TOLERANCE) {
          discrepancies.push(
            `[GR↔INV] Quantity for SKU ${item.sku}: GR received ${gr.receivedQty}, invoiced ${item.quantity}`,
          );
        }
      }

      // Qty check: GR received vs PO ordered qty
      if (gr.sku === item.sku) {
        const poGrDiff = Math.abs(gr.receivedQty - po.orderedQty) / po.orderedQty;
        if (poGrDiff > PRICE_TOLERANCE) {
          discrepancies.push(
            `[PO↔GR] Quantity for SKU ${item.sku}: PO ordered ${po.orderedQty}, GR received ${gr.receivedQty}`,
          );
        }
      }
    }

    const status: ThreeWayMatchResult['status'] =
      discrepancies.length === 0 ? 'match' : 'mismatch';

    return { matchType: 'three_way', status, discrepancies };
  }
}
