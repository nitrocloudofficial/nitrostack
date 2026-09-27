# InstantPulse — Project Report

**AI-powered business onboarding and credit pre-screening, built as an MCP server on NitroStack.**

Status: complete and verified · 19 tools · 4 resources · 3 prompts · 3 dashboards · 46/46 end-to-end checks passing against both live Plaid Sandbox and offline mode.

---

## 1. The problem

When a new business wants to accept card payments or borrow money, it fills in forms, uploads bank statements, and then waits **three to five business days** while someone at the bank reads those statements by hand.

That wait is expensive for everyone. The business cannot trade. The bank pays skilled analysts to do repetitive work. And because the review is manual, two analysts looking at the same statements can reach different conclusions — with no written record of why.

The evidence needed to make the decision is already sitting in the business's bank account. The delay is not analysis; it is queueing.

## 2. What InstantPulse does

The business securely connects its bank account. InstantPulse then:

1. Pulls the transaction history
2. Analyses cash flow, income stability, expenses, debt patterns and unusual transactions
3. Produces a **transparent risk score** out of 100, with a written reason for every point awarded or withheld
4. Recommends a **credit limit**, and says which constraint capped it
5. Classifies the application:
   - 🟢 **Green** — ready to proceed
   - 🟡 **Yellow** — human review required
   - 🔴 **Red** — high risk or missing information
6. For Green applications, automatically starts **Stripe** payment-account onboarding
7. Gives managers a live dashboard explaining the decision, the risk factors and the next action

Three to five days becomes **one call**. In offline mode a full decision takes about 30 milliseconds; against the live Plaid API it takes about 15 seconds.

Crucially, it does **not** replace credit officers. Yellow applications go into a real review queue where an officer can request documents or override the decision — with a written justification that is recorded permanently.

## 3. The decision that shaped everything else

**The risk score is not produced by a language model.**

It comes from a deterministic weighted rules engine. The complete policy — every weight, threshold and formula — is published as a machine-readable MCP resource at `instantpulse://policy/risk-model`. Anyone can read the rules and recompute the arithmetic themselves.

A language model is used only *after* a decision exists, and only to write about it: draft the credit memo, explain the outcome to the business owner, build the officer's checklist.

This split was deliberate. A credit decision has to be reproducible and defensible months later, in front of someone who is unhappy about it. A model that can quietly answer differently on a Tuesday cannot do that job. It also means the system can state, truthfully, that **no automated adverse decision is ever issued without an explicit, listed reason** — which is what fair-lending rules actually require.

## 4. How it is built

### The flow

```
①  Create application            business name, industry, amount requested
②  Connect bank                  Plaid Sandbox — test banks, test users, no real money
③  Pull transactions             accounts, balances, ~180 days of history, liabilities
④  Analyse cash flow             metrics + anomaly detection          [dashboard]
⑤  Score                         reason codes, band, credit limit     [dashboard]
                                          │
        ┌─────────────────────────────────┼──────────────────────────┐
     🟢 GREEN                          🟡 YELLOW                  🔴 RED
   Stripe onboarding            officer review queue         reasons returned,
   starts automatically         request docs / override      adverse-action notice
```

`decision_run_full_pipeline` runs all of it in one call.

### The architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MCP CLIENTS   NitroStudio · Claude Desktop · ChatGPT       │
└───────────────────────────┬─────────────────────────────────┘
                            │  MCP (stdio or Streamable HTTP)
┌───────────────────────────▼─────────────────────────────────┐
│         InstantPulse MCP Server (NitroStack)                │
│  validate → rate limit → cache → guard → filter             │
│                                                             │
│  onboarding │ plaid │ stripe │ review   ← tool controllers  │
│         └────────┴───┬───┴────────┘                         │
│              decision (orchestrator)                        │
│                      │                                      │
│         analytics ───┴─── risk        ← pure, no I/O        │
│                      │                                      │
│         ApplicationStore + audit trail                      │
└──────────┬───────────────────────────┬──────────────────────┘
           │ Plaid SDK (Sandbox)       │ Stripe SDK (test mode)
    ┌──────▼──────┐             ┌──────▼──────┐
    │ PLAID       │             │ STRIPE      │
    │ SANDBOX     │             │ CONNECT     │
    └─────────────┘             └─────────────┘
```

The `analytics` and `risk` modules are **pure functions** — no network calls, no database, no clock beyond a date passed in, no randomness. That is what makes the scoring testable and the decisions reproducible. Everything that touches the outside world lives in the other modules.

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| MCP framework | **NitroStack** | Decorator-based modules, dependency injection, guards, caching, rate limiting, widget binding |
| Language | **TypeScript** (strict, ESM) | Type safety across a domain with a lot of shapes |
| Validation | **Zod** | One schema definition serves both the tool contract and runtime validation |
| Bank data | **Plaid Node SDK**, Sandbox only | Test banks, test users, realistic transactions, zero real money |
| Payments | **Stripe Node SDK**, test mode only | Real Connect onboarding flow, no real accounts |
| Scoring | Hand-written rules engine | Explainable, testable, reproducible |
| Storage | In-memory + JSON snapshot | Hackathon-appropriate; hidden behind an interface so it swaps for a database |
| Dashboards | **Next.js 14 + React 18** | Renders natively in both NitroStudio and ChatGPT |

## 5. How the scoring works

Seven factors, weighted to total 100:

| Factor | Weight | What it measures |
|---|---:|---|
| Cash flow health | 22 | Does revenue cover outgoings? |
| Liquidity buffer | 20 | How many days could it survive on current cash? |
| Revenue stability | 18 | Is income steady or lumpy? |
| Debt service capacity | 14 | How much of revenue already goes to debt? |
| Overdraft & NSF history | 12 | Bounced payments, negative balances |
| Revenue trend | 8 | Growing or shrinking? |
| Account tenure | 6 | How much history is there to judge? |

An **anomaly penalty** of up to 20 points is then subtracted — unexplained large wires, statistical outliers, high-risk merchants, revenue spikes, long gaps with no income, single-payer dependence.

On top of the score sit two override mechanisms:

- **Hard blockers** force Red no matter how good the score: under 60 days of history, negative net cash flow, four or more bounced payments, no income for 45 days.
- **Soft flags** cap an otherwise-Green application at Yellow so a person looks: heavy debt load, unstable revenue, thin cash, recurring overdrafts, high-severity anomalies.

The **credit limit** is the *lowest* of three independent ceilings — what turnover supports, what cash reserves support, what the business can afford to service — not an average of them. A business is only as creditworthy as its weakest answer, and the system reports which ceiling bound the number so an officer can see exactly what would have to change to justify lending more.

## 6. Engineering decisions worth explaining

**Reproducible demo personas.** Four test businesses generated from fixed random seeds, so `healthy` always scores the same, always lands Green. A demo whose verdict changes between run-throughs is a demo you cannot rehearse.

**A full offline fallback.** With no API keys at all, the entire pipeline still runs end to end, clearly marked `simulated: true`. Venue wifi is a real risk at a hackathon; this removes it.

**The band actually gates something.** `stripe_start_onboarding` refuses a Red application outright, and refuses a Yellow one until an officer has explicitly approved it. A classification that does not control anything is decoration.

**Bank tokens never leave the server.** `ApplicationStore.toPublic()` strips access tokens and the raw transaction ledger before anything crosses the MCP boundary. The test suite asserts this on every single response — a bank token in a chat transcript is a real incident, even a sandbox one.

**Overrides supersede, never overwrite.** When an officer changes a decision, the original machine decision is preserved alongside it. Both survive in the audit trail.

## 7. Problems hit, and how they were fixed

This is the part that actually took the time. Six real bugs, all of which produced *plausible but wrong* answers rather than crashes — which is what made them dangerous.

**1. Partial months corrupted the statistics.**
A 180-day window rarely lines up with calendar months, so the first and last months are incomplete. Averaging them in made a business with rock-steady income look erratic — stability dropped from 0.82 to 0.63 purely because the window started mid-month. *Fix:* partial months are shown in the UI but excluded from every average.

**2. A trend measured through noise was scored as fact.**
Fitting a line through five months of seasonal revenue produced a confident "−23% per month collapse" that was pure noise. *Fix:* the engine computes the regression's R² alongside the slope and pulls the score toward neutral as the fit weakens. Seasonal businesses are no longer punished for being seasonal. The same confidence-damping idea was later applied to revenue stability.

**3. Payroll was flagged as suspicious every month.**
Payroll is the largest line on most small-business statements, so a naive outlier test flags it twice a month, every month. *Fix:* a payment that recurs four or more times is exempt — it is explained by definition. The threshold is four rather than three specifically so a business making exactly three unexplained wires cannot hide behind the exemption.

**4. Plaid returns an empty ledger that looks like a finished one.**
The first `/transactions/sync` call on a new Plaid item returns zero transactions, `has_more: false`, and **no error** — indistinguishable from a genuinely empty bank account. Transactions actually arrive in two stages: about 30 days first, then a backfill a few seconds later. Taking the first response at face value meant scoring a healthy business on one month of data, or declining it outright for "insufficient history." *Fix:* poll until the ledger stops growing.

**5. The transaction generator drifted off the calendar.**
Rent, payroll and loan payments were being laid on rolling 30-day blocks rather than real calendar dates. They drifted across month boundaries, so one month collected two rent payments and the next collected none — enough to flip net cash flow negative and hard-block a healthy applicant. *Fix:* generate on real calendar dates.

**6. The framework never validated tool input.**
NitroStack converts a tool's Zod schema to JSON Schema so clients can see its shape, but it passes the client's raw arguments straight to the handler. Nothing is validated, and `.default()` values are silently ignored. A client omitting an optional field hands the handler `undefined`, which propagated as `NaN` into date arithmetic and surfaced three layers down as the unhelpful message "Invalid time value." *Fix:* a `ValidateInput` pipe applied to all 19 tools, so the declared schema means what it says. **This affects any NitroStack MCP server, not just this one.**

Bugs 4, 5 and 6 were only found by running against the **live** Plaid API. The offline path had been hiding all three.

## 8. Testing

`npm run verify` spawns the real server and drives it over the actual MCP protocol — the same JSON-RPC a real client speaks, not internal function calls. **46 assertions** covering:

- All three personas reaching their intended bands
- Every decision carrying a full set of reason codes with real explanations
- Stripe refusing Red, and refusing Yellow until an officer approves
- Officer credential rejected when wrong, accepted when right
- The original machine decision surviving an override
- The audit trail recording the override and its justification
- The published policy being readable, and the score arithmetic summing correctly
- Input validation: defaults applied, out-of-range values rejected
- Determinism: the same persona twice gives an identical score and limit
- **No response ever containing a bank access token**

It passes 46/46 in both modes — with live Plaid Sandbox credentials, and with none at all.

## 9. Results

| Persona | Live Plaid Sandbox | Offline | Band | Why |
|---|---:|---:|:---:|---|
| Northwind Supply Co. | 82 | 98 | 🟢 GREEN | Steady revenue, months of runway, light debt |
| Bellwether Events LLC | 55 | 61 | 🟡 YELLOW | Seasonal swings, thin buffer, unexplained wires |
| Kestrel Auto Detailing | 29 | 23 | 🔴 RED | Repeated bounced payments, negative cash flow |

Scores differ between modes because Plaid Sandbox only ever returns ~90 days of history and the engine deliberately discounts what it cannot measure confidently. **The bands are identical in both** — which is the part that matters.

## 10. Honest limitations

Things a reviewer should know, rather than discover:

- **Storage is not production-grade.** Application records live in memory with a JSON file behind them. On a serverless host that scales to zero, records will not survive a cold start. The storage layer is isolated behind one file so swapping in a database changes nothing else.
- **Sandbox only, by design.** Plaid is locked to Sandbox and Stripe refuses live keys. Nothing here has touched real money or real financial data.
- **The scoring policy is not calibrated against real defaults.** Weights and thresholds are reasoned, internally consistent and fully documented — but they are not fitted to historical loan performance, because no such dataset was available. A real lender would tune these against their own book.
- **Live runs occasionally fail on network, not logic.** Plaid Sandbox timed out once during testing. Offline mode is unaffected.
- **Thin data lowers confidence, and that is intentional.** With only ~90 days of history, stability and trend factors get pulled toward neutral. A business is not penalised for it — but it will not score as highly as one with a full year of history either.

## 11. What would come next

1. **Persistence** — swap the JSON store for Postgres; the interface already isolates it.
2. **Policy calibration** — fit the weights against real default data and version the policy so historical decisions remain reproducible under the policy that produced them.
3. **Webhooks instead of polling** — Plaid can push a notification when the transaction backfill lands, removing the ~15-second wait.
4. **More products** — Plaid Liabilities and Income are already partially wired; Identity would enable KYC verification.
5. **Authentication** — NitroStack ships JWT/OAuth modules; a production deployment needs one.
6. **Monitoring the model** — the decision journal already tracks approval rates and officer override rates. A climbing override rate is the clearest signal that the thresholds no longer match how officers actually underwrite.

## 12. Summary

InstantPulse turns a three-to-five day manual bank review into a single call that returns an explainable credit decision and, where appropriate, starts payment onboarding automatically.

The technically interesting part is not the speed — it is that the speed comes with **more** accountability rather than less. Every decision is reproducible, every point of the score has a written reason, the entire policy is published for inspection, and no language model ever decides anything. Where the model is uncertain, the system says so and routes the case to a person, rather than guessing confidently.

That is the difference between automating a decision and automating the paperwork around it. This project does the second.

---

*Built with NitroStack · TypeScript · Zod · Plaid Sandbox · Stripe test mode · Next.js*
*See [`docs/USAGE.md`](docs/USAGE.md) to run it and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) to host it.*
