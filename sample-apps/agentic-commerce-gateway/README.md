# Agentic Commerce Gateway

**Stripe Radar for AI shopping agents.** A fraud gateway that sits inside a seller's checkout: it screens the buying agent *before* the sale settles, and verifies every sales receipt field-by-field against the on-chain settlement record.

Built with the **NitroStack TypeScript SDK** · Track: **Fintech** · Demo store: **NovaGear** (mock electronics retailer)

**Live on NitroCloud:** https://agentic-commerce-gateway-6a6cafaa-rudra-srmist.app.nitrocloud.ai
**MCP endpoint:** `https://agentic-commerce-gateway-6a6cafaa-rudra-srmist.app.nitrocloud.ai/mcp`

---

## The problem

AI shopping agents have started buying on behalf of users through emerging protocols — ACP, AP2, x402, MPP. For a seller, this is a new and awkward class of customer: orders arrive from software you cannot vet, carrying signatures you have no way to check, at volumes no human would ever order.

Sellers get two distinct risks, and existing fraud tools address neither:

1. **Pre-sale** — you cannot tell a legitimate shopping agent from a day-old bot with a forged signature draining your stock.
2. **Post-sale** — the receipt your checkout issued and the payment that actually settled on-chain may not agree, and nothing reconciles them.

This gateway handles both, so sellers can capture agent-driven revenue without absorbing agent-driven fraud.

## What it does

```
  Agent order (ACP or x402 payload)
             │
             ▼
   ┌───────────────────┐
   │    normalize      │  one schema, two wire formats
   └────────┬──────────┘  evidence path chosen here
            ▼
   ┌───────────────────┐
   │   screen_agent    │  registry lookup · HMAC signature verification
   └────────┬──────────┘  blocklist · disputes · declared-amount check
            ▼
   ┌───────────────────┐
   │compute_trust_score│  5 weighted signals → conflict detection → verdict
   └────────┬──────────┘
            ▼
   approve ──── hold (seller / >₹40,000) ──── decline
            │
            ▼  (after settlement)
   ┌───────────────────┐
   │  verify_receipt   │  receipt ⟷ chain, field by field
   └────────┬──────────┘
            ▼
   flag_order · blocklist_agent · get_sales_dashboard
```

## Why it's agentic

The gateway runs a genuine multi-step investigation on every order rather than summarising one:

1. **Branching evidence paths.** An x402 payload carries a declared settlement amount, a payee and a network; an ACP cart carries none of these. The normalizer records a different evidence trail per protocol, and the x402 path gets an extra check (declared amount vs catalog price) that simply does not exist on the ACP path.
2. **Real verification, not a flag.** Signatures are HMAC-SHA256 over a canonical payload, checked against the agent's registry key. A forged signature fails because the digest genuinely does not match — quantities and totals are part of the signed material, so tampering breaks it.
3. **Reasoning over conflicting signals.** Signals that point in opposite directions are surfaced as explicit conflicts instead of being averaged into a number: a cryptographically valid signature attached to a 40-unit bulk order, or high reputation alongside 47 orders in one hour.
4. **Consequential action.** The verdict is applied — order status changes, the decision is logged, agents get blocklisted, and a blocklisted agent's *next* order is declined at screening.
5. **Post-sale autonomy.** `verify_receipt` diffs the receipt against the chain, prices the seller's exposure in rupees, and hands back a concrete recommended action.

## MCP surface

### Tools

| Tool | What it does |
|---|---|
| `list_products` | NovaGear catalog with prices and normal order quantities |
| `place_agent_order` | Simulate an incoming agent purchase (ACP- or x402-shaped); replay a fixture or construct one |
| `screen_agent` | Registry lookup, signature verification, blocklist, disputes, declared-amount check |
| `compute_trust_score` | Five weighted signals → conflicts → verdict; applies and logs the decision |
| `verify_receipt` | Field-by-field receipt vs on-chain diff with seller exposure |
| `flag_order` | Mark an order disputed and attach evidence |
| `blocklist_agent` | Ban an agent; future orders are declined at screening |
| `get_sales_dashboard` | Order ledger, settled vs stopped revenue, disputes, blocklist |
| `reset_demo` | Restore fixture state between demo runs |

### Widgets

| Widget | Bound to | Shows |
|---|---|---|
| **Order review card** | `compute_trust_score` | Verdict stamp, trust score, per-signal meters, conflicting evidence, identity checks, expandable decision trail |
| **Receipt diff view** | `verify_receipt` | Receipt vs chain side by side, mismatched fields in red, seller exposure |
| **Sales dashboard** | `get_sales_dashboard` | Order ledger split into settled / stopped, disputes, buying agents, blocklist |

### Resources

`novagear://catalog` · `novagear://agent-registry` · `novagear://blocklist`

### Prompts

`triage_agent_order` — full investigation loop for one order
`audit_settlement` — verify a settled sale and act on any mismatch

## Trust scoring

Five signals, weighted to 100:

| Signal | Weight | Fails when |
|---|---|---|
| Signature validity | 35 | HMAC does not verify against the registry key |
| Registry reputation | 25 | Low reputation, or agent absent from the registry |
| Order size vs product norms | 20 | Quantity exceeds the SKU's normal ceiling |
| Order velocity | 12 | Too many orders in the last hour |
| Account age | 8 | Account younger than a week |

**Verdicts:** ≥70 approve · 45–69 hold · <45 decline.

Four rules override the score outright — a failed signature, a blocklisted agent, an unregistered agent, and a declared amount below catalog price never auto-approve. **Human-in-the-loop:** any order above **₹40,000** is held for the seller regardless of how clean it looks.

## Demo scenarios

Run these from the Studio **Tools** page or through AI Chat.

**1 · Clean sale**
```
place_agent_order   { "order_ref": "ord_1001" }
screen_agent        { "order_id": "ord_1001" }
compute_trust_score { "order_id": "ord_1001" }
```
Established shopper agent buys one keyboard → all checks pass → **98/100, approved**.

**2 · Fraudulent buyer blocked**
```
place_agent_order   { "order_ref": "ord_1002" }
screen_agent        { "order_id": "ord_1002" }
compute_trust_score { "order_id": "ord_1002" }
blocklist_agent     { "agent_id": "agt_ghost_nyx", "reason": "Spoofed signature on a 40-unit order" }
```
Day-old agent, forged signature, 40 headsets (₹1,99,960) → **4 of 5 signals fail → 10/100, declined**, agent banned. Place another order as that agent and it is declined at screening.

**3 · Tampered receipt caught**
```
compute_trust_score { "order_id": "ord_1003" }     # 95/100 — looks clean
verify_receipt      { "order_id": "ord_1003" }     # the money shot
flag_order          { "order_id": "ord_1003", "reason": "Receipt disagrees with chain" }
get_sales_dashboard { }
```
The sale passes screening at 95/100. After settlement the receipt claims **one unit at ₹4,999**; the chain records **ten units at ₹49,990**. The diff lights up red, exposure **₹44,991**, order flagged, revenue-protected counter ticks up.

Other orders worth showing: `ord_1004` (reputable agent, bulk order, held by the ₹40,000 threshold), `ord_1005` (valid signature, 47 orders/hour), `ord_1008` (payment settled to the wrong payee).

## Getting started

**Requirements:** Node.js 20.x (18+ minimum), npm.

```bash
git clone https://github.com/swetank18/Agentic_commerceGateway.git
cd Agentic_commerceGateway
npm install          # server dependencies
npm run build        # installs widget deps if needed, bundles widgets, compiles TypeScript
npm run dev          # development (STDIO transport)
npm run start:prod   # production (STDIO + HTTP SSE)
```

### Test it

```bash
npm test        # builds, then runs all 3 scenarios against the local server over STDIO
npm run test:live   # runs the same suite against the deployed NitroCloud server over HTTP
```

The suite speaks real MCP rather than calling the functions directly, so a green run means the tools work through the protocol: the full tool/resource/prompt surface, all three demo scenarios, the human-review and hold paths, the unknown-order error path, and that `reset_demo` restores fixture state. 31 checks.

### Seller console (browser)

The deployed service serves a seller-facing console next to its MCP endpoint:

**https://agentic-commerce-gateway-6a6cafaa-rudra-srmist.app.nitrocloud.ai/console**

It speaks real MCP over Streamable HTTP straight from the browser — the same wire protocol the test suite uses — so every score, signature check and rupee figure on screen came back from the server. Nothing is canned.

The console calls `/mcp` on whatever origin serves it, so the same page works locally with no edit:

```bash
MCP_TRANSPORT_TYPE=http PORT=3000 npm run start:prod   # then open http://localhost:3000/console
```

The endpoint field accepts any other server if you want to point a local page at the deployed gateway.

The console can also be published to any static host — `vercel.json` deploys `console/` as-is. There is no MCP server on such a host, so the console detects that and falls back to the deployed gateway automatically. The gateway itself must stay on NitroCloud: it is a long-running process with in-memory state, which serverless hosting cannot preserve between requests.

Each case runs the real tool chain and prints the documents as the calls land, with the measured round-trip on every step:

| Case | Chain |
|---|---|
| 01 · Clean sale | `place_agent_order` → `screen_agent` → `compute_trust_score` → approve |
| 02 · Fraudulent buyer blocked | …→ decline → `blocklist_agent` |
| 03 · Tampered receipt caught | …→ `verify_receipt` → `flag_order` → `blocklist_agent` |

Case 03's `flag_order` evidence is built from the field mismatches `verify_receipt` just returned, so the dispute cites the actual diff.

Two query parameters help when recording a demo: `?run=all|clean|fraud|tampered` plays a case on load with no clicking, and `?theme=light|dark` pins the theme (otherwise it follows the OS).

The console is built to the project's design system — the same document primitives, tokens and rules as the MCP widgets, so the two surfaces read as one product.

### Connect it in NitroStudio

1. **Add Server → Nitro Project**, browse to this folder, **Open Project → Studio App Canvas**.
2. Studio runs the server for you; open **Tools** to execute any tool and see its widget preview.
3. **AI Chat** drives the full loop — try *"Investigate order ord_1002 and act on your verdict."*

### Deploy to NitroCloud

Create an app on [nitrocloud.ai](https://nitrocloud.ai), then either:

- **Deploy from GitHub (auto-deploy):** app → **MCP → Deployments → Connect Repository**, pick `main`, then **Link Repository & Enable Auto-Deploy**. Every push redeploys.
- **Deploy from Studio:** App Canvas header → **Link to app…** → **Deploy**.

Wait for status **Live**, then copy the Service URL.

### Connect to ChatGPT

ChatGPT **Settings → Plugins (Apps) → Developer mode**, add a plugin with Server URL `{serviceUrl}/sse`, no auth. (Requires ChatGPT Plus or Pro.)

## Environment variables

None are required — the project runs entirely on bundled fixtures with no external services, no database and no API keys. Optional NitroStack settings (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `NITRO_LOG_LEVEL` | `info` | Log verbosity |
| `MCP_TRANSPORT_TYPE` | `stdio` dev / `dual` prod | `stdio`, `http`, or `dual` |
| `PORT` | `3000` | HTTP transport port |
| `NITROSTACK_APP_MODE` | `universal` | Client compatibility mode |

## Project structure

```
src/
├── index.ts                       bootstrap
├── app.module.ts                  root module
├── console/console.route.ts       serves the seller console on GET /console
├── fixtures/                      mock data (TypeScript modules, not JSON —
│   ├── products.ts                see note below)
│   ├── agents.ts                  8 buying agents + reputation registry
│   ├── orders.ts                  9 orders in ACP and x402 shapes
│   └── settlements.ts             sales receipts + on-chain records
├── modules/gateway/
│   ├── gateway.types.ts           shared domain types
│   ├── gateway.signing.ts         HMAC signing and verification
│   ├── gateway.normalize.ts       ACP / x402 → one schema
│   ├── gateway.store.ts           in-memory state
│   ├── gateway.screening.ts       identity checks + trust scoring
│   ├── gateway.verification.ts    receipt ⟷ chain diff
│   ├── gateway.tools.ts           MCP tools
│   ├── gateway.resources.ts       MCP resources
│   └── gateway.prompts.ts         MCP prompts
└── widgets/app/                   React widgets
    ├── _shared/ui.tsx             shared visual language
    ├── order-review/
    ├── receipt-diff/
    └── sales-dashboard/

console/
└── index.html                     seller console — browser MCP client, single file

scripts/
├── e2e.mjs                        end-to-end suite over real MCP
└── copy-console.mjs               copies the console into dist/ after tsc
```

**Why fixtures are `.ts`, not `.json`:** `nitrostack-cli build` compiles the server with `tsc`, which does not copy loose JSON assets into `dist/`. Authoring fixtures as typed modules means they compile into `dist/` alongside the code — no asset-copy step, no runtime path resolution, and no chance of a fixture going missing once deployed. They are also type-checked against the domain types.

## Money handling

All amounts are integers in **minor units (paise)**; `₹8,499.00` is stored as `849900`. Receipt-vs-chain comparison has to be exact — with floating-point rupees, a genuine tampering diff would be indistinguishable from a rounding artefact.

## Honest scope

The order payloads are **protocol-shaped, not live integrations**. Field names and structure mirror ACP and x402 so the normalizer does real work, but nothing here calls a protocol endpoint, and the "on-chain records" are fixtures — no blockchain is read. The cryptography is real (HMAC-SHA256 over canonical payloads), and the scoring and reconciliation logic is real; the transport and the ledger are simulated.

Out of scope by design: real storefront and payments, AP2/MPP support, authentication and multi-seller tenancy.

## License

MIT
