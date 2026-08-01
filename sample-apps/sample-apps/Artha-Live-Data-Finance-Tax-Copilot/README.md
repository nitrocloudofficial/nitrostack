# Artha — Personal Finance & Tax Copilot 🪙

> **Your money, planned on live data — not guesses.**
> An MCP server (NitroStack TypeScript SDK) that turns any MCP host — Claude, ChatGPT,
> NitroChat, NitroStudio — into a finance & tax copilot for Indian taxpayers.

![NitroStack](https://img.shields.io/badge/built%20with-NitroStack-2563eb)
![MCP](https://img.shields.io/badge/MCP-16%20tools%20·%208%20resources%20·%203%20prompts-10b981)
![Data](https://img.shields.io/badge/data-live%20%26%20keyless-f59e0b)
![Tests](https://img.shields.io/badge/tests-node%20--test%20passing-16a34a)

*Artha (अर्थ) — the Sanskrit word for wealth & prosperity.*

---

## The problem
Indians routinely **overpay tax** (wrong regime, wasted deduction caps) and can't see the **real
return** on their investments — because the tools are either paywalled advisory products or demo
apps running on **mocked numbers**. A straight, trustworthy answer to *"what's my tax, what are my
real returns, and should I invest or prepay my loan?"* is genuinely hard to get.

## What it is
Ask in plain English — *"I earn ₹30L, have an HDFC fund and a home loan — plan my taxes and should
I invest or prepay?"* — and Artha orchestrates **16 tools over live, keyless, non-mocked data**:
real mutual-fund NAVs & XIRR from AMFI, real bank verification from Razorpay, and the actual
**Finance Act 2025** tax law — returning one coherent, cited answer.

## Why it stands out
- **🔴 Real data, provably.** Two genuinely live keyless sources (AMFI NAV via MFAPI.in, Razorpay
  IFSC) + a `get_data_freshness` tool that timestamps every source on screen. Most demos mock this;
  Artha doesn't.
- **⚖️ A deterministic advisory council.** *"Invest or prepay?"* is answered by three pure-logic
  lenses (tax / growth / safety) reconciled by a weighted vote — the multi-agent debate UX with
  **zero extra LLM calls and zero hallucinated numbers** (same input → byte-identical output, proven
  by tests).
- **🧩 All three MCP primitives, done right** — 16 tools · 8 resources (incl. a *live* market
  snapshot) · 3 prompts — plus rate-limiting, input hardening, a global exception filter, and a
  `node --test` suite.

---

## Architecture

```
src/
├── index.ts                 # bootstrap + process-level crash guards
├── app.module.ts            # @McpApp root — imports every module
├── common/                  # framework-agnostic utilities
│   ├── http.ts              #   keyless fetch (timeout, typed errors)
│   ├── xirr.ts              #   XIRR (Newton–Raphson + bisection) & CAGR
│   ├── validate.ts          #   input coercion (numbers, enums, dates)
│   ├── format.ts            #   ₹ / % formatting
│   ├── disclaimer.ts        #   advice disclaimer
│   ├── exception.filter.ts  #   global @ExceptionFilter
│   └── apikey.guard.ts      #   optional env-gated @Guard
├── data/                    # provided market-news dataset (CSV)
└── modules/
    ├── tax/         # old vs new regime + deduction optimizer (Finance Act 2025)
    ├── funds/       # NAV / returns / XIRR + live scheme universe   (api.mfapi.in)
    ├── bank/        # IFSC / branch verification                    (ifsc.razorpay.com)
    ├── compliance/  # statutory tax due-date calendar
    ├── gains/       # capital-gains estimator (equity vs debt rules)
    ├── rates/       # RBI/FD benchmarks · EMI-vs-invest · data freshness
    ├── news/        # market news & sentiment (dataset-backed)
    ├── council/     # ⚖️ deterministic advisory council
    ├── resources/   # 📚 read-only @Resource endpoints
    └── copilot/     # 🧠 orchestrator (plan_my_finances) + prompts
```

Each domain module follows the NitroStack pattern: `*.data.ts` → `*.service.ts` (`@Injectable`) →
`*.tools.ts` (`@Tool` controller) → `*.module.ts` (wiring, `exports` its service).

---

## MCP surface

### 🔧 Tools (16)
| Tool | What it does | Live source |
|------|--------------|-------------|
| `calculate_income_tax` | Old vs new regime, 87A rebate, surcharge, cess; recommends cheaper | Finance Act 2025 |
| `optimize_deductions` | Flags 80C over-cap waste & unused 80D/NPS/24(b) headroom | — |
| `search_mutual_funds` | Find AMFI scheme codes (curated + relevance-ranked) | api.mfapi.in |
| `get_fund_nav` | Latest NAV for a scheme | api.mfapi.in |
| `calculate_fund_returns` | Real absolute return + **CAGR + XIRR** | api.mfapi.in |
| `verify_bank_ifsc` | Bank/branch/address + NEFT/RTGS/IMPS/UPI | ifsc.razorpay.com |
| `get_upcoming_deadlines` | Next statutory dates + days remaining | — |
| `get_compliance_calendar` | Full calendar, filterable | — |
| `estimate_capital_gains` | LTCG/STCG (equity) or slab (debt) tax before selling | api.mfapi.in |
| `get_benchmark_rates` | RBI repo + representative FD rates | RBI (dated) |
| `compare_emi_vs_investment` | Prepay-loan vs invest, projected over a horizon | — |
| `get_data_freshness` | Timestamps every data source (live AMFI ping) | api.mfapi.in |
| `get_market_news` | Filter market news/events by sector/sentiment/date | dataset |
| `get_market_sentiment` | Aggregate sentiment/impact summary | dataset |
| **`convene_council`** | **Deterministic advisory council → weighted recommendation** | — |
| **`plan_my_finances`** | **Orchestrates the whole plan** (MCP Task, streams progress) | all of the above |

### 📚 Resources (8)
`finance://tax/slabs/2025-26` · `finance://compliance/calendar` · `finance://funds/popular` *(live)* ·
`finance://market/snapshot` *(live Nifty-50 NAVs)* · `finance://market/events` · `finance://data-sources` ·
`finance://methodology` · `finance://security`

### 💬 Prompts (3)
`finance_copilot` · `tax_optimization` · `invest_or_prepay`

---

## The agentic demo flow
> *"I'm 40, ₹30L salary, ₹3L in 80C, HDFC Top 100 fund, home loan at 9% with ₹2L spare — plan everything."*

`plan_my_finances` runs the workflow (streaming progress when called as a task):
**🧮 tax → 📈 live fund returns → 🧾 deduction audit → ⚖️ invest-vs-prepay → 📅 deadlines → 🧠 one plan.**
Every number is derived from a tool call — nothing is fabricated. For the invest-vs-prepay call it
convenes the deterministic council (three lenses that can genuinely disagree, then reconcile).

*Verified example:* ₹18L with ₹2L ELSS → old **₹2,96,400** vs new **₹1,50,800** → **new saves ₹1,45,600**
(80C auto-capped at ₹1.5L); XIRR/CAGR from live NAV history; council reproducible (byte-identical).

---

## Quick start
```bash
npm install          # backend deps
npm run widget install   # widget (Next.js) deps
npm run dev          # start the MCP server (stdio + http)
```
No API keys required — both external APIs are free and public. Then connect **NitroStudio**, or embed
the **NitroChat** widget on any page.

```bash
npm test             # build + node --test suite
```

## Deployment (NitroStack Cloud)
Deploy the repo, then in the project **Environment variables** set:
```
NITROSTACK_APP_MODE=universal
```
Optional: `RBI_REPO_RATE`, `RATES_ASOF`, `API_KEY` (enables the auth guard). The market-news dataset
in `src/data/` ships automatically.

## Security
Surfaced at runtime via the `finance://security` resource:
- **Auth** — optional API-key `Guard` (off unless `API_KEY` is set; keyless demo).
- **Input validation** — Zod + defensive coercion (numbers, enums, dates) in every service.
- **Rate limiting** — `@RateLimit(30/min)` on all outbound-API tools and orchestrators.
- **Error handling** — global `ExceptionFilter` + process-level guards; no stack traces leak.
- **Privacy** — no PII persisted, nothing written to disk, HTTPS + timeouts, no secrets.

## Data & freshness
| Source | Kind | Use |
|--------|------|-----|
| AMFI / MFAPI.in | 🟢 live (per request) | NAV, history, XIRR, scheme master |
| Razorpay IFSC | 🟢 live (per request) | Bank / branch verification |
| RBI repo / FD | 🟡 reference (dated, env-overridable) | Benchmark "safe" rates |

Run `get_data_freshness` to see the live NAV date + fetch timestamp on screen.

## Disclaimer
Informational & educational only — **not** investment, tax, or financial advice. Figures are
estimates; verify with a **SEBI-registered adviser** or a qualified **CA** before acting. Tax slabs
are FY 2025-26 per the **Finance Act 2025** (incometax.gov.in).

## Links
- NitroStack docs: <https://docs.nitrostack.ai>
- Demo script: [DEMO.md](DEMO.md) · Community posts: [COMMUNITY.md](COMMUNITY.md)

_Built for the NitroStack × Amrita University Coimbatore MCP Hackathon._
