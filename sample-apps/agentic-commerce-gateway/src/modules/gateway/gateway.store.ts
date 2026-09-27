import { AGENTS } from '../../fixtures/agents.js';
import { PRODUCTS } from '../../fixtures/products.js';
import { ORDERS, SIGN_VALID, type RawOrderPayload } from '../../fixtures/orders.js';
import { ONCHAIN_RECORDS, RECEIPTS } from '../../fixtures/settlements.js';
import { signPayload } from './gateway.signing.js';
import { normalizeOrder } from './gateway.normalize.js';
import type {
  AgentRecord,
  NormalizedOrder,
  OnChainRecord,
  OrderStatus,
  Product,
  SalesReceipt,
  Verdict,
} from './gateway.types.js';

/** Orders above this total always go to a human, however good the agent looks. */
export const HITL_THRESHOLD_MINOR = 4000000; // ₹40,000

export interface DecisionLogEntry {
  orderId: string;
  agentId: string;
  agentDisplayName: string;
  verdict: Verdict;
  score: number;
  totalMinor: number;
  currency: string;
  reason: string;
  decidedAt: string;
}

export interface FlagRecord {
  orderId: string;
  reason: string;
  evidence: string[];
  exposureMinor: number;
  flaggedAt: string;
}

export interface BlocklistEntry {
  agentId: string;
  displayName: string;
  reason: string;
  blockedAt: string;
}

/**
 * In-memory state for the gateway.
 *
 * Fixtures are plain TypeScript modules rather than JSON on disk: they compile
 * straight into `dist/` alongside the server, so there is no asset-copy step
 * and no runtime path resolution to get wrong once deployed.
 */
class GatewayStore {
  readonly products = new Map<string, Product>();
  readonly agents = new Map<string, AgentRecord>();
  readonly orders = new Map<string, NormalizedOrder>();
  readonly receipts = new Map<string, SalesReceipt>();
  readonly onchain = new Map<string, OnChainRecord>();

  readonly decisions: DecisionLogEntry[] = [];
  readonly flags = new Map<string, FlagRecord>();
  readonly blocklist = new Map<string, BlocklistEntry>();

  constructor() {
    this.reset();
  }

  /** Rebuilds all state from fixtures. Also exposed as the `reset_demo` tool. */
  reset(): void {
    this.products.clear();
    this.agents.clear();
    this.orders.clear();
    this.receipts.clear();
    this.onchain.clear();
    this.decisions.length = 0;
    this.flags.clear();
    this.blocklist.clear();

    for (const p of PRODUCTS) this.products.set(p.sku, p);
    for (const a of AGENTS) this.agents.set(a.agentId, a);
    for (const r of RECEIPTS) this.receipts.set(r.orderId, r);
    for (const c of ONCHAIN_RECORDS) this.onchain.set(c.orderId, c);

    for (const raw of ORDERS) {
      const order = this.ingest(raw, '2026-07-31T09:00:00.000Z');
      this.orders.set(order.orderId, order);
    }
  }

  /**
   * Normalizes a raw payload and resolves the `SIGN_VALID` sentinel into a real
   * HMAC using the agent's registry key, so fixture orders that are supposed to
   * be legitimate actually verify.
   */
  ingest(raw: RawOrderPayload, receivedAt?: string): NormalizedOrder {
    const order = normalizeOrder(raw, this.products, receivedAt);

    const agent = this.agents.get(order.agentId);
    if (agent) {
      order.agentDisplayName = agent.displayName;
      // Only registered agents have a registry-held key to sign against. An
      // unregistered agent's payload is left unverifiable on purpose — there is
      // nothing to check it against.
      if (order.signature === SIGN_VALID && agent.registered) {
        order.signature = signPayload(
          {
            protocol: order.protocol,
            agentId: order.agentId,
            nonce: order.nonce,
            items: order.items.map((i) => ({ sku: i.sku, qty: i.qty })),
            totalMinor: order.totalMinor,
            currency: order.currency,
          },
          agent.signingKey,
        );
      }
    }
    if (order.signature === SIGN_VALID) {
      // No registry key to sign with — leave it unverifiable.
      order.signature = 'unsigned';
    }

    return order;
  }

  getOrderOrThrow(orderId: string): NormalizedOrder {
    const order = this.orders.get(orderId);
    if (!order) {
      const known = [...this.orders.keys()].join(', ');
      throw new Error(`Unknown order "${orderId}". Known orders: ${known}`);
    }
    return order;
  }

  getAgentOrThrow(agentId: string): AgentRecord {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Unknown agent "${agentId}"`);
    return agent;
  }

  setStatus(orderId: string, status: OrderStatus): void {
    const order = this.orders.get(orderId);
    if (order) order.status = status;
  }

  isBlocklisted(agentId: string): boolean {
    return this.blocklist.has(agentId);
  }

  recordDecision(entry: DecisionLogEntry): void {
    this.decisions.unshift(entry);
  }
}

export const store = new GatewayStore();

/** ₹ formatting from minor units, e.g. 849900 -> "₹8,499.00". */
export function formatMinor(minor: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  const major = minor / 100;
  return `${symbol}${major.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
