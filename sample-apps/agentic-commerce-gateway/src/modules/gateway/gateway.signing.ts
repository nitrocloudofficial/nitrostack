import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Protocol } from './gateway.types.js';

/**
 * Mock payload signing for buying agents.
 *
 * This is deliberately a real HMAC rather than a hardcoded "valid"/"invalid"
 * flag: screening recomputes the digest from the canonical order fields, so a
 * tampered quantity or a forged key fails verification for the right reason.
 * The registry-held `signingKey` stands in for the agent's real protocol key.
 */

export interface SignablePayload {
  protocol: Protocol;
  agentId: string;
  nonce: string;
  items: Array<{ sku: string; qty: number }>;
  totalMinor: number;
  currency: string;
}

/**
 * Canonical string form. Field order is fixed and quantities are sorted by SKU
 * so the same logical order always produces the same digest.
 */
export function canonicalize(payload: SignablePayload): string {
  const items = [...payload.items]
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((i) => `${i.sku}:${i.qty}`)
    .join(',');

  return [
    `protocol=${payload.protocol}`,
    `agent=${payload.agentId}`,
    `nonce=${payload.nonce}`,
    `items=${items}`,
    `total=${payload.totalMinor}`,
    `currency=${payload.currency}`,
  ].join('|');
}

export function signPayload(payload: SignablePayload, signingKey: string): string {
  return createHmac('sha256', signingKey).update(canonicalize(payload)).digest('hex');
}

/** Constant-time comparison; tolerates malformed/short forged signatures. */
export function verifySignature(
  payload: SignablePayload,
  signingKey: string,
  presented: string,
): boolean {
  const expected = signPayload(payload, signingKey);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(presented ?? '', 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
