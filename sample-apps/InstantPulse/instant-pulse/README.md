# InstantPulse

**Business onboarding in seconds, not days.**

A new business that wants to accept payments or borrow money fills out endless paperwork and then waits three to five business days while a bank reviews its documents by hand. InstantPulse is an MCP server that collapses that wait into a single call.

The business connects its bank account. InstantPulse pulls the transaction history, analyses cash flow, revenue stability, expenses, debt patterns and unusual transactions, and returns:

- a **transparent risk score** out of 100, with a reason code for every point awarded or withheld
- a **recommended credit limit**, and which constraint bound it
- a **classification** — 🟢 **Green** ready to proceed · 🟡 **Yellow** human review required · 🔴 **Red** high risk or missing information

Green applications automatically begin **Stripe** payment-account onboarding. Yellow applications land in an officer review queue with a full audit trail. Managers get live dashboards explaining the decision, the risk factors and the recommended next action.

It does not replace credit officers. It removes the repetitive work and makes their decisions faster, consistent and explainable.

---

## The one design decision that matters

**The score is not produced by a language model.**

It comes from a deterministic weighted rules engine whose entire policy — weights, breakpoints, thresholds, blockers, the credit-limit formula — is published as an MCP resource at `instantpulse://policy/risk-model`. Anyone can read the rules and recompute the arithmetic.

A language model never decides anything here. It is used only *after* a decision exists, to narrate it: draft the credit memo, explain the outcome to the business owner, build the officer's checklist.

That split is the point. A credit decision has to be reproducible and defensible months later, in front of someone who is unhappy about it. Anything that can quietly answer differently on a Tuesday cannot do that job.

---

## Quick start

```bash
npm install
```

```bash
npm run verify
```

That builds the server and drives the complete journey over the real MCP protocol — 46 assertions covering all three risk bands, the Stripe band gate, the officer override path, the audit trail, input validation and score determinism. It needs no API keys, and passes identically with or without them.

Then run it:

```bash
npm run dev
```

Point [NitroStudio](https://nitrostack.ai/studio), Claude Desktop or any MCP client at it.

### The 30-second demo

One tool call does everything:

```
decision_run_full_pipeline { businessName: "Northwind Supply Co.", requestedAmount: 50000, persona: "healthy" }
```

→ 🟢 **GREEN**, with a recommended limit and a Stripe onboarding link.

To show all three outcomes side by side:

```
decision_compare_personas {}
```

| Persona | Business | Band | Why |
|---|---|:---:|---|
| `healthy` | Northwind Supply Co. | 🟢 GREEN | Steady revenue, months of runway, light debt |
| `volatile` | Bellwether Events LLC | 🟡 YELLOW | Seasonal swings, thin buffer, unexplained wires |
| `distressed` | Kestrel Auto Detailing | 🔴 RED | Repeated NSF events, negative cash flow |

Personas are generated from fixed seeds, so **the same persona always produces the same verdict**. You can rehearse the demo.

Scores differ slightly between modes — around 82 / 55 / 29 against live Plaid Sandbox, and 98 / 61 / 23 simulated. That is not drift: Plaid Sandbox only ever returns about 90 days of history, and the engine deliberately discounts factors it cannot measure confidently on thin data. **The bands are stable across both**, which is the part the demo depends on.

---

## Configuration

Everything is optional. With no keys at all the full pipeline still runs end to end against a local deterministic generator, and every result is marked `simulated: true`. That is deliberate — a demo that dies because the venue wifi ate a request is a demo that did not happen.

Copy `.env.example` to `.env` and fill in what you have:

| Variable | Effect if unset |
|---|---|
| `PLAID_CLIENT_ID`, `PLAID_SECRET` | Bank data is generated locally instead of fetched from Plaid Sandbox |
| `STRIPE_SECRET_KEY` | Onboarding returns a clearly-marked simulated Connect account |
| `INSTANTPULSE_OFFICER_TOKEN` | Decision overrides run without a credential check |

**Plaid Sandbox only.** Test banks, test users, realistic sample transactions — no real money and no real financial data. **Stripe test mode only**: the server refuses to start onboarding with a live key (`sk_live_…`) rather than risk creating a real connected account.

The `providers` health check always reports which mode you are actually in.

---

## The flow

```
①  onboarding_create_application     business name, industry, amount requested
                 ↓
②  plaid_connect_sandbox_bank        instant sandbox connection (or the real hosted Link flow)
                 ↓
③  plaid_sync_financial_snapshot     accounts, balances, 180 days of transactions, liabilities
                 ↓
④  analytics_analyze_cash_flow       [widget]  metrics + anomaly detection
                 ↓
⑤  risk_score_application            [widget]  score · band · reason codes · credit limit
                 ↓
      ┌──────────┼──────────────────┐
   🟢 GREEN    🟡 YELLOW          🔴 RED
      │           │                  │
⑥ stripe_start  review_list_queue  reason codes returned;
  _onboarding   request_documents  explain_decision drafts
                override_decision   the adverse-action notice
```

`decision_run_full_pipeline` runs ①–⑥ in one call.

---

## What it measures

Seven weighted factors summing to 100, less a capped anomaly penalty:

| Factor | Weight | Signal |
|---|---:|---|
| Cash flow health | 22 | Revenue ÷ outgoings |
| Liquidity buffer | 20 | Days of cash on hand, lowest observed balance |
| Revenue stability | 18 | Coefficient of variation of monthly revenue |
| Debt service capacity | 14 | Existing obligations as a share of revenue |
| Overdraft & NSF history | 12 | NSF fees, negative-balance days |
| Revenue trend | 8 | Month-over-month slope |
| Account tenure | 6 | Observed banking history |

**Hard blockers** force RED regardless of score: under 60 days of history, negative net cash flow, 4+ NSF events, no revenue in 45 days. **Soft flags** cap an otherwise-passing application at YELLOW so a person looks: heavy debt load, unstable revenue, thin liquidity, recurring overdrafts, high-severity anomalies.

Three details worth knowing, because each one fixes a way naive implementations get this wrong:

- **Partial months are excluded from the statistics.** A 180-day window rarely aligns with calendar months, so the first and last buckets are incomplete. Averaging them in makes a business with rock-steady income look erratic purely because its window started on the 14th. They are shown in the UI and excluded from every average.
- **The trend is discounted by its own R².** Fit a line through five months of seasonal revenue and it will confidently report a collapse that is pure noise. The trend factor is pulled toward neutral as the fit weakens, so seasonal businesses are not punished for being seasonal.
- **Recurring payments are exempt from anomaly detection.** Payroll is the largest line on most small-business statements; a naive outlier test flags it every month. A payment that recurs four or more times is explained by definition.

The minimum balance is **reconstructed** by walking the ledger backwards from today's balance, because Plaid reports a balance, not a balance history — and whether an account ever actually went negative is a far stronger signal than the balance that happens to be showing the morning the application was filed.

### Two integration traps this handles

Both were found by running against the live sandbox, and both fail *silently* — which is what makes them dangerous.

- **Plaid delivers transactions in two stages.** A new item returns an initial window of roughly 30 days, then backfills the rest a few seconds later. Worse, the first `/transactions/sync` call on a brand-new item returns `added: []` with `has_more: false` and **no error** — indistinguishable from a genuinely empty account. Taking either at face value scores a business on one month of data, or declines it outright for insufficient history. `PlaidService` polls until the ledger stops growing.
- **NitroStack does not parse tool input with the declared Zod schema.** It converts the schema to JSON Schema so clients can see the tool's shape, but arguments reach the handler unvalidated, and `.default()` values are never applied. A client omitting an optional field hands the handler `undefined`. The `ValidateInput` pipe in `src/common/pipes/` closes the gap, so the declared schema means what it says.

---

## MCP surface

**17 tools**

| Prefix | Tools |
|---|---|
| `onboarding_` | `create_application` · `get_status` · `list_applications` |
| `plaid_` | `create_link_token` · `connect_sandbox_bank` · `exchange_public_token` · `sync_financial_snapshot` · `list_personas` |
| `analytics_` | `analyze_cash_flow` 📊 |
| `risk_` | `score_application` 📊 · `explain_score` |
| `stripe_` | `start_onboarding` · `get_onboarding_status` |
| `review_` | `list_queue` 📊 · `request_documents` · `override_decision` 🔒 · `get_audit_trail` |
| `decision_` | `run_full_pipeline` 📊 · `compare_personas` |

📊 renders a widget · 🔒 guarded

**4 resources** — `policy/risk-model` (the published scoring policy) · `applications/{id}/report` · `glossary/metrics` · `sandbox/personas`

**3 prompts** — `credit_memo` · `explain_decision` (owner / officer / regulator) · `review_checklist`

**3 widgets** — decision dashboard, cash-flow analysis, officer review queue

---

## Guardrails

These are enforced in code, not just documented:

- **Bank access tokens never cross the MCP boundary.** `ApplicationStore.toPublic()` strips them, and the verification suite asserts it on every response.
- **The band actually gates something.** `stripe_start_onboarding` refuses a RED application outright and refuses a YELLOW one until an officer has explicitly approved it.
- **Overrides require a written justification** and are recorded permanently. The original machine decision is preserved, never overwritten — an override supersedes it for workflow purposes but both survive in the audit trail.
- **No adverse decision without a stated reason.** Every RED carries explicit blocker codes with human-readable explanations.

---

## Architecture

```
src/
  common/          types · ApplicationStore (state + audit trail) · officer guard
                   exception filter · ValidateInput pipe
  modules/
    onboarding/    application lifecycle · decision report · glossary · narration prompts
    plaid/         PlaidService (SDK + offline fallback) · seeded personas · transaction normalizer
    analytics/     cash-flow analyzer · anomaly detector          <- pure, no IO
    risk/          risk.policy · risk.engine · credit-limit calc  <- pure, no IO
    stripe/        Connect Express onboarding
    review/        officer queue · overrides · audit · decision journal
    decision/      end-to-end orchestrator
  widgets/app/     three Next.js dashboards
  health/          system + provider mode checks
scripts/
  verify-pipeline.mjs    46-assertion end-to-end suite over real MCP
```

The `analytics` and `risk` modules are pure functions with no IO, no clock beyond an injected `asOf` and no randomness. That is what makes the scoring testable and the decisions reproducible.

**Stack:** NitroStack · TypeScript · Zod · Plaid Node SDK · Stripe Node SDK · Next.js 14 + React 18 widgets

---

## Documentation

- **[Usage guide](docs/USAGE.md)** — run it, drive it, demo it, full tool reference
- **[Deployment guide](docs/DEPLOYMENT.md)** — host on NitroCloud and connect to ChatGPT
- **[Project report](REPORT.md)** — the full write-up: problem, design, bugs found, results, limitations

## Links

- NitroStack docs: <https://docs.nitrostack.ai>
- NitroStudio (local testing): <https://nitrostack.ai/studio>
- NitroCloud (hosting): <https://cloud.nitrostack.ai>
- Plaid Sandbox: <https://plaid.com/docs/sandbox/>
