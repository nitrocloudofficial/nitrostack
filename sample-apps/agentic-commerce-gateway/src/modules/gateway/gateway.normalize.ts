import type { NormalizedOrder, Product } from './gateway.types.js';
import type { AcpPayload, RawOrderPayload, X402Payload } from '../../fixtures/orders.js';

/**
 * Protocol normalization.
 *
 * The gateway supports two wire formats with different field names, different
 * nesting, and different amounts of information (x402 carries a declared
 * settlement amount and a payee; ACP carries neither). Everything downstream —
 * screening, scoring, verification — consumes only `NormalizedOrder`, so the
 * evidence path is chosen exactly once, here.
 */

export class UnknownSkuError extends Error {
  constructor(sku: string) {
    super(`Unknown SKU "${sku}" — not in the NovaGear catalog`);
    this.name = 'UnknownSkuError';
  }
}

function isX402(payload: RawOrderPayload): payload is X402Payload {
  return payload.protocol === 'x402';
}

function buildItems(
  lines: Array<{ sku: string; qty: number }>,
  catalog: Map<string, Product>,
) {
  return lines.map((line) => {
    const product = catalog.get(line.sku);
    if (!product) throw new UnknownSkuError(line.sku);
    return {
      sku: product.sku,
      name: product.name,
      qty: line.qty,
      unitPriceMinor: product.priceMinor,
      lineTotalMinor: product.priceMinor * line.qty,
    };
  });
}

export function normalizeOrder(
  payload: RawOrderPayload,
  catalog: Map<string, Product>,
  receivedAt = new Date().toISOString(),
): NormalizedOrder {
  const evidencePath: string[] = [];

  if (isX402(payload)) {
    evidencePath.push('protocol=x402 → settlement-bearing payload');

    const items = buildItems(payload.line_items, catalog);
    const catalogTotal = items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
    const declaredTotal = payload.payment_required.amount_minor;

    evidencePath.push(
      `catalog repriced ${items.length} line item(s) → ${catalogTotal} minor units`,
    );

    if (declaredTotal !== catalogTotal) {
      evidencePath.push(
        `⚠ declared amount ${declaredTotal} ≠ catalog total ${catalogTotal} (delta ${
          declaredTotal - catalogTotal
        })`,
      );
    } else {
      evidencePath.push('declared amount matches catalog total');
    }

    evidencePath.push(`payee ${payload.payment_required.payee} on ${payload.payment_required.network}`);

    return {
      orderId: payload.order_ref,
      protocol: 'x402',
      protocolVersion: String(payload.x402_version),
      agentId: payload.payer.agent_id,
      // x402 payloads carry no display name; resolved from the registry later.
      agentDisplayName: payload.payer.agent_id,
      items,
      currency: payload.payment_required.currency,
      // The agent's declared total is what it signed, so that is what we carry
      // forward; the catalog delta is recorded as evidence above.
      totalMinor: declaredTotal,
      signature: payload.payer.signature,
      nonce: payload.payer.nonce,
      receivedAt,
      status: 'pending',
      payee: payload.payment_required.payee,
      network: payload.payment_required.network,
      wallet: payload.payer.wallet,
      evidencePath,
    };
  }

  const acp = payload as AcpPayload;
  evidencePath.push('protocol=acp → cart-shaped payload, no settlement block');

  const items = buildItems(
    acp.cart.items.map((i) => ({ sku: i.sku, qty: i.quantity })),
    catalog,
  );
  const total = items.reduce((sum, i) => sum + i.lineTotalMinor, 0);

  evidencePath.push(`catalog priced ${items.length} cart line(s) → ${total} minor units`);
  evidencePath.push(`buyer intent "${acp.buyer_context.intent}"`);

  return {
    orderId: acp.order_ref,
    protocol: 'acp',
    protocolVersion: acp.acp_version,
    agentId: acp.agent.id,
    agentDisplayName: acp.agent.display_name,
    items,
    currency: acp.cart.currency,
    totalMinor: total,
    signature: acp.agent.signature,
    nonce: acp.agent.nonce,
    receivedAt,
    status: 'pending',
    evidencePath,
  };
}

/** Catalog total, ignoring whatever the agent declared. */
export function catalogTotalMinor(order: NormalizedOrder): number {
  return order.items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
}
