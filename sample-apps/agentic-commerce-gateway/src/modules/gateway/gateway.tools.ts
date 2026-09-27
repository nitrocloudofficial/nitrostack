import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { formatMinor, store, HITL_THRESHOLD_MINOR } from './gateway.store.js';
import { computeTrustScore, screenAgent } from './gateway.screening.js';
import { verifyReceipt } from './gateway.verification.js';
import { catalogTotalMinor } from './gateway.normalize.js';
import {
  NOVAGEAR_PAYEE,
  SIGN_VALID,
  type AcpPayload,
  type RawOrderPayload,
  type X402Payload,
} from '../../fixtures/orders.js';

let orderCounter = 2000;

/**
 * The gateway's MCP surface.
 *
 * The intended agentic chain is:
 *   place_agent_order → screen_agent → compute_trust_score → (flag_order |
 *   blocklist_agent) → verify_receipt → get_sales_dashboard
 *
 * Each tool is independently runnable from the Studio Tools page so the demo
 * never depends on the model chaining them correctly.
 */
export class GatewayTools {
  // ---------------------------------------------------------------- catalog

  @Tool({
    name: 'list_products',
    description:
      'List the NovaGear storefront catalog (keyboards, headsets, webcams, accessories) with prices and the normal purchase quantity for each SKU. Call this first to see what an agent can buy.',
    inputSchema: z.object({
      category: z
        .string()
        .optional()
        .describe('Optional category filter: keyboards, headsets, webcams, accessories'),
    }),
    examples: {
      request: { category: 'headsets' },
      response: {
        store: 'NovaGear',
        count: 2,
        products: [
          {
            sku: 'NG-HS-01',
            name: 'NovaSound H500 Headset',
            price: '₹4,999.00',
            typicalQty: 1,
            maxNormalQty: 4,
          },
        ],
      },
    },
  })
  async listProducts(input: { category?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Listing NovaGear catalog', { category: input.category });

    const products = [...store.products.values()]
      .filter((p) => !input.category || p.category === input.category)
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        priceMinor: p.priceMinor,
        price: formatMinor(p.priceMinor),
        typicalQty: p.typicalQty,
        maxNormalQty: p.maxNormalQty,
      }));

    return {
      store: 'NovaGear',
      currency: 'INR',
      count: products.length,
      products,
    };
  }

  // ------------------------------------------------------------ order intake

  @Tool({
    name: 'place_agent_order',
    description:
      'Simulate an incoming AI-agent purchase at NovaGear checkout. Accepts an ACP-shaped or x402-shaped payload and normalizes it into the gateway schema. Either replay a fixture order with order_ref, or construct a new one with agent_id + items. Returns the normalized order and the evidence path taken.',
    inputSchema: z.object({
      order_ref: z
        .string()
        .optional()
        .describe('Replay an existing fixture order, e.g. ord_1002. Ignores the other fields.'),
      protocol: z
        .enum(['acp', 'x402'])
        .optional()
        .describe('Payload shape for a newly constructed order'),
      agent_id: z.string().optional().describe('Buying agent placing the order, e.g. agt_ghost_nyx'),
      items: z
        .array(z.object({ sku: z.string(), qty: z.number().int().positive() }))
        .optional()
        .describe('Line items for a newly constructed order'),
      spoof_signature: z
        .boolean()
        .optional()
        .describe('Present a forged signature instead of a valid one (fraud simulation)'),
      declared_amount_minor: z
        .number()
        .int()
        .optional()
        .describe('x402 only: override the declared settlement amount, in paise'),
    }),
    examples: {
      request: { protocol: 'x402', agent_id: 'agt_ghost_nyx', items: [{ sku: 'NG-HS-01', qty: 40 }], spoof_signature: true },
      response: {
        orderId: 'ord_2001',
        protocol: 'x402',
        agentDisplayName: 'Nyx Buyer',
        total: '₹1,99,960.00',
        status: 'pending',
        nextStep: 'Call screen_agent with this orderId',
      },
    },
  })
  async placeAgentOrder(
    input: {
      order_ref?: string;
      protocol?: 'acp' | 'x402';
      agent_id?: string;
      items?: Array<{ sku: string; qty: number }>;
      spoof_signature?: boolean;
      declared_amount_minor?: number;
    },
    ctx: ExecutionContext,
  ) {
    // Replay path — the order already exists in the fixture set.
    if (input.order_ref) {
      const existing = store.getOrderOrThrow(input.order_ref);
      ctx.logger.info('Replaying fixture order', { orderId: existing.orderId });
      return {
        orderId: existing.orderId,
        protocol: existing.protocol,
        protocolVersion: existing.protocolVersion,
        agentId: existing.agentId,
        agentDisplayName: existing.agentDisplayName,
        items: existing.items,
        currency: existing.currency,
        totalMinor: existing.totalMinor,
        total: formatMinor(existing.totalMinor, existing.currency),
        status: existing.status,
        evidencePath: existing.evidencePath,
        source: 'fixture',
        nextStep: `Call screen_agent with orderId "${existing.orderId}"`,
      };
    }

    if (!input.protocol || !input.agent_id || !input.items?.length) {
      throw new Error(
        'Provide either order_ref (to replay a fixture) or protocol + agent_id + items (to construct a new order).',
      );
    }

    const agent = store.getAgentOrThrow(input.agent_id);
    const orderId = `ord_${++orderCounter}`;
    const nonce = `nc_${Math.random().toString(16).slice(2, 8)}`;

    // A forged signature is a plausible-looking hex string that will not verify.
    const forged = Array.from({ length: 64 }, () =>
      '0123456789abcdef'[Math.floor(Math.random() * 16)],
    ).join('');
    const signature = input.spoof_signature ? forged : SIGN_VALID;

    let raw: RawOrderPayload;
    if (input.protocol === 'x402') {
      const catalogTotal = input.items.reduce((sum, line) => {
        const p = store.products.get(line.sku);
        if (!p) throw new Error(`Unknown SKU "${line.sku}"`);
        return sum + p.priceMinor * line.qty;
      }, 0);

      const payload: X402Payload = {
        protocol: 'x402',
        x402_version: 1,
        order_ref: orderId,
        payer: {
          agent_id: agent.agentId,
          wallet: agent.wallet ?? '0x0000000000000000000000000000000000000000',
          signature,
          nonce,
        },
        payment_required: {
          amount_minor: input.declared_amount_minor ?? catalogTotal,
          currency: 'INR',
          network: 'base-sepolia',
          payee: NOVAGEAR_PAYEE,
        },
        line_items: input.items.map((i) => ({ sku: i.sku, qty: i.qty })),
      };
      raw = payload;
    } else {
      const payload: AcpPayload = {
        protocol: 'acp',
        acp_version: '0.3',
        order_ref: orderId,
        agent: {
          id: agent.agentId,
          display_name: agent.displayName,
          signature,
          nonce,
        },
        cart: {
          currency: 'INR',
          items: input.items.map((i) => ({ sku: i.sku, quantity: i.qty })),
        },
        buyer_context: { intent: 'purchase', session_id: `sess_live_${orderCounter}` },
      };
      raw = payload;
    }

    const order = store.ingest(raw);
    store.orders.set(order.orderId, order);

    ctx.logger.info('Agent order received at NovaGear checkout', {
      orderId: order.orderId,
      protocol: order.protocol,
      agentId: order.agentId,
      totalMinor: order.totalMinor,
    });

    return {
      orderId: order.orderId,
      protocol: order.protocol,
      protocolVersion: order.protocolVersion,
      agentId: order.agentId,
      agentDisplayName: order.agentDisplayName,
      items: order.items,
      currency: order.currency,
      totalMinor: order.totalMinor,
      total: formatMinor(order.totalMinor, order.currency),
      catalogTotal: formatMinor(catalogTotalMinor(order), order.currency),
      status: order.status,
      evidencePath: order.evidencePath,
      source: 'constructed',
      nextStep: `Call screen_agent with orderId "${order.orderId}"`,
    };
  }

  // -------------------------------------------------------------- screening

  @Tool({
    name: 'screen_agent',
    description:
      "Run identity screening on the agent behind an order: registry lookup, cryptographic signature verification against the agent's registry key, blocklist status, dispute history, and (x402 only) declared amount vs catalog price. Returns pass/fail checks, not a score — call compute_trust_score next.",
    inputSchema: z.object({
      order_id: z.string().describe('Order to screen, e.g. ord_1002'),
    }),
    examples: {
      request: { order_id: 'ord_1002' },
      response: {
        orderId: 'ord_1002',
        agentDisplayName: 'Nyx Buyer',
        signatureValid: false,
        failedChecks: 2,
        summary: '2 of 5 identity checks failed for Nyx Buyer',
      },
    },
  })
  async screenAgentTool(input: { order_id: string }, ctx: ExecutionContext) {
    const order = store.getOrderOrThrow(input.order_id);
    const result = screenAgent(order);

    ctx.logger.info('Screened buying agent', {
      orderId: order.orderId,
      agentId: order.agentId,
      signatureValid: result.signatureValid,
      failedChecks: result.failedChecks,
    });

    return {
      ...result,
      protocol: order.protocol,
      orderTotal: formatMinor(order.totalMinor, order.currency),
      evidencePath: order.evidencePath,
      nextStep: `Call compute_trust_score with orderId "${order.orderId}"`,
    };
  }

  @Tool({
    name: 'compute_trust_score',
    description:
      'Score an agent order 0-100 across five weighted signals (signature 35, reputation 25, order-size anomaly 20, velocity 12, account age 8), reason over conflicting signals, and decide: approve, hold for seller review, or decline. Applies the decision to the order and logs it. Orders above ₹40,000 are always held for a human.',
    inputSchema: z.object({
      order_id: z.string().describe('Order to score, e.g. ord_1002'),
    }),
    examples: {
      request: { order_id: 'ord_1002' },
      response: {
        orderId: 'ord_1002',
        score: 10,
        band: 'high-risk',
        verdict: 'decline',
        conflicts: [],
      },
    },
  })
  @Widget('order-review')
  async computeTrustScoreTool(input: { order_id: string }, ctx: ExecutionContext) {
    const order = store.getOrderOrThrow(input.order_id);
    const screening = screenAgent(order);
    const scored = computeTrustScore(order, screening);

    // Act on the decision: this is a gateway, not a report generator.
    const statusMap = { approve: 'approved', hold: 'held', decline: 'declined' } as const;
    store.setStatus(order.orderId, statusMap[scored.verdict]);
    store.recordDecision({
      orderId: order.orderId,
      agentId: order.agentId,
      agentDisplayName: order.agentDisplayName,
      verdict: scored.verdict,
      score: scored.score,
      totalMinor: order.totalMinor,
      currency: order.currency,
      reason: scored.reasoning[0] ?? '',
      decidedAt: new Date().toISOString(),
    });

    ctx.logger.info('Order decision applied', {
      orderId: order.orderId,
      score: scored.score,
      verdict: scored.verdict,
      conflicts: scored.conflicts.length,
    });

    const nextStep =
      scored.verdict === 'decline'
        ? `Declined. Consider blocklist_agent for "${order.agentId}".`
        : scored.verdict === 'hold'
          ? 'Held for seller review — a human decides before this sale settles.'
          : `Approved. After settlement, call verify_receipt for "${order.orderId}".`;

    return {
      ...scored,
      orderTotal: formatMinor(scored.orderTotalMinor, scored.currency),
      hitlThreshold: formatMinor(HITL_THRESHOLD_MINOR),
      status: statusMap[scored.verdict],
      protocol: order.protocol,
      items: order.items.map((i) => ({
        ...i,
        unitPrice: formatMinor(i.unitPriceMinor, order.currency),
        lineTotal: formatMinor(i.lineTotalMinor, order.currency),
      })),
      screening,
      evidencePath: order.evidencePath,
      nextStep,
    };
  }

  // ----------------------------------------------------------- verification

  @Tool({
    name: 'verify_receipt',
    description:
      'Diff a settled sales receipt against the on-chain settlement record field by field (amount, currency, payee, per-SKU quantities). Reports every mismatch, the seller-side exposure in rupees, and the recommended action. This is what catches tampered receipts after a sale looks clean.',
    inputSchema: z.object({
      order_id: z.string().describe('Settled order to verify, e.g. ord_1003'),
    }),
    examples: {
      request: { order_id: 'ord_1003' },
      response: {
        orderId: 'ord_1003',
        verified: false,
        mismatchCount: 2,
        exposure: '₹44,991.00',
        recommendedAction: 'Flag ord_1003 as disputed and blocklist agt_relay_lyra pending investigation.',
      },
    },
  })
  @Widget('receipt-diff')
  async verifyReceiptTool(input: { order_id: string }, ctx: ExecutionContext) {
    const result = verifyReceipt(input.order_id);
    const receipt = store.receipts.get(input.order_id)!;
    const chain = store.onchain.get(input.order_id)!;

    ctx.logger.info('Verified receipt against chain', {
      orderId: input.order_id,
      verified: result.verified,
      mismatches: result.mismatchCount,
      exposureMinor: result.exposureMinor,
    });

    return {
      ...result,
      exposure: formatMinor(result.exposureMinor, receipt.currency),
      agentId: receipt.agentId,
      agentDisplayName: store.agents.get(receipt.agentId)?.displayName ?? receipt.agentId,
      receipt: {
        amount: formatMinor(receipt.amountMinor, receipt.currency),
        payee: receipt.payee,
        items: receipt.items,
        issuedAt: receipt.issuedAt,
      },
      chain: {
        amount: formatMinor(chain.amountMinor, chain.currency),
        payee: chain.payee,
        items: chain.items,
        txHash: chain.txHash,
        network: chain.network,
        settledAt: chain.settledAt,
      },
      nextStep: result.verified
        ? 'Settlement is consistent — no action needed.'
        : `Call flag_order for "${input.order_id}", then blocklist_agent for "${receipt.agentId}".`,
    };
  }

  // ---------------------------------------------------------------- actions

  @Tool({
    name: 'flag_order',
    description:
      'Mark an order as disputed and attach the evidence behind the dispute. Use after verify_receipt finds a mismatch, or when screening evidence warrants holding the sale.',
    inputSchema: z.object({
      order_id: z.string().describe('Order to flag'),
      reason: z.string().describe('Why the order is disputed'),
      evidence: z
        .array(z.string())
        .optional()
        .describe('Supporting evidence lines, e.g. specific field mismatches'),
    }),
    examples: {
      request: {
        order_id: 'ord_1003',
        reason: 'Receipt amount does not match on-chain settlement',
        evidence: ['receipt ₹4,999.00 vs chain ₹49,990.00', 'qty 1 vs 10'],
      },
      response: { orderId: 'ord_1003', status: 'flagged', exposure: '₹44,991.00' },
    },
  })
  async flagOrder(
    input: { order_id: string; reason: string; evidence?: string[] },
    ctx: ExecutionContext,
  ) {
    const order = store.getOrderOrThrow(input.order_id);

    // If this order has a settlement pair, price the dispute automatically.
    let exposureMinor = 0;
    if (store.receipts.has(order.orderId) && store.onchain.has(order.orderId)) {
      exposureMinor = verifyReceipt(order.orderId).exposureMinor;
    }

    const record = {
      orderId: order.orderId,
      reason: input.reason,
      evidence: input.evidence ?? [],
      exposureMinor,
      flaggedAt: new Date().toISOString(),
    };
    store.flags.set(order.orderId, record);
    store.setStatus(order.orderId, 'flagged');

    ctx.logger.warn('Order flagged as disputed', {
      orderId: order.orderId,
      reason: input.reason,
      exposureMinor,
    });

    return {
      ...record,
      status: 'flagged',
      agentId: order.agentId,
      agentDisplayName: order.agentDisplayName,
      exposure: formatMinor(exposureMinor, order.currency),
      nextStep: `Consider blocklist_agent for "${order.agentId}".`,
    };
  }

  @Tool({
    name: 'blocklist_agent',
    description:
      'Ban a buying agent from the NovaGear store. Every future order from this agent is declined at screening before it can settle.',
    inputSchema: z.object({
      agent_id: z.string().describe('Agent to ban, e.g. agt_ghost_nyx'),
      reason: z.string().describe('Why the agent is being banned'),
    }),
    examples: {
      request: { agent_id: 'agt_ghost_nyx', reason: 'Spoofed signature on a 40-unit order' },
      response: { agentId: 'agt_ghost_nyx', blocked: true, blocklistSize: 1 },
    },
  })
  async blocklistAgent(input: { agent_id: string; reason: string }, ctx: ExecutionContext) {
    const agent = store.getAgentOrThrow(input.agent_id);

    const entry = {
      agentId: agent.agentId,
      displayName: agent.displayName,
      reason: input.reason,
      blockedAt: new Date().toISOString(),
    };
    store.blocklist.set(agent.agentId, entry);

    ctx.logger.warn('Agent blocklisted', { agentId: agent.agentId, reason: input.reason });

    const affected = [...store.orders.values()].filter((o) => o.agentId === agent.agentId);

    return {
      ...entry,
      blocked: true,
      blocklistSize: store.blocklist.size,
      affectedOrders: affected.map((o) => o.orderId),
      nextStep: 'Call get_sales_dashboard to see the updated revenue-protected figure.',
    };
  }

  // -------------------------------------------------------------- dashboard

  @Tool({
    name: 'get_sales_dashboard',
    description:
      'Seller view of agent-driven sales: order feed by agent, approval/hold/decline counts, flagged orders, the blocklist, and the running "revenue protected" figure — money the gateway stopped from leaving NovaGear.',
    inputSchema: z.object({
      agent_id: z.string().optional().describe('Optional: restrict the feed to one agent'),
    }),
    examples: {
      request: {},
      response: {
        store: 'NovaGear',
        revenueProtected: '₹2,44,951.00',
        counts: { approved: 3, held: 4, declined: 2, flagged: 1 },
      },
    },
  })
  @Widget('sales-dashboard')
  async getSalesDashboard(input: { agent_id?: string }, ctx: ExecutionContext) {
    const orders = [...store.orders.values()].filter(
      (o) => !input.agent_id || o.agentId === input.agent_id,
    );

    const counts = {
      pending: orders.filter((o) => o.status === 'pending').length,
      approved: orders.filter((o) => o.status === 'approved').length,
      held: orders.filter((o) => o.status === 'held').length,
      declined: orders.filter((o) => o.status === 'declined').length,
      flagged: orders.filter((o) => o.status === 'flagged').length,
    };

    const approvedRevenueMinor = orders
      .filter((o) => o.status === 'approved')
      .reduce((sum, o) => sum + o.totalMinor, 0);

    // Revenue protected = value of orders stopped at screening + exposure
    // uncovered on settled orders that were flagged.
    const declinedValueMinor = orders
      .filter((o) => o.status === 'declined')
      .reduce((sum, o) => sum + o.totalMinor, 0);
    const flaggedExposureMinor = [...store.flags.values()].reduce(
      (sum, f) => sum + f.exposureMinor,
      0,
    );
    const revenueProtectedMinor = declinedValueMinor + flaggedExposureMinor;

    const byAgent = new Map<string, { agentId: string; displayName: string; orders: number; valueMinor: number; declined: number }>();
    for (const o of orders) {
      const row = byAgent.get(o.agentId) ?? {
        agentId: o.agentId,
        displayName: o.agentDisplayName,
        orders: 0,
        valueMinor: 0,
        declined: 0,
      };
      row.orders += 1;
      row.valueMinor += o.totalMinor;
      if (o.status === 'declined' || o.status === 'flagged') row.declined += 1;
      byAgent.set(o.agentId, row);
    }

    ctx.logger.info('Sales dashboard requested', {
      orders: orders.length,
      revenueProtectedMinor,
    });

    return {
      store: 'NovaGear',
      currency: 'INR',
      counts,
      totalOrders: orders.length,
      approvedRevenueMinor,
      approvedRevenue: formatMinor(approvedRevenueMinor),
      revenueProtectedMinor,
      revenueProtected: formatMinor(revenueProtectedMinor),
      hitlThreshold: formatMinor(HITL_THRESHOLD_MINOR),
      feed: orders
        .slice()
        .sort((a, b) => a.orderId.localeCompare(b.orderId))
        .map((o) => ({
          orderId: o.orderId,
          protocol: o.protocol,
          agentId: o.agentId,
          agentDisplayName: o.agentDisplayName,
          status: o.status,
          total: formatMinor(o.totalMinor, o.currency),
          totalMinor: o.totalMinor,
          items: o.items.map((i) => `${i.qty}× ${i.sku}`).join(', '),
        })),
      agents: [...byAgent.values()]
        .sort((a, b) => b.valueMinor - a.valueMinor)
        .map((a) => ({ ...a, value: formatMinor(a.valueMinor) })),
      flagged: [...store.flags.values()].map((f) => ({
        ...f,
        exposure: formatMinor(f.exposureMinor),
      })),
      blocklist: [...store.blocklist.values()],
      decisions: store.decisions.slice(0, 10),
    };
  }

  // ------------------------------------------------------------------ demo

  @Tool({
    name: 'reset_demo',
    description:
      'Reset all gateway state back to the original fixtures — clears decisions, flags and the blocklist. Use between demo runs.',
    inputSchema: z.object({}),
    examples: { request: {}, response: { reset: true, orders: 9 } },
  })
  async resetDemo(_input: unknown, ctx: ExecutionContext) {
    store.reset();
    ctx.logger.info('Gateway state reset to fixtures');
    return {
      reset: true,
      orders: store.orders.size,
      agents: store.agents.size,
      products: store.products.size,
      message: 'Gateway state restored to the original fixture set.',
    };
  }
}
