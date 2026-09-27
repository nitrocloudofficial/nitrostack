/**
 * Incoming agent orders in two protocol shapes.
 *
 * These are **protocol-shaped fixtures, not live integrations** — the field
 * names mirror ACP / x402 payloads so the normalizer does real work, but no
 * network call is made anywhere in this project.
 *
 * `signature: SIGN_VALID` is a sentinel: the store replaces it at load time
 * with a genuine HMAC over the canonical payload using the agent's registry
 * key. Any other value is a forged signature that will fail verification.
 */

export const SIGN_VALID = '__SIGN_WITH_REGISTRY_KEY__';

/** NovaGear's settlement address. */
export const NOVAGEAR_PAYEE = '0x9A4fD21bC7e05a83F16D4e92B0c7A15d38E6b204';

export interface AcpPayload {
  protocol: 'acp';
  acp_version: string;
  order_ref: string;
  agent: {
    id: string;
    display_name: string;
    signature: string;
    nonce: string;
  };
  cart: {
    currency: string;
    items: Array<{ sku: string; quantity: number }>;
  };
  buyer_context: {
    intent: string;
    session_id: string;
  };
}

export interface X402Payload {
  protocol: 'x402';
  x402_version: number;
  order_ref: string;
  payer: {
    agent_id: string;
    wallet: string;
    signature: string;
    nonce: string;
  };
  payment_required: {
    /** Amount the agent *claims* it owes. Cross-checked against the catalog. */
    amount_minor: number;
    currency: string;
    network: string;
    payee: string;
  };
  line_items: Array<{ sku: string; qty: number }>;
}

export type RawOrderPayload = AcpPayload | X402Payload;

export const ORDERS: RawOrderPayload[] = [
  // Scenario 1 — clean sale from an established shopper agent.
  {
    protocol: 'acp',
    acp_version: '0.3',
    order_ref: 'ord_1001',
    agent: {
      id: 'agt_shopper_atlas',
      display_name: 'Atlas Shopping Assistant',
      signature: SIGN_VALID,
      nonce: 'nc_8f31a0',
    },
    cart: {
      currency: 'INR',
      items: [{ sku: 'NG-KB-01', quantity: 1 }],
    },
    buyer_context: { intent: 'purchase', session_id: 'sess_atlas_4471' },
  },

  // Scenario 2 — day-old agent, forged signature, 40 units of one SKU.
  {
    protocol: 'x402',
    x402_version: 1,
    order_ref: 'ord_1002',
    payer: {
      agent_id: 'agt_ghost_nyx',
      wallet: '0x0189bE47cF63a2D50e91C8f4A76b3D25c04E1f78',
      signature: 'b3f5c1d9e7a20486fd35c9b1027e4a6d8c05f31e92b7a4d06c18e5f3907b2a4c',
      nonce: 'nc_ff0021',
    },
    payment_required: {
      amount_minor: 19996000,
      currency: 'INR',
      network: 'base-sepolia',
      payee: NOVAGEAR_PAYEE,
    },
    line_items: [{ sku: 'NG-HS-01', qty: 40 }],
  },

  // Scenario 3 — looks clean at screening; the tampering shows up post-settlement.
  {
    protocol: 'x402',
    x402_version: 1,
    order_ref: 'ord_1003',
    payer: {
      agent_id: 'agt_relay_lyra',
      wallet: '0xD45e1B93cF20a7E68b14D9c3A05f2E789C61a802',
      signature: SIGN_VALID,
      nonce: 'nc_2ab7c4',
    },
    payment_required: {
      amount_minor: 499900,
      currency: 'INR',
      network: 'base-sepolia',
      payee: NOVAGEAR_PAYEE,
    },
    line_items: [{ sku: 'NG-HS-01', qty: 1 }],
  },

  // Conflicting signals — reputable agent, but a bulk order well past SKU norms.
  {
    protocol: 'acp',
    acp_version: '0.3',
    order_ref: 'ord_1004',
    agent: {
      id: 'agt_bulk_orion',
      display_name: 'Orion Procurement Bot',
      signature: SIGN_VALID,
      nonce: 'nc_71c3de',
    },
    cart: {
      currency: 'INR',
      items: [{ sku: 'NG-DK-01', quantity: 12 }],
    },
    buyer_context: { intent: 'bulk_purchase', session_id: 'sess_orion_0192' },
  },

  // Velocity abuse — valid signature, but 47 orders in the last hour.
  {
    protocol: 'x402',
    x402_version: 1,
    order_ref: 'ord_1005',
    payer: {
      agent_id: 'agt_swarm_kilo',
      wallet: '0xF67a3D15eB42c9086d36F1e5C27b4A9d16E82B04',
      signature: SIGN_VALID,
      nonce: 'nc_5d90b1',
    },
    payment_required: {
      amount_minor: 1049700,
      currency: 'INR',
      network: 'base-sepolia',
      payee: NOVAGEAR_PAYEE,
    },
    line_items: [{ sku: 'NG-WC-01', qty: 3 }],
  },

  // Unregistered agent — no registry entry to score against.
  {
    protocol: 'acp',
    acp_version: '0.3',
    order_ref: 'ord_1006',
    agent: {
      id: 'agt_shadow_umbra',
      display_name: 'Umbra Checkout Agent',
      signature: SIGN_VALID,
      nonce: 'nc_c40a77',
    },
    cart: {
      currency: 'INR',
      items: [{ sku: 'NG-KB-02', quantity: 2 }],
    },
    buyer_context: { intent: 'purchase', session_id: 'sess_umbra_5510' },
  },

  // Clean multi-item sale.
  {
    protocol: 'acp',
    acp_version: '0.3',
    order_ref: 'ord_1007',
    agent: {
      id: 'agt_concierge_vega',
      display_name: 'Vega Personal Concierge',
      signature: SIGN_VALID,
      nonce: 'nc_9e14b2',
    },
    cart: {
      currency: 'INR',
      items: [
        { sku: 'NG-HS-02', quantity: 1 },
        { sku: 'NG-MS-01', quantity: 1 },
      ],
    },
    buyer_context: { intent: 'purchase', session_id: 'sess_vega_7734' },
  },

  // Declared x402 amount understates the catalog total by ₹1,000.
  {
    protocol: 'x402',
    x402_version: 1,
    order_ref: 'ord_1008',
    payer: {
      agent_id: 'agt_probe_zeta',
      wallet: '0xE56f2C04dA31b8F79c25E0d4B16a3F8c05D719A3',
      signature: SIGN_VALID,
      nonce: 'nc_3f8ac6',
    },
    payment_required: {
      amount_minor: 1579400,
      currency: 'INR',
      network: 'base-sepolia',
      payee: NOVAGEAR_PAYEE,
    },
    line_items: [{ sku: 'NG-MS-01', qty: 6 }],
  },

  // High-value order from a trusted agent — clears screening but trips the
  // human-in-the-loop threshold (> ₹40,000).
  {
    protocol: 'acp',
    acp_version: '0.3',
    order_ref: 'ord_1009',
    agent: {
      id: 'agt_shopper_atlas',
      display_name: 'Atlas Shopping Assistant',
      signature: SIGN_VALID,
      nonce: 'nc_b70d35',
    },
    cart: {
      currency: 'INR',
      items: [{ sku: 'NG-HS-02', quantity: 5 }],
    },
    buyer_context: { intent: 'purchase', session_id: 'sess_atlas_9902' },
  },
];
