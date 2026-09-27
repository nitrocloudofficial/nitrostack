import { formatMinor, store } from './gateway.store.js';
import type { FieldDiff, ReceiptVerification } from './gateway.types.js';

/**
 * Post-sale verification: diff the sales receipt NovaGear issued against the
 * on-chain settlement record, field by field.
 *
 * A receipt that agrees with itself proves nothing — the seller's exposure is
 * the gap between what the receipt claims and what actually settled.
 */
/** Field id -> wording a seller would actually use, for prose summaries. */
function humanField(field: string): string {
  if (field.startsWith('line_item.')) return `quantity for ${field.split('.')[1]}`;
  const map: Record<string, string> = {
    amount: 'amount',
    currency: 'currency',
    payee: 'payee',
    network: 'network',
    tx_hash: 'transaction hash',
  };
  return map[field] ?? field;
}

export function verifyReceipt(orderId: string): ReceiptVerification {
  const receipt = store.receipts.get(orderId);
  const chain = store.onchain.get(orderId);

  if (!receipt || !chain) {
    const settled = [...store.receipts.keys()].join(', ');
    throw new Error(
      `No settlement pair for "${orderId}". Orders with both a receipt and an on-chain record: ${settled}`,
    );
  }

  const diffs: FieldDiff[] = [];

  const amountMatch = receipt.amountMinor === chain.amountMinor;
  diffs.push({
    field: 'amount',
    receiptValue: formatMinor(receipt.amountMinor, receipt.currency),
    chainValue: formatMinor(chain.amountMinor, chain.currency),
    match: amountMatch,
    severity: amountMatch ? 'ok' : 'critical',
  });

  const currencyMatch = receipt.currency === chain.currency;
  diffs.push({
    field: 'currency',
    receiptValue: receipt.currency,
    chainValue: chain.currency,
    match: currencyMatch,
    severity: currencyMatch ? 'ok' : 'critical',
  });

  const payeeMatch = receipt.payee.toLowerCase() === chain.payee.toLowerCase();
  diffs.push({
    field: 'payee',
    receiptValue: receipt.payee,
    chainValue: chain.payee,
    match: payeeMatch,
    severity: payeeMatch ? 'ok' : 'critical',
  });

  // Line items, compared per SKU so a quantity swap is visible.
  const skus = new Set([
    ...receipt.items.map((i) => i.sku),
    ...chain.items.map((i) => i.sku),
  ]);
  for (const sku of [...skus].sort()) {
    const rQty = receipt.items.find((i) => i.sku === sku)?.qty;
    const cQty = chain.items.find((i) => i.sku === sku)?.qty;
    const match = rQty === cQty;
    diffs.push({
      field: `line_item.${sku}.qty`,
      receiptValue: rQty === undefined ? '— absent —' : String(rQty),
      chainValue: cQty === undefined ? '— absent —' : String(cQty),
      match,
      severity: match ? 'ok' : 'critical',
    });
  }

  diffs.push({
    field: 'network',
    receiptValue: '(not asserted by receipt)',
    chainValue: chain.network,
    match: true,
    severity: 'ok',
  });

  diffs.push({
    field: 'tx_hash',
    receiptValue: '(not asserted by receipt)',
    chainValue: chain.txHash,
    match: true,
    severity: 'ok',
  });

  const mismatches = diffs.filter((d) => !d.match);
  const criticalMismatches = mismatches.filter((d) => d.severity === 'critical').length;

  // What the seller stands to lose: an understated receipt hides the delta; a
  // redirected payee loses the entire settled amount.
  let exposureMinor = 0;
  if (!amountMatch) {
    exposureMinor += Math.abs(chain.amountMinor - receipt.amountMinor);
  }
  if (!payeeMatch) {
    exposureMinor += chain.amountMinor;
  }

  const verified = mismatches.length === 0;

  return {
    orderId,
    verified,
    diffs,
    mismatchCount: mismatches.length,
    criticalMismatches,
    exposureMinor,
    summary: verified
      ? `Receipt for ${orderId} matches the on-chain record on every compared field.`
      : `${mismatches.length} field(s) disagree between the receipt and the chain: ${mismatches
          .map((m) => humanField(m.field))
          .join(', ')}. Seller exposure ${formatMinor(exposureMinor, receipt.currency)}.`,
    recommendedAction: verified
      ? 'No action required — settlement is consistent.'
      : `Flag ${orderId} as disputed and blocklist ${receipt.agentId} pending investigation.`,
  };
}
