# BitWiserAI Agent — Locked Scope

> **One line:** A behavioural guard for retail investors. It does not tell you what to buy or sell —
> it tells you what actually matters to *your* portfolio, and it slows you down at the exact moment
> a bias is about to cost you money.

Status: **scope locked**. Anything not in section 6 is out of scope for this build.

---

## 1. Problem

Retail investors — especially first-time and low-capital ones — have more raw market data than
ever and no system that:

- **(a)** explains, in plain language, what is actually relevant to *their specific* holdings right now, and
- **(b)** intervenes at the moment a behavioural bias (FOMO, panic-selling, herding) is about to drive a bad decision.

Existing apps ship data dashboards (noise) or generic robo-templates (not personal). Neither reasons
over the person's real context, and neither adds friction to the decisions that cause roughly
7 in 10 retail investors to lose money.

## 2. Core design principle (non-negotiable)

**The agent informs and reflects. It never recommends.**

| The agent does | The agent never does |
| --- | --- |
| Surfaces which holdings an event actually touches, and by how much | Says "buy", "sell", "hold", "you should" |
| Names the bias pattern it detected and why | Blocks or executes a trade |
| Shows what happened historically after similar decisions | Predicts a price or promises a return |
| Asks one reflective, cooling-off question | Assesses suitability or gives a financial plan |
| Logs the full context shown + the user's own choice | Overrides the user — the decision is always theirs |

This is not ethical decoration. It is the real constraint every fintech behavioural-nudge product
operates under, and it is also the stronger pitch: *"we don't tell you what to do, we stop you doing
something you'll regret."*

Every tool in this server is written to respect that line, and the language rules are enforced in
`generate_reflection_prompt`, which is the only tool that produces user-facing prose.

## 3. Two layers

### Layer A — Contextual Relevance Engine

Markets move constantly; almost none of it touches any given portfolio. The agent reasons:
*does this event actually touch this person's holdings, how much, and why?*

- In: portfolio holdings + a market event
- Out: relevance band (`high` / `medium` / `low` / `noise`), % of portfolio value exposed,
  the affected symbols, and a plain-language explanation
- Key distinction it makes: **broad/sector move vs. company-specific news** — that single distinction
  is what defuses most panic-sells.

### Layer B — Behavioural Intervention Engine

The user states an intent. Before anything executes, the agent detects the bias pattern, surfaces
the context and the historical outcome of similar decisions, and asks one cooling-off question.
The user remains free to proceed.

- In: the user's own words
- Out: pattern + confidence + which phrases triggered it + a reflection prompt
- Then: the decision and everything shown to the user is logged (audit trail + research data point)

## 4. The three bias patterns (exactly three)

Depth over breadth. Three patterns, done properly.

| Pattern | Fires on | What the agent surfaces |
| --- | --- | --- |
| **panic_sell** | sell/exit intent + emotional language ("crashing", "bleeding") + totality ("all", "everything") + urgency ("now") | Is this broad or company-specific? Historical recovery time; what past panic-sellers locked in |
| **fomo_buy** | buy intent + social proof ("everyone's buying") + hype/trend reference + urgency ("before it's too late") | Does this fit the existing portfolio? Outcomes of past crowded momentum entries |
| **herd_follow** | any trade intent justified by *another person's* action ("my friend sold", "the fund managers are dumping") with no personal thesis stated | Your holdings ≠ their holdings; outcomes of past herd exits/entries |

**A trade-intent gate is required for any pattern to fire.** Informational questions
("how's my portfolio doing?") can never trigger an intervention. False positives kill trust, so the
gate is deliberately strict and is one of the three tested scenarios.

## 5. Agentic loop

The LLM is the brain and decides the sequence; the MCP tools are the hands. The intended chain:

```
User: "Market crashing, sell all my tech stocks now"
  → detect_behavioral_signal   panic_sell, confidence 0.88, gate: sell-intent present
  → get_portfolio_snapshot     3 tech holdings = 39% of total value
  → get_market_context         broad dip + tech sector -4.6% today
  → check_relevance_score      HIGH exposure, but broad/sector-wide — no company-specific news
  → get_historical_pattern     similar broad dips: median recovery 42 days; panic-sellers locked ~14% loss
  → generate_reflection_prompt "This move matches the whole market, not news about these three
                                companies. What was your original reason for holding them —
                                has that reason changed?"
  → user decides
  → log_decision_context       full context shown + final choice recorded
```

Note what is absent: no "don't sell", no "hold". Facts, history, one question.

## 6. In scope

**7 tools:** `get_portfolio_snapshot`, `get_market_context`, `check_relevance_score`,
`detect_behavioral_signal`, `get_historical_pattern`, `generate_reflection_prompt`,
`log_decision_context`

**4 mock datasets:** `portfolio.json`, `market-events.json`, `historical-patterns.json`,
`bias-signal-patterns.json`

**Resources:** portfolio, market events, the decision-log audit trail, and the guardian operating rules

**Prompts:** the agent system prompt, a reflection template covering each of the three patterns, and
a plain-language relevance explainer

**2 widgets:** portfolio dashboard (holdings + relevance-scored feed) and the intervention modal
(the demo money-shot)

## 7. Out of scope

Real brokerage / order execution · portfolio sync · multi-user auth · rebalancing or allocation
advice · risk/suitability scoring · backtesting · more than three bias patterns · anything that
produces a buy/sell recommendation.

Real market data was originally on this list too. §9 covers why the standalone web app now has an
optional live-data path — the MCP tool set described in §6 is unaffected and stays on mock data.

All figures are **fabricated mock data** for demonstration. The historical patterns are modelled on
real episodes (2020 crash, 2022 rate-hike selloff, 2021 meme-stock run) but the numbers are
illustrative, not researched, and are labelled as such in the data itself.

## 8. Scope decision: F&O persona

The demo investor was rewritten from a long-term, buy-and-hold profile to an **active trader**
persona that explicitly trades short-horizon swing positions and a leveraged, expiry-bound index
option (a NIFTY weekly call). This was a deliberate replacement, not an addition.

**Why this had to be a full rewrite, not a bolt-on.** The original profile stated: *"Long-term
wealth building. Not trading. Money not needed for at least 5 years."* Holding a weekly-expiry
option alongside that claim is a logical contradiction, not a stylistic mismatch — a technical
reviewer asking *"why does a long-term, not-trading investor hold this?"* has no honest answer if
the profile text is left unchanged. So `stated_goal`, `stated_horizon_years` (now `0`), and
`monthly_contribution`'s narrative all changed to match, and every existing equity holding's
`thesis` was reframed from a long-term reason to a short-term trading reason. The reflection
templates that assumed a long horizon (`guardian.logic.ts` and its mirror in `src/backend/api.ts`)
now branch on `stated_horizon_years` instead of hardcoding "not needed for five years."

**Why the other symbols and datasets were left alone.** `market-events.json`,
`herd-sentiment.json`, and `trade-history.json` still key off the same seven equity tickers
(AAPL, MSFT, NVDA, JNJ, PG, XOM, VOO) — only their per-holding *thesis* text changed. Rebuilding
those datasets around F&O-only instruments would have been a much larger undertaking than "fix
the persona contradiction," with no corresponding gain: an active trader holding recognizable
large-cap swing trades alongside one option position is realistic and required no new detection
logic. The two-persona alternative (a wholly separate F&O trader demo, run alongside the existing
long-term one) was considered and explicitly rejected in favour of this single, consistent persona.

## 9. Scope decision: live data and paper trading

The standalone web app (`src/backend`, `frontend/` — separate from the NitroStack MCP tool set in
§6) gained an optional live-data path and a paper-trading feature. Neither changes the compliance
boundary in §2: nothing here recommends a trade, and nothing connects to a real brokerage.

**Live prices, scoped to what's held.** `src/backend/live-quotes.ts` streams real quotes from
Finnhub for the seven equity/ETF holdings via WebSocket, not a general "any ticker" lookup —
deliberately narrow, matching the instruction that drove this: take the portfolio's own data live,
don't build a market-data platform. No `FINNHUB_API_KEY` configured means everything runs on the
original mock quotes, with the mode visible in the dashboard's badge and every tool's
`quote_mode` field — a missing key degrades, it never fails or fakes data.

**NIFTYCE stays simulated on principle, not by oversight.** There is no free, unauthenticated API
for real-time Indian F&O data — genuine access needs a paid subscription tied to a broker account
(Kite Connect, Upstox). Rather than silently leaving it static while everything else went live, it
gets an explicit local random-walk generator, labelled `simulated` everywhere the value surfaces.

**Trading is paper-only, and restricted to existing holdings.** `POST /api/execute-trade` mutates
the demo portfolio's holdings and cash using the current price — nothing else exists to interpret
free-text intent ("sell all my tech") as a specific quantity, so execution is a deliberate,
separate action, not something "Proceed anyway" triggers implicitly. Buying or selling a symbol
outside the current holdings is rejected: there's no price source for it, and extending the
tradeable universe was explicitly ruled out ("don't add all stocks"). State persists to
`logs/portfolio-state.json` using the same rehydrate-on-boot pattern as the decision log, and the
MCP server reads that same file — a trade made through the web app is visible in NitroStudio too.

## 10. Done means

- [x] Tools registered and individually testable in NitroStudio — 11 tools, 10 resources, 3 prompts
- [x] All three patterns detected from natural language, with the trade-intent gate holding
- [x] A neutral query produces **no** intervention
- [x] Relevance engine distinguishes broad moves from company-specific news
- [x] Reflection prose contains zero directive language (verified by a lint list of banned phrases)
- [x] Every decision logged with the full context that was shown
- [x] Dashboard + intervention widgets build and bind to their tools
- [x] Decision log and portfolio state survive a server restart (rehydrate from disk on boot)
- [x] Live quotes degrade gracefully with no API key; NIFTYCE ticks are clearly labelled simulated
- [x] Paper trades persist and are visible identically from the REST API and the MCP server
- [ ] Widgets eyeballed in NitroStudio against live tool output (light + dark)
- [ ] Deployed to NitroCloud
- [ ] 3-minute demo recorded
