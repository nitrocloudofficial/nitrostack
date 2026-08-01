# Follow-Through

**The MCP agent that remembers what everyone promised — so nothing quietly dies.**

Follow-Through is a TypeScript Model Context Protocol (MCP) server built on
[NitroStack](https://nitrostack.ai). It listens to meeting transcripts, extracts
every spoken commitment (who promised what, to whom, by when, and with what
confidence), persists it durably, and then keeps working autonomously: it polls
Slack, email, and Linear for real evidence of completion, sends escalating
nudges when deadlines slip, and escalates to a manager's inbox when a
commitment goes silent — all without a human having to re-prompt it.

For a demo, a compressed virtual clock (`simulate_days_passing`) makes a full
week of follow-up observable in seconds, and a companion widget renders the
live commitment board.

---

## Why this exists

Most action items from meetings never make it into a tracker. They live in a
transcript nobody re-reads, get half-remembered, and quietly expire. Follow-Through
closes that loop in three moves:

1. **Capture** — the moment a promise is spoken, it becomes a durable record
   with an auto-created Linear ticket.
2. **Verify** — instead of nagging blindly, the agent checks Slack and email for
   *evidence* that the work actually got done.
3. **Escalate gracefully** — if there's no evidence and no response, nudges get
   more specific, and a human manager is looped in with full context.

---

## Key features

| Feature | What it does |
|---|---|
| **Commitment extraction** | Parses transcripts into structured commitments via a pluggable LLM (Anthropic, OpenRouter) **or** a fully offline deterministic parser — same output shape either way. |
| **Confidence triage** | Each commitment is graded `committed` / `hedged` / `aspirational`. Aspirational wishes are never auto-chased. |
| **Durable store** | Pure-JS JSON-file persistence (atomic writes, serverless-safe) with a virtual clock, so the whole lifecycle can be simulated deterministically. |
| **Evidence-based "done"** | Completion is decided by real signal — a Slack message or email from the owner with matching keywords and a completion signal — not by assumption. |
| **Escalation ladder** | `open → nudged_1 → nudged_2 → escalated` with gentle-then-specific reminders, tuned per confidence tier. |
| **Linear integration** | Every commitment gets a ticket (LIN-48x); escalated tickets gain a manager watcher and a contextual comment. |
| **Live dashboard widget** | A Next.js widget auto-attached to `query_commitments` renders the commitment board with status, evidence, and nudge history. |
| **Demo controls** | `simulate_days_passing` and `reset_demo` compress a multi-day chase into seconds for a deterministic demo. |
| **Zero-cost default** | Runs fully offline with no API key; free OpenRouter models are optional. |

---

## How it works

```
                 ┌────────────────────────────────────────────────────────┐
   transcript    │                        App                             │
  ─────────────► │  ingestion ──► store ──► evidence ──► nudge ──► linear  │
                 │                     ▲                                 │
                 │                     │  scheduler (poll loop / clock)   │
                 │      widget ◄───────┴── query_commitments              │
                 └────────────────────────────────────────────────────────┘
```

### Modules

| Module | Responsibility |
|---|---|
| `ingestion` | Extract structured commitments from transcripts (LLM or offline). |
| `store` | JSON-file persistence: commitments, evidence/nudge logs, escalation state, virtual clock. |
| `evidence` | Search Slack/email for completion signal (real providers, with fixture fallback in demo mode) and score it against the commitment. |
| `nudge` | Compose and send reminders across Slack/email with tone control (real delivery, fixture/log in demo mode). |
| `linear` | Ticket lifecycle: create, status, escalate (with manager watcher + comment). |
| `scheduler` | The autonomous loop. Polls due commitments, checks evidence, advances the state machine. |

### The decision state machine

For each due, non-aspirational commitment, the scheduler runs every poll:

```
        due (+ grace)            +3d (committed)           +6d (committed)
 open ───────────────────► nudged_1 ─────────────► nudged_2 ─────────────► escalated
     gentle nudge                specific nudge             manager + watcher
```

At every step it first checks **evidence** (Slack/email) and **ticket status**
(Linear `Done`) — proof beats nagging. Nudges only happen when there is
neither evidence nor a completed ticket.

### Confidence tiers and cadence

| Tier | Example | Grace for nudge 1 | nudge 2 | escalate |
|---|---|---|---|---|
| `committed` | "I will ship the report by Friday" | at due date (0d) | +3d | +6d |
| `hedged` | "I'll *try* to get it done by Friday" | +2d | +5d | +10d |
| `aspirational` | "We should probably track error budgets" | never chased | — | — |

### Evidence scoring

`scoreEvidence()` in `src/common/matching.ts` combines three signals:

- **Recall** — what fraction of the commitment's key terms appear in the message
- **Completion signals** — words like *sent, published, shipped, delivered, merged*
- **Author match** — the message came from the commitment owner

A score ≥ `0.6` marks the commitment **done**. Keyword-only mentions cap at
`0.55` — deliberately below the bar, because a false "done" is worse than a
false nudge.

---

## Technology stack

- **Runtime**: Node.js ≥ 20 (ESM, TypeScript strict mode)
- **Framework**: NitroStack (`@nitrostack/core`) — decorator-based modules, DI, MCP server
- **Persistence**: Pure-JS JSON-file store (`data/follow-through.json`, atomic writes) — zero native dependencies, deploy-safe on any base image
- **Validation**: Zod
- **LLM**: `fetch`-based calls (no heavy SDK) — Anthropic Messages API or OpenRouter chat-completions
- **Widgets**: Next.js 14 + React 18 (`@nitrostack/widgets`)

---

## Project structure

```
src/
  app.module.ts                 # root module — wires all six modules
  common/
    types.ts                    # Commitment, Person, Ticket, evidence/nudge types
    dates.ts                    # date math + virtual-today helpers
    matching.ts                 # evidence scoring + thresholds
  modules/
    ingestion/                  # extract_commitments + sample transcript fixture
    store/                      # JSON-file store + virtual clock + query/upsert/promote
    evidence/                   # search_slack_evidence / search_email_evidence
    nudge/                      # send_nudge
    linear/                     # linear_create_ticket / get_status / update_status / escalate
    scheduler/                  # simulate_days_passing / reset_demo + poll loop
  providers/
    slack.ts                    # real Slack evidence search + DM nudges (Slack Web API)
    email.ts                    # real SMTP send + IMAP evidence search
    linear.ts                   # real Linear GraphQL client
  widgets/app/commitment-dashboard/  # the live dashboard widget (Next.js)
scripts/
  e2e-smoke.mts                 # full-lifecycle regression test (30+ asserts)
  extract-sample.mts            # one-liner demo: sample transcript → extract_commitments
  check-state.mts               # dump live server truth (commitments + ticket statuses)
  providers-check.mts           # which real providers/LLM keys are configured
  live-check.mts                # live create/read/update against real Linear + Slack/email search
```

---

## Getting started

### Prerequisites

- Node.js ≥ 20 (developed on 24.15.0)
- npm

### Install

```bash
npm install
npm run build
```

The build compiles TypeScript to `dist/` and bundles the widget to
`src/widgets/out/`.

### Configuration

Copy `.env.example` to `.env`. Everything has sane defaults; no key is required.

| Variable | Default | Purpose |
|---|---|---|
| `LLM_PROVIDER` | `auto` | `auto` \| `anthropic` \| `openrouter` \| `none` |
| `ANTHROPIC_API_KEY` | — | Enables Claude-based extraction (paid) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Claude model |
| `OPENROUTER_API_KEY` | — | Enables free-tier OpenRouter extraction |
| `OPENROUTER_MODEL` | `meta-llama/llama-3.1-8b-instruct:free` | Free OpenRouter model |
| `SCHEDULER_INTERVAL_MS` | `3600000` | Real-world poll cadence (production) |
| `DATA_DIR` | `<cwd>/data` | Writable volume for the JSON store (falls back to temp, then in-memory) |
| `SLACK_BOT_TOKEN` | — | Enables real Slack evidence search + DM nudges |
| `SLACK_EVIDENCE_CHANNELS` | — | Comma-separated channels to search for evidence |
| `EMAIL_SMTP_HOST/USER/PASS` | — | Enables real outbound nudges by email |
| `EMAIL_IMAP_HOST/USER/PASS` | — | Enables real IMAP evidence search |
| `LINEAR_API_KEY` | — | Enables real Linear ticket lifecycle |
| `LINEAR_TEAM_ID` | — | Linear team for ticket creation (auto-detected if omitted) |

**Provider resolution (`auto`):** uses Anthropic if its key is set, else
OpenRouter if its key is set, else the **offline deterministic extractor**.
Any LLM failure falls back to the offline extractor — the demo never breaks.

**Demo vs. real mode:** when none of `SLACK_BOT_TOKEN`, `EMAIL_IMAP_*`, or
`LINEAR_API_KEY` are set, the server runs in demo mode and all Slack/email/
Linear traffic is fixture-based. Configure any subset and only those providers
go real — the rest keep their fixtures. Run `npx tsx scripts/providers-check.mts`
to see which mode you're in.

> **No key? No problem.** The deterministic extractor produces the same
> structured output from the same tool schema with zero network and zero cost.

---

## Running

### Development (recommended for demoing)

```bash
npm run dev
```

- MCP server runs over **stdio** (wait for a client, see [Connect a client](#connect-a-client))
- Widget dev server runs on **http://localhost:3001** with hot reload
  (route: `http://localhost:3001/commitment-dashboard`)

### Production

```bash
npm run build
npm start
```

Boots in **dual mode** — stdio **and** HTTP at `http://localhost:3000/mcp`.

---

## Demo walkthrough

The sample transcript (`mtg_ops_standup`) contains four commitments designed
to exercise every path: a completion, a slacker, a hedged promise, and an
aspirational wish.

```powershell
# 0. Clean slate (virtual "today" = real today, e.g. 2026-07-31)
reset_demo

# 1. Extract commitments from the sample transcript → 4 commitments + 4 Linear tickets
get_sample_transcript
extract_commitments  { transcript_text, participants, meeting_date }

# 2. Fast-forward 3 days (→ Aug 3, the first due date)
simulate_days_passing  { days: 3 }
#    Priya  → done_evidence      (Slack + email show the report was sent)
#    Marcus → nudge_1            (gentle nudge, no evidence yet)

# 3. Fast-forward 3 days (→ Aug 6)
simulate_days_passing  { days: 3 }
#    Marcus → nudge_2            (more specific nudge)

# 4. Fast-forward 3 days (→ Aug 9)
simulate_days_passing  { days: 3 }
#    Marcus → escalated          (ticket watcher: raj.patel@company.com + context comment)
#    Aisha  → nudge_1            (hedged — grace period meant she wasn't chased early)
#    Tom    → open, untouched    (aspirational — never auto-chased)

# 5. Inspect the final board
query_commitments
# 6. Prove the escalation stuck to the ticket
linear_get_status  { ticket_id: "LIN-482" }   # → Escalated, watchers: [...]
```

For a browser visual, open the dashboard widget (see below) — it reflects the
same board.

---

## Tools

All 14 tools registered on the `follow-through` MCP server:

| Tool | Module | Purpose |
|---|---|---|
| `get_sample_transcript` | ingestion | Ready-to-use demo transcript + roster |
| `extract_commitments` | ingestion | Parse transcript → commitments, records, tickets |
| `upsert_commitment` | store | Insert/update a commitment record |
| `query_commitments` | store | Query the board (status filters; widget-attached) |
| `promote_commitment` | store | Raise a commitment's confidence tier |
| `search_slack_evidence` | evidence | Search Slack for completion signal (real or fixtures) |
| `search_email_evidence` | evidence | Search email for completion signal (real or fixtures) |
| `send_nudge` | nudge | Send a reminder (tone, channel, message) |
| `linear_create_ticket` | linear | Create a Linear ticket |
| `linear_get_status` | linear | Read ticket status, watchers, escalation comment |
| `linear_update_status` | linear | Change ticket status |
| `linear_escalate` | linear | Escalate a ticket to a manager |
| `simulate_days_passing` | scheduler | Advance virtual clock + run one poll |
| `reset_demo` | scheduler | Wipe state, reset clock |

---

## Widget dashboard

`query_commitments` is auto-attached to a Next.js widget
(`ui://widget/next-commitment-dashboard.html`). Inside an MCP host it renders a
theme-aware board: owner, commitment, due date, confidence, status badge,
evidence trail, and nudge count.

Standalone (no host injecting data) the page shows only a loading shell — the
data is injected by the host when the tool runs.

---

## Testing

```bash
npm run build
npx tsx scripts/e2e-smoke.mts
```

Drives the real server over the MCP stdio protocol and asserts 30+ invariants:
extraction shape, confidence tiers, due-date resolution, nudge timing, hedged
grace, aspirational immunity, evidence thresholds, escalation watcher, and
manual nudges. Ends with `ALL CHECKS PASSED`.

### Verify what the agent reports (before the demo, and anytime a tool call fails)

If a client like Claude.ai ever reports a connector error mid-demo, never assume
the answer that followed came from the server — re-run the tools live and compare:

```bash
npm run build
npx tsx scripts/check-state.mts
```

This dumps the server's actual current commitments and Linear ticket statuses
(each ticket includes `as_of`, the server-side date the status was read at), so
anything the agent quoted can be checked against ground truth. Real tool
responses always carry server data (`updated_at`, `as_of`, ticket ids); anything
that doesn't match a fresh run is client-side reconstruction, not a result.

**Demo etiquette:** if a tool call visibly fails, say "let me retry that" and
call it again instead of continuing — a visibly retried tool beats a confidently
wrong number. Connector errors ("Connector search is off", "Unable to reach …")
are almost always Claude.ai's connector settings: open **Settings → Connectors**,
confirm the FollowThrough connector is enabled/approved, and re-approve it for the
current conversation (approval is per-chat, so a new chat needs it again).

### Simulation semantics

`simulate_days_passing` takes a single `days` number and advances the virtual
clock by exactly that many days in one call (then runs one scheduler poll). So
`{ days: 9 }` jumps straight to due+9 in a single step — it is not three 3-day
calls. The demo shows a cleaner narrative with separate calls (3 → 3 → 3), which
also makes each nudge/escalation stage observable as it happens, but the tool
never requires them.

---

## Connect a client

Point any MCP client (Claude Desktop, Cursor, etc.) at the built server:

```json
{
  "mcpServers": {
    "follow-through": {
      "command": "node",
      "args": ["<path-to>/dist/index.js"],
      "cwd": "<path-to>"
    }
  }
}
```

Or hit the HTTP endpoint in dual/production mode: `http://localhost:3000/mcp`.
The CLI can also wire up Cursor automatically: `npx nitrostack-cli cursor`.

---

## Production considerations

- **Real integrations, optional.** Slack (`src/providers/slack.ts`), email
  (`src/providers/email.ts`), and Linear (`src/providers/linear.ts`) are plain
  env-driven clients. Without keys they fall back to the deterministic fixtures,
  so the demo and the production path are the same code.
  - **Slack** requires a bot token with `channels:read`, `groups:read`,
    `channels:history`, `groups:history`, `im:history`, `users:read`,
    `users:read.email`, `chat:write`. The `*:read` scopes resolve channel
    names in `SLACK_EVIDENCE_CHANNELS` to ids (names or ids both accepted);
    the bot must be added to every channel it searches. Nudges DM the
    commitment owner.
  - **Email** uses SMTP (`EMAIL_SMTP_*`) for outbound nudges and IMAP
    (`EMAIL_IMAP_*`) to search mail for evidence, parsed with `mailparser`.
  - **Linear** uses the GraphQL API (`LINEAR_API_KEY`); escalations add the
    manager as a ticket subscriber plus a contextual comment.
- **Real cadence.** Set `SCHEDULER_INTERVAL_MS` to the desired poll rate and
  remove `simulate_days_passing` / `reset_demo` from the tool surface if you
  don't want them exposed.
- **LLM cost.** Extraction is the only LLM call. It runs once per transcript;
  the polling/nudge/escalation machinery is pure code. Use OpenRouter `:free`
  models or the offline extractor to keep cost at $0.
- **Transport.** Production boots in dual mode (stdio + HTTP). OAuth logs at
  startup are framework noise unless you configure an authorization server.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `EADDRINUSE :3000` on start | A stale server is still running — kill it (netstat/`Stop-Process`) and retry. |
| Widget missing on startup | Run `npm run build` once so `query_commitments` can register its bundled component. |
| Demo stuck on old dates | `reset_demo`, or delete `data/follow-through.json` (regenerated on boot). |
| `EACCES` / read-only fs on NitroCloud | Expected on serverless hosts — the store auto-falls back to the OS temp dir, then in-memory only (look for `[StoreService]` notes in logs). Set `DATA_DIR` if your platform offers a writable volume. |
| Slack logs `missing_scope` | The bot token lacks `channels:read` / `groups:read`, so channel names in `SLACK_EVIDENCE_CHANNELS` can't be resolved to ids. Add those scopes in the Slack app (OAuth & Permissions), reinstall the app to regenerate the token, and add the bot to each channel it should search. |
| Linear logs `Unknown argument ...` | The `LINEAR_API_KEY` is older than the app code — regenerate it so the app's `Issue`/`users(filter:)` GraphQL calls are accepted. |
| `llm_provider: "offline"` | The LLM call failed or no key is set — check `.env` and that the provider is reachable. |
| `:3001` serves a 404 at `/` | The dashboard lives at `/commitment-dashboard`; a stale `src/widgets/.next` can stall it — delete it and restart. |

---

## License

MIT — see the repository root. Built for demonstration on the NitroStack MCP
framework.
