import type { OnChainRecord, SalesReceipt } from '../modules/gateway/gateway.types.js';
import { NOVAGEAR_PAYEE } from './orders.js';

/**
 * Sales receipts issued by NovaGear's checkout, paired with the (mock)
 * on-chain settlement records for the same orders.
 *
 * Two of these disagree with the chain on purpose — that disagreement is the
 * whole point of `verify_receipt`.
 */

/** Address that ord_1008's funds were actually routed to. */
const ATTACKER_PAYEE = '0x7cE0b41a92D5f36A08c1e4B7d590F62a3C84e015';

export const RECEIPTS: SalesReceipt[] = [
  {
    orderId: 'ord_1001',
    agentId: 'agt_shopper_atlas',
    amountMinor: 849900,
    currency: 'INR',
    payee: NOVAGEAR_PAYEE,
    items: [{ sku: 'NG-KB-01', qty: 1 }],
    issuedAt: '2026-07-31T09:14:22.000Z',
  },
  {
    // Receipt claims a single ₹4,999 headset...
    orderId: 'ord_1003',
    agentId: 'agt_relay_lyra',
    amountMinor: 499900,
    currency: 'INR',
    payee: NOVAGEAR_PAYEE,
    items: [{ sku: 'NG-HS-01', qty: 1 }],
    issuedAt: '2026-07-31T10:02:47.000Z',
  },
  {
    orderId: 'ord_1007',
    agentId: 'agt_concierge_vega',
    amountMinor: 1579800,
    currency: 'INR',
    payee: NOVAGEAR_PAYEE,
    items: [
      { sku: 'NG-HS-02', qty: 1 },
      { sku: 'NG-MS-01', qty: 1 },
    ],
    issuedAt: '2026-07-31T10:31:05.000Z',
  },
  {
    orderId: 'ord_1008',
    agentId: 'agt_probe_zeta',
    amountMinor: 1579400,
    currency: 'INR',
    payee: NOVAGEAR_PAYEE,
    items: [{ sku: 'NG-MS-01', qty: 6 }],
    issuedAt: '2026-07-31T11:08:33.000Z',
  },
];

export const ONCHAIN_RECORDS: OnChainRecord[] = [
  {
    orderId: 'ord_1001',
    txHash: '0x4a91c7e35b08d2f6a17e94c0b53d8e26f10a7c495b3d80e6f2a91c47b085d3e2',
    network: 'base-sepolia',
    amountMinor: 849900,
    currency: 'INR',
    payee: NOVAGEAR_PAYEE,
    items: [{ sku: 'NG-KB-01', qty: 1 }],
    settledAt: '2026-07-31T09:14:31.000Z',
  },
  {
    // ...the chain says ten of them, at 10x the money.
    orderId: 'ord_1003',
    txHash: '0x8d13f60a2c94e7b5013da8f27c46b9e0518a3d7f92c6b04e15a8d3f70b29c641',
    network: 'base-sepolia',
    amountMinor: 4999000,
    currency: 'INR',
    payee: NOVAGEAR_PAYEE,
    items: [{ sku: 'NG-HS-01', qty: 10 }],
    settledAt: '2026-07-31T10:02:58.000Z',
  },
  {
    orderId: 'ord_1007',
    txHash: '0x2f70b9d418ae35c026f81b4d97a05e3c6482d1f0a95c73be08d4f261a37c0b95',
    network: 'base-sepolia',
    amountMinor: 1579800,
    currency: 'INR',
    payee: NOVAGEAR_PAYEE,
    items: [
      { sku: 'NG-HS-02', qty: 1 },
      { sku: 'NG-MS-01', qty: 1 },
    ],
    settledAt: '2026-07-31T10:31:14.000Z',
  },
  {
    // Right amount, wrong destination — the funds never reached NovaGear.
    orderId: 'ord_1008',
    txHash: '0x6b28e0c74f931da05c83b6e2170f4a9d35c81e07b24af960d1c53e8a7f240b13',
    network: 'base-sepolia',
    amountMinor: 1579400,
    currency: 'INR',
    payee: ATTACKER_PAYEE,
    items: [{ sku: 'NG-MS-01', qty: 6 }],
    settledAt: '2026-07-31T11:08:41.000Z',
  },
];
