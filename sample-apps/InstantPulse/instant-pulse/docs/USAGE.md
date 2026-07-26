# How to use InstantPulse

A practical walkthrough: run it, drive it, and demo it.

---

## 1. First run

```bash
npm install
```

Verify everything works before you touch a client. This drives the whole product over the real MCP protocol and needs no API keys:

```bash
npm run verify
```

You should see `46/46 checks passed`. If you see fewer, read the failures — each one names what broke.

Start the server:

```bash
npm run dev
```

This runs the MCP server over **stdio** (the transport local clients use) and the widget dev server on port 3001.

---

## 2. Connect a client

### NitroStudio (best for development)

NitroStudio is a visual testing environment — it lists your tools, lets you fill in arguments from a form, and renders your widgets.

1. Download from <https://nitrostack.ai/studio>
2. Run `npm run dev` in this project
3. In Studio, click **Select Project**, choose the `instant-pulse` folder, and click **Connect**

### Claude Desktop

Add this to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "instantpulse": {
      "command": "node",
      "args": ["C:\\Users\\kkous\\my-mcp-server\\instant-pulse\\dist\\index.js"]
    }
  }
}
```

Run `npm run build` first so `dist/` exists, then restart Claude Desktop.

### Cursor

```bash
npx nitrostack-cli cursor
```

---

## 3. The 30-second demo

One call does the entire journey — create application, connect bank, pull transactions, analyse, score, and start Stripe onboarding:

```
decision_run_full_pipeline {
  "businessName": "Northwind Supply Co.",
  "industry": "wholesale distribution",
  "requestedAmount": 50000,
  "persona": "healthy"
}
```

You get back a 🟢 GREEN decision with a score, a recommended credit limit, seven reason codes and a Stripe onboarding link — plus the decision dashboard widget.

**To show all three outcomes at once:**

```
decision_compare_personas {}
```

| Persona | Band | What it demonstrates |
|---|:---:|---|
| `healthy` | 🟢 GREEN | Clean approval, automatic Stripe onboarding |
| `volatile` | 🟡 YELLOW | Borderline case routed to a human |
| `distressed` | 🔴 RED | Blocked, with explicit reasons |

Personas are seeded, so **the same persona always gives the same verdict**. Rehearse with confidence.

---

## 4. Driving it step by step

If you want to show the pipeline stage by stage rather than in one call:

```
1. onboarding_create_application  { businessName: "Northwind Supply Co.", industry: "wholesale" }
   → returns applicationId — every later call needs it

2. plaid_connect_sandbox_bank     { applicationId, persona: "healthy" }
   → connects a Plaid Sandbox bank account

3. plaid_sync_financial_snapshot  { applicationId }
   → pulls accounts, balances and transaction history

4. analytics_analyze_cash_flow    { applicationId }        [renders the cash-flow widget]
   → monthly revenue vs spending, stability, liquidity, anomalies

5. risk_score_application         { applicationId }        [renders the decision widget]
   → score, band, reason codes, recommended limit

6. stripe_start_onboarding        { applicationId }
   → only succeeds for GREEN
```

---

## 5. The officer workflow (what makes YELLOW mean something)

Run the volatile persona, then:

```
review_list_queue { }
```

Shows the applications waiting on a human, ordered by how close they are to approval. Renders the queue widget.

Try to onboard it before review — **it refuses**:

```
stripe_start_onboarding { applicationId: "<the yellow one>" }
→ "Application is YELLOW and needs a human decision before onboarding."
```

Ask for documents:

```
review_request_documents {
  applicationId, 
  documents: ["Last 2 quarters of signed accounts", "Loan agreement for the SBA payment"],
  officerName: "j.okafor"
}
```

Approve it with a written justification:

```
review_override_decision {
  applicationId,
  newBand: "GREEN",
  justification: "Seasonality confirmed against three years of filed accounts; the two large wires are documented equipment purchases.",
  officerName: "j.okafor"
}
```

Now onboarding succeeds. And the whole history is permanent:

```
review_get_audit_trail { applicationId }
```

The original machine decision is preserved alongside the override — never overwritten.

---

## 6. Proving it is explainable

This is the part judges care about. Three things to show:

**The published policy.** Read the resource `instantpulse://policy/risk-model`. Every weight, breakpoint, threshold and formula the engine uses. Nothing hidden.

**The arithmetic.** 

```
risk_explain_score { applicationId }
```

Shows each factor, the points it earned against its maximum, why, and the sum: `81.7 raw − 0 anomaly penalty = 82/100`.

**A plain-English explanation.** Use the `explain_decision` prompt with `audience: "owner"` (or `"officer"` / `"regulator"`). The language model writes the explanation — it never computes the decision.

Other prompts: `credit_memo` drafts an officer-ready memo, `review_checklist` builds a verification list from that specific application's flags.

---

## 7. Running with real Plaid Sandbox

Everything above works with no credentials — results are marked `simulated: true`.

To use the real Plaid Sandbox API, copy `.env.example` to `.env` and fill in:

```
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
```

Get these from <https://dashboard.plaid.com> → Developers → Keys → **Sandbox**. No real money, no real financial data.

Two differences to expect in live mode:

- **It takes ~15 seconds per application** instead of milliseconds. Plaid delivers transactions in two stages and the server waits for the ledger to settle rather than scoring on partial data.
- **Scores are lower** (roughly 82 / 55 / 29 instead of 98 / 61 / 23). Plaid Sandbox only returns ~90 days of history, and the engine deliberately discounts factors it cannot measure confidently on thin data. The **bands stay the same**, which is what the demo relies on.

For Stripe, add a **test-mode** key:

```
STRIPE_SECRET_KEY=sk_test_...
```

The server refuses to run with a live key (`sk_live_…`).

---

## 8. Full tool reference

| Tool | What it does |
|---|---|
| `onboarding_create_application` | Open an application, returns `applicationId` |
| `onboarding_get_status` | Full current state of one application |
| `onboarding_list_applications` | List applications, filter by status or band |
| `plaid_create_link_token` | Token for the real hosted Plaid Link flow |
| `plaid_connect_sandbox_bank` | Instant sandbox connection by persona |
| `plaid_exchange_public_token` | Exchange a Link public token for access |
| `plaid_sync_financial_snapshot` | Pull accounts, balances, transactions, liabilities |
| `plaid_list_personas` | The available demo businesses |
| `analytics_analyze_cash_flow` | 📊 Cash-flow metrics and anomaly detection |
| `risk_score_application` | 📊 The credit decision |
| `risk_explain_score` | The score arithmetic, factor by factor |
| `stripe_start_onboarding` | Create a Connect account (GREEN only) |
| `stripe_get_onboarding_status` | Refresh Stripe account state |
| `review_list_queue` | 📊 Applications awaiting a human |
| `review_request_documents` | Ask the applicant for evidence |
| `review_override_decision` | 🔒 Officer decision with justification |
| `review_get_audit_trail` | Complete append-only history |
| `decision_run_full_pipeline` | 📊 Everything, in one call |
| `decision_compare_personas` | All three bands side by side |

📊 renders a widget · 🔒 requires an officer credential when configured

**Resources:** `instantpulse://policy/risk-model` · `instantpulse://applications/{id}/report` · `instantpulse://glossary/metrics` · `instantpulse://sandbox/personas`

**Prompts:** `credit_memo` · `explain_decision` · `review_checklist`

---

## 9. Troubleshooting

**"Application not found"** — the `applicationId` is wrong or the server restarted with a cleared data directory. Run `onboarding_list_applications` to see what exists.

**"Application has no financial snapshot"** — you skipped `plaid_sync_financial_snapshot`.

**Live Plaid returns no transactions** — sandbox items take a few seconds to materialise. The server already polls for this; if it persists, check your keys are **Sandbox** keys and `PLAID_ENV=sandbox`.

**A live run fails with a network error** — Plaid Sandbox occasionally times out. Re-run. To make a demo bulletproof, unset `PLAID_CLIENT_ID` and the pipeline runs fully offline.

**Widgets do not render** — run `npm run build` (widgets are bundled at build time), and make sure your client supports MCP UI widgets. NitroStudio and ChatGPT do.
