# 2-Minute Demo Script — Personal Finance & Tax Copilot

**Goal:** land two things judges remember — *provably live data* and a *deterministic
multi-agent council that can't invent a number* — inside a tight, listenable pitch.

## Before you record
- Have the **deployed NitroCloud link** open, or NitroStudio → **AI Chat** with `GVR` connected.
- Keep this scenario on a sticky note: *"I'm 40, ₹30L salary, ₹3L in 80C, HDFC Top 100 fund,
  home loan at 9% with ₹2L spare."*
- Open tabs/panels you'll show: the **finance-plan** dashboard, the **Data Freshness** widget,
  the **council-verdict** widget.

## The script (timed)

**[0:00–0:12] Hook**
> "Every year, millions of Indians overpay their taxes and never learn their real investment
> returns — because the tools are either fake demos or locked behind a paywall. We built a
> finance copilot that runs entirely on live, real data."

**[0:12–0:25] What it is**
> "It's an MCP server built on NitroStack — 16 tools, 8 resources, 3 prompts, 15 interactive
> widgets. You just talk to it. Say 'plan my taxes,' and it orchestrates a team of specialist
> tools over live market data."

**[0:25–1:05] Live demo — the money shot**
- Type the scenario, end with *"— plan everything."*
- As `plan_my_finances` streams, read the progress aloud: *"watch — it's calculating tax,
  fetching live NAV, surfacing deadlines…"*
- On the **finance-plan dashboard**: *"New regime saves ₹2 lakh over old. Here's the real XIRR
  on the HDFC fund — not a guess, the actual return from NAV history. And the next filing
  deadline."*
- Open the **Data Freshness** widget: *"Every number you just saw was fetched live, right now —
  here's the AMFI NAV date and today's timestamp. Nothing is mocked."*  ← **key beat**

**[1:05–1:35] The differentiator — the Council**
- *"Now the real question: should they invest the ₹2 lakh or prepay the loan? Watch."*
- Run `convene_council` (or ask it in chat). Show the three agents deliberate, **disagree**, and
  the reconciler decide.
> "This is a multi-agent debate — but here's the twist: it's **deterministic**. Zero extra LLM
> calls, zero cost, and it can **never hallucinate a number**. Same question, same answer, every
> time. Most teams burn 3× the tokens on parallel LLMs and still make figures up. We don't."

**[1:35–1:50] Robust + real**
> "Live AMFI and RBI data, all three MCP primitives — tools, resources and prompts —
> rate-limited, input-hardened, graceful errors."
- Type a bad IFSC (`123456789`) → show the clean error. *"Feed it garbage? It never breaks."*

**[1:50–2:00] Close**
> "A production-grade finance copilot on real Indian data — scalable to every taxpayer in the
> country. Built entirely on NitroStack."

## One-liners to have ready (if asked)
- **Why not 3 real LLM agents?** "NitroStack tools can't call an LLM internally, and we didn't
  want to — deterministic scorers give the same debate UX at zero cost and zero hallucination."
- **Is the data really live?** "Two keyless public sources — AMFI NAV via MFAPI.in and Razorpay
  IFSC — fetched per request. The `finance://market/snapshot` resource prices 9 funds live."
- **How is it secure?** "Env-gated API-key guard, per-tool rate limits, input coercion, no PII
  stored, nothing written to disk — see the `finance://security` resource."
