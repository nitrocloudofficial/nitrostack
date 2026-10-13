# Trade Matcher

An MCP server built with **NitroStack** for the **NitroStack × MCP Hackathon** (Amrita Coimbatore, July 26–27).

Trade Matcher reconciles trades between two mock trading systems (System A and System B) — detecting matches, price/quantity discrepancies, and unmatched trades — a common and tedious problem in financial back-office operations. Beyond simple matching, it uses an LLM to *investigate* why a mismatch exists and *propose* corrections for anything it can't confidently explain, while keeping a human explicitly in the loop for every final decision.

---

## What It Does

Most trade mismatches turn out to be benign (timezone differences, settlement lag) — but a few are real errors that need fixing before they cause downstream reporting problems. Analysts normally have to eyeball every single break to tell the difference. Trade Matcher automates the *investigation* work so a human only has to focus on the breaks that genuinely need a decision — and it never applies a fix on its own.

### Pipeline Flow

```
load_trades  →  match_trades  →  investigate_break  →  resolve_or_escalate  →  propose_correction
   (System A/B)    (tolerance-       (LLM reasoning)      (resolved vs           (LLM proposes a
                     based diff)                            escalated)             fix, never applies it)
```

1. **`load_trades`** — loads mock trades from System A, System B, or both
2. **`match_trades`** — pairs trades by symbol, flags anything outside price/quantity tolerance, or missing entirely from one side
3. **`investigate_break`** — an LLM call reasons about *why* the mismatch might exist (FX timing, settlement windows, or genuinely unexplained)
4. **`resolve_or_escalate`** — explained breaks are auto-resolved; unexplained breaks are escalated for human review
5. **`propose_correction`** — for escalated breaks only, a second LLM call conservatively proposes a specific fix (which field, which system, what value) *with reasoning* — but explicitly never applies it
6. **`run_reconciliation`** — orchestrates the full pipeline end-to-end in a single tool call and renders results in a live dashboard widget

### Human-in-the-Loop by Design

This was a deliberate architecture decision, not a limitation:

- The correction-proposal prompt is explicitly instructed to be conservative — if it can't identify a specific, defensible error with confidence, it returns `hasProposal: false` rather than inventing a plausible-sounding fix.
- No tool in the pipeline writes back to either trading system. `propose_correction`'s own tool description states it **"Never auto-applies -- always requires human approval."**
- The dashboard's **Override & Force Match** button is the only path to marking a break resolved from a correction — a manual, logged operator action, not an automatic pipeline decision.

### Live Dashboard Widget

`run_reconciliation` renders directly into an interactive React widget:

- Real-time stats: breaks on screen, auto-resolved count, breaks needing human review
- Cumulative pipeline stats across the server session
- Per-break cards showing the LLM's reasoning, confidence level, and (if escalated) the proposed correction with justification
- One-click override for a human operator to force-resolve a break
- A **Fallback / Demo Mode** toggle — if the live Groq pipeline is ever unavailable, the dashboard gracefully falls back to static demo data instead of showing a broken screen

---

## Tools

| Tool | Description |
|---|---|
| `load_trades` | Loads mock trades from System A, System B, or both |
| `match_trades` | Matches trades across systems by symbol and flags price/quantity discrepancies or missing trades |
| `get_fx_rate_at_time` | Mock FX rate lookup for a currency pair at a given hour |
| `get_settlement_window` | Checks whether a given hour falls inside the known settlement window for an instrument type |
| `investigate_break` | LLM-driven reasoning on whether a break is explained by normal causes (FX timing, settlement windows) or genuinely unexplained |
| `resolve_or_escalate` | Marks an investigated break as resolved or escalated for human review; tracks running accuracy stats |
| `get_accuracy_stats` | Returns running totals of resolved vs escalated breaks |
| `propose_correction` | For escalated breaks, LLM proposes a specific fix with reasoning — never auto-applies it |
| `run_reconciliation` | Orchestrates the full pipeline end-to-end in a single call and renders the live dashboard widget |

---

## Tech Stack

- **NitroStack** — TypeScript MCP framework
- **TypeScript**
- **Zod** — schema validation on every tool input/output
- **Groq** (`llama-3.1-8b-instant`) — LLM reasoning for investigation and correction proposals
- **React** (`@nitrostack/widgets`) — live dashboard widget
- **p-limit** — serializes Groq calls to respect rate limits

---

## Getting Started

### 1. Set up your environment

```bash
cp .env.example .env
```

Add your Groq API key to `.env`:

```
GROQ_API_KEY=your_key_here
```

Get a free key at [console.groq.com/keys](https://console.groq.com/keys).

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
npm run dev
```

### 4. Try it out

Open the project folder in **NitroStudio** to test tools interactively, connect to the running server, and call:

```
run_reconciliation { "system": "both" }
```

This loads mock trades from both systems, matches them, investigates every discrepancy, resolves or escalates each one, and — for anything escalated — proposes a correction. Results render live in the Trade Matcher dashboard.

---

## Known Limitations & Honest Notes

- **Orchestration is currently deterministic, not autonomous.** `run_reconciliation` calls each tool in a fixed sequence written in code — the LLM reasons *within* each step but doesn't yet decide the pipeline's control flow itself.
- **`get_fx_rate_at_time` and `get_settlement_window` are built but not yet wired into `investigate_break`'s LLM call.** The investigation step currently reasons from the trade JSON alone rather than actively querying live FX/settlement data mid-investigation. Top item on our roadmap.
- **In-memory stats reset on server restart.** `getAccuracyStats` is a running counter for demo purposes, not persisted storage.
- **Mock trade data.** System A/B trades are hardcoded fixtures, not connected to real trading systems.

## Roadmap

- [ ] Give `investigate_break` real function-calling access to `get_fx_rate_at_time` and `get_settlement_window`, so the LLM actively investigates rather than pattern-matching from static input
- [ ] Persist reconciliation history and stats beyond a single server session
- [ ] Support real trade feeds instead of mock fixtures
- [ ] Audit log for every human override, for compliance traceability

---

## Team

- Aadidev VS
- Ragul Ponraj
- Bavish Nithin
- Agastya Vuppala

## Project Status

🚀 Working end-to-end pipeline — built during a 48-hour hackathon sprint at Amrita Coimbatore.