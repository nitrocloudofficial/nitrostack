# Project Planning: Multi-Agent Market Signal MCP Server

## 1. Project Summary (paste this as context for every Claude Code session)

We are building a **NitroStack MCP server** that exposes Tools and Resources to an
AI agent client (Claude/ChatGPT via NitroStack). The server powers a **three-agent
adversarial pipeline** that turns raw news/social chatter into a transparent,
reasoned buy/watch/sell signal for a small set of pre-selected tickers — NOT a
black-box price predictor.

**The three agents (each is a separate LLM call/session, coordinated through
shared MCP Resources — NOT direct agent-to-agent API calls):**

1. **Scout Agent** — scans trending news/social mentions for our tracked tickers,
   extracts sentiment + narrative language, writes findings to the `findings_board`
   Resource.
2. **Analyst Agent** — reads `findings_board`, cross-references price/volume
   action, scores signal strength, writes to `signal_log` Resource.
3. **Skeptic Agent** — reads both `findings_board` and `signal_log`, actively
   tries to disprove the signal (source credibility, recycled content, volume
   context), writes a final verdict to `verdict_log` Resource.

The **Next.js widget** reads all three Resources live and renders the handoff
visually: headline found → signal scored → skeptic challenge → final verdict.
**This visible three-act handoff is our main differentiator — it must be on
screen, not just correct in the backend.**

**Tracked tickers for demo (fixed list, do not make this open-ended):**
Pick 3–5 well-known stocks/coins with reliable news coverage (e.g. AAPL, TSLA,
NVDA + 1 crypto like BTC). Confirm final list in the team kickoff and put it
here before anyone starts coding.

**Framing discipline (say this in every demo, keep it in code comments too):**
We surface signals and reasoning to support a human decision. We do not claim
predictive accuracy. Every recommendation must show its reasoning chain.

---

## 2. How MCP Works Here (read this before writing any tool)

- MCP has three primitives: **Tools** (functions the agent calls to do
  something), **Resources** (data the agent can read, like a queryable
  data store), **Prompts** (not used in this project).
- Our server is NOT the AI. It's middleware. The LLM (Scout/Analyst/Skeptic)
  decides *when* to call a tool or read a resource; our server does the actual
  fetching/computing and returns structured JSON.
- **Agent-to-agent communication = shared Resources, not direct calls.** Scout
  never talks to Analyst directly. Scout writes to `findings_board`. Analyst's
  first action is reading `findings_board`. This is called a "blackboard
  architecture" — say this term to judges, it shows you understand the pattern
  deliberately, not accidentally.
- Every tool needs a clear Zod (or NitroStack-equivalent) schema for its inputs
  and outputs. Judges and Claude Code both work better when schemas are explicit
  and typed, not loose JSON blobs.
- Build in NitroStack Studio / SDK using the TypeScript starter template
  pattern (tools live in `*.tools.ts` files, resources in `*.resources.ts`).
  Test each tool individually in NitroStudio via STDIO transport before wiring
  it into an agent flow.

---

## 3. Shared Conventions (agree on these BEFORE splitting up to code)

### Repo structure
```
/server
  /tools
    scout.tools.ts        (Person 1)
    analyst.tools.ts      (Person 2)
    skeptic.tools.ts       (Person 3)
  /resources
    findings-board.resource.ts   (Person 1, consumed by 2 & 3)
    signal-log.resource.ts       (Person 2, consumed by 3)
    verdict-log.resource.ts      (Person 3, consumed by widget)
  /data
    tickers.json           (fixed demo ticker list — agree in kickoff)
    seed-news.json          (fallback pre-fetched news if live API is slow)
/widget
  (Next.js app — Person 4)
/orchestrator
  run-pipeline.ts          (Person 4 — triggers Scout → Analyst → Skeptic in sequence for the demo)
```

### `findings_board` Resource shape (Person 1 owns, everyone reads)
```json
{
  "ticker": "TSLA",
  "timestamp": "ISO8601",
  "headlines": [
    { "source": "string", "text": "string", "url": "string", "sentiment": "positive|negative|neutral", "sentiment_score": -1.0 to 1.0 }
  ],
  "narrative_summary": "1-2 sentence plain-language summary of what's being said",
  "mention_velocity": "spiking|steady|declining"
}
```

### `signal_log` Resource shape (Person 2 owns, Skeptic + widget read)
```json
{
  "ticker": "TSLA",
  "timestamp": "ISO8601",
  "price_reaction": "already_moved|moving_now|not_yet_reacted",
  "signal_score": 0-100,
  "signal_direction": "bullish|bearish|neutral",
  "reasoning": "plain-language explanation citing the findings_board data used"
}
```

### `verdict_log` Resource shape (Person 3 owns, widget reads)
```json
{
  "ticker": "TSLA",
  "timestamp": "ISO8601",
  "challenges_raised": ["string", "..."],
  "credibility_check": "pass|flagged",
  "recycled_content_check": "pass|flagged",
  "volume_context_check": "organic|explained_by_calendar_event",
  "final_verdict": "confirmed_signal|weakened_signal|rejected_signal",
  "verdict_reasoning": "plain-language explanation"
}
```

**Rule: nobody changes these shapes solo.** If you need a new field, post it
in the team chat first — Person 4's widget and everyone's downstream reads
depend on these staying stable.

---

## 4. Work Split

### Person 1 — Scout Agent + News Ingestion + `findings_board` Resource

**Owns:** all trending-news/social scanning logic, sentiment extraction, the
`findings_board` Resource.

**Build steps:**
1. Set up the NitroStack project skeleton (`npx @nitrostack/cli init`) and
   confirm it runs in NitroStudio via STDIO before anyone else builds on it —
   do this first, it unblocks everyone.
2. Build `scan_trending_topics(tickers: string[])` tool:
   - Pull from a free news API (NewsAPI or GNews) filtered to the fixed ticker
     list. Also pull Reddit mentions if time allows (Twitter/X API is
     expensive/restricted — do not plan around it).
   - For each headline, run a sentiment pass (simple LLM call: "rate this
     headline -1 to 1 and classify positive/negative/neutral").
   - Return structured mentions per ticker.
3. Build `detect_narrative_shift(ticker, mentions_over_time)` tool (scoped
   version of "semantic drift"): compare current batch of headline language
   against a small predefined reference wordlist of "technical" terms
   (earnings, guidance, margin, revenue) vs. "hype" terms (moon, rocket,
   YOLO, guaranteed). Report the ratio shifting toward hype as
   `narrative_entropy: low|medium|high`. Keep this simple and explainable —
   do not attempt full embedding-based drift unless Person 1 is comfortable
   with embeddings and has time left over.
4. Write results into the `findings_board` Resource (implement
   `findings-board.resource.ts` with read/write/list functions other agents
   will call).
5. Seed `data/seed-news.json` with 6–10 realistic pre-written headlines
   across your tickers (include at least one planted "hype spike" and one
   "recycled/duplicate headline") as a fallback if live APIs are rate-limited
   during judging.

**Claude Code prompting tips for this part:**
- Give Claude Code the exact `findings_board` JSON shape from Section 3 before
  asking it to write the tool — don't let it invent its own shape.
- Ask it to write the tool function, the Zod schema, and a standalone test
  script that calls the tool directly (not through an agent) so you can verify
  output shape before wiring up the LLM sentiment call.

---

### Person 2 — Analyst Agent + Price/Volume Cross-Check + `signal_log` Resource

**Owns:** price/volume data fetching, signal scoring logic, the `signal_log`
Resource.

**Build steps:**
1. Build `fetch_price_volume(ticker)` tool — use a free market data API
   (Alpha Vantage, Yahoo Finance unofficial endpoint, or CoinGecko for the
   crypto ticker). Cache responses locally to avoid rate limits during demo.
2. Build `cross_check_price_action(ticker, findings)` tool: reads the latest
   entry from `findings_board` for that ticker, compares the mention timestamp
   to price movement in the following hours, classifies
   `already_moved|moving_now|not_yet_reacted`.
3. Build `assess_signal_strength(ticker, findings, price_data)` tool: combines
   sentiment score, mention velocity, and price reaction into a 0–100
   `signal_score` with a `signal_direction`. **Write the scoring logic as
   explicit, commented rules** (e.g. "sentiment > 0.5 AND not_yet_reacted →
   +30 points") — judges will ask how the score is computed, and "explicit
   rules" beats "the LLM decided" every time.
4. Write results into `signal_log` Resource (implement
   `signal-log.resource.ts`).
5. Write a short `historical_pattern_lookup(ticker, pattern_type)` tool that
   checks a small hardcoded `data/historical-signals.json` for "last time this
   pattern happened" — adds credibility to the demo cheaply.

**Claude Code prompting tips for this part:**
- Ask Claude Code to implement the scoring function as a pure, testable
  function first (input: findings + price data, output: score) before wiring
  it into a tool — easier to unit test and to explain to judges.
- When asking Claude Code to fetch price data, explicitly tell it which free
  API you're using and paste the API's actual response shape (fetch one
  example response manually first) — this avoids Claude Code guessing at a
  wrong schema.

---

### Person 3 — Skeptic Agent + Credibility/Anomaly Checks + `verdict_log` Resource

**Owns:** the adversarial "devil's advocate" logic — this is the project's main
novelty, prioritize getting this working over any other unbuilt feature.

**Build steps:**
1. Build `check_source_credibility(headline_source)` tool: maintain a small
   hardcoded list of reputable vs. low-quality/press-release-mill outlets in
   `data/source-credibility.json`; flag headlines from low-quality sources.
2. Build `check_recycled_content(headline_text, ticker)` tool: compares the
   current headline text against prior headlines stored in `findings_board`
   history for the same ticker using a simple text-similarity check (e.g.
   normalized string overlap or a quick embedding cosine similarity if time
   allows) — flag if wording is >X% similar to something from a prior period.
3. Build `check_volume_context(ticker, date)` tool: maintain a small
   hardcoded calendar in `data/market-calendar.json` of known options
   expiration dates / earnings dates / index rebalance dates for the demo
   tickers; flag if a volume spike coincides with one of these rather than
   being purely news-driven.
4. Build `generate_verdict(ticker, findings, signal, challenges)` tool: reads
   `findings_board` and `signal_log`, runs the three checks above, and
   produces the `verdict_log` entry — `confirmed_signal` if nothing flagged,
   `weakened_signal` if one check flags, `rejected_signal` if multiple flag.
5. Write into `verdict_log` Resource (implement `verdict-log.resource.ts`).

**Claude Code prompting tips for this part:**
- This is the most "judgment call" heavy logic — be very explicit with Claude
  Code about the exact flagging thresholds you want (e.g. "flag if similarity
  > 70%") rather than letting it pick arbitrary thresholds, so you can defend
  the numbers in Q&A.
- Ask Claude Code to log *why* each check passed or flagged in plain language
  (not just true/false) — this is what makes the widget's "verdict reasoning"
  field meaningful.

---

### Person 4 — Widget (Next.js), Orchestration, NitroCloud Deployment, Demo

**Owns:** the visible three-act demo experience, deployment, and integration
across all three agents' outputs. This role is the integration point — expect
to spend the last 1–2 hours debugging handoffs between the other three
people's Resources.

**Build steps:**
1. Build `orchestrator/run-pipeline.ts`: a script that, given a ticker,
   triggers Scout → Analyst → Skeptic in sequence (three separate LLM calls,
   each with access to the MCP server's tools/resources) and confirms each
   writes to its Resource before the next one runs. This is what "runs" the
   demo — get a minimal version of this working EARLY (even with stub/fake
   tools) so the other three people can plug real logic in without ever
   working with a completely un-integrated pipeline.
2. Build the Next.js widget with three panels, matching the pipeline stages:
   - **Panel 1 (Scout):** headline feed with sentiment tags, updating live
     from `findings_board`.
   - **Panel 2 (Analyst):** signal score gauge + reasoning text, from
     `signal_log`.
   - **Panel 3 (Skeptic):** challenge checklist (credibility / recycled /
     volume — pass or flagged) + final verdict badge, from `verdict_log`.
   - Use polling (every few seconds) against the Resources to simulate "live"
     updates for the demo — no need for websockets given the time budget.
3. Deploy to **NitroStack Cloud** per the "Completeness" judging requirement —
   confirm the deployed endpoint is reachable by judges before demo day, not
   during it.
4. Write the **demo script**: pick ONE ticker with a planted interesting
   pattern (e.g. a hype-driven headline that gets flagged by the Skeptic) so
   the live demo reliably shows all three panels disagreeing/agreeing in an
   interesting way, rather than depending on random live news being
   demo-worthy.
5. Prepare the framing lines for judges (from Section 1) and rehearse pointing
   at the moment where the Skeptic overrides or weakens the Analyst's signal —
   that's the single most important 10 seconds of the demo.

**Claude Code prompting tips for this part:**
- Give Claude Code the three Resource shapes from Section 3 up front and ask
  it to build the widget against those exact shapes with mock data first,
  before the real resources exist — this lets Person 4 build in parallel
  instead of waiting on Persons 1–3.
- Ask for polling-based state updates explicitly (not websockets) to keep
  scope small.

---

## 5. Workflow & Order of Operations

1. **Kickoff (30 min, everyone):** confirm the fixed ticker list, confirm the
   three Resource JSON shapes in Section 3 (lock these before anyone codes),
   assign roles.
2. **Person 1 sets up the NitroStack project skeleton first** — everyone else
   branches off it once it's confirmed working in NitroStudio.
3. **Person 4 builds a stub orchestrator + widget against mock Resource data
   immediately** — do not wait for real agents to exist.
4. **Persons 1, 2, 3 build their tools + resources in parallel**, testing each
   tool standalone in NitroStudio before wiring into their agent's flow.
5. **Mid-build integration checkpoint:** swap Person 4's mock data for real
   Resource reads from Persons 1–3 as each becomes available — do this
   incrementally, not all at once at the end.
6. **Final hour:** full pipeline run end-to-end on the fixed demo ticker,
   deploy to NitroCloud, rehearse the demo script.

## 6. General Claude Code Instructions (paste at the start of any session)

- Always state which of the three agents (Scout/Analyst/Skeptic) or which
  layer (Resource/Widget/Orchestrator) the current task belongs to.
- Always paste the relevant Resource JSON shape from Section 3 before asking
  Claude Code to write code that reads or writes it — do not let it infer or
  invent the shape.
- Ask for a standalone test script alongside every tool, so each person can
  verify their tool's output independently of the full agent pipeline.
- Keep scoring/flagging logic as explicit, commented rules rather than vague
  LLM judgment calls wherever possible — this is what makes the project
  defensible to judges, and it's also easier for Claude Code to generate
  correctly and for you to debug.
- If Claude Code suggests a live data source that needs a paid/restricted API
  (e.g. Twitter/X, institutional order-book data), stop and fall back to the
  seed/mock data approach — flag it as a "designed but not live in this demo"
  roadmap item instead of trying to fake it as live.
