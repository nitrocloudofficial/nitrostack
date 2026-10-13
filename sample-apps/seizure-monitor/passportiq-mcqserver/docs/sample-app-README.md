# PassportIQ

**An agentic MCP copilot for passport verification officers.**
Built with [NitroStack](https://nitrostack.ai) ⚡

44 MCP tools · 4 resources · 3 prompts · 5 widgets · 8 health checks · 366 passing assertions

---

## The problem

Applying for a passport in India is a 14-stage journey — submission, fee
payment, a biometrics appointment at a Passport Seva Kendra, document
verification, police verification, printing, dispatch, delivery. Every stage is
manual, queue-bound, and largely invisible to the applicant.

The officer's side is worse. They see one application at a time. They have no
way to notice that four "unrelated" applications filed across three cities
share a forged address and a recycled photograph.

## What PassportIQ does

It exposes the **entire lifecycle** as MCP tools, then puts an autonomous agent
on top.

The agent moves a case through every mechanical stage by itself: validating
documents, running OCR, checking identity and address consistency, evaluating a
rulebook, scoring risk, and building a cross-application link graph that
surfaces fraud rings no single-application review could catch.

Then it stops.

## The part that matters: it cannot decide

The lifecycle is a **declarative state machine** — 13 transitions, defined as
data in `src/contracts/caseflow.contract.ts`:

```ts
{ from: 'verification_complete', to: 'officer_review', autonomous: true  },
{ from: 'officer_review',        to: 'approved',      autonomous: false },
{ from: 'officer_review',        to: 'rejected',      autonomous: false },
{ from: 'officer_review',        to: 'clarification', autonomous: false },
```

Nine transitions are `autonomous: true`. **All four exits from
`officer_review` are `autonomous: false`.**

This is not a prompt asking the model to behave. The agent's action schema
(`src/modules/agent/agent-policy.ts`) does not contain `officer_decide` at all —
it is not a tool the agent can name. And `officer_decide` sits behind
`PipelineCompleteGuard`, which **fails closed**: if verification is incomplete,
the decision is refused regardless of who is calling.

Full automation of the ~90% that is mechanical. A hard, structural stop at the
10% that decides a citizen's identity.

---

## Architecture

```
                MCP client (Claude, NitroStudio, judges' harness)
                                   │  Streamable HTTP /mcp
                                   ▼
    ┌──────────────────────────────────────────────────────────┐
    │  NitroStack server  —  @McpApp / @Module / @Tool         │
    ├──────────────────────────────────────────────────────────┤
    │  Caseflow      18 tools   the 14-stage lifecycle         │
    │  Pipeline      10 tools   verification orchestration     │
    │  Verification   8 tools   OCR, rules, risk, similarity   │
    │  Agent          4 tools   investigate / triage / trace   │
    │  Console        4 tools   officer queue, autopilot       │
    ├──────────────────────────────────────────────────────────┤
    │  CaseOrchestratorService — drives cases, stops at gate    │
    │  ToolExecutorService     — lets tools call other tools    │
    │  PipelineCompleteGuard   — fails closed on decisions      │
    └──────────────────────────────────────────────────────────┘
```

### MCP surface

**Tools (44).** By module: Caseflow 18, Pipeline 10, Verification 8, Agent 4,
Console 4. Highlights:

| Tool | Does |
|---|---|
| `submit_passport_application` | Opens a case, returns an ARN |
| `run_case_verification` | Runs the full chained verification pipeline |
| `build_risk_graph` | Cross-application link graph — the fraud-ring reveal |
| `agent_investigate` | Autonomous investigation loop (LLM-planned, deterministic fallback) |
| `advance_case` | Moves a case, refusing any non-autonomous transition |
| `officer_decide` | Human decision. Guarded, fails closed |
| `track_passport_application` | Applicant-facing status by ARN |

**Resources (4)** — `passportiq://applications`, `passportiq://rulebook`,
`passportiq://audit-trail`, `passportiq://agent/runs`

**Prompts (3)** — `officer-briefing`, `fraud-ring-memo`, `clarification-letter`

**Widgets (5)** — `officer-dashboard`, `graph-view`, `risk-explanation`,
`agent-console`, `console`

---

## Running it

Requires Node.js 20+.

```bash
npm install
npm run widgets:install
npm run build
```

### As an MCP server over stdio (Claude Desktop, NitroStudio)

```bash
npm run dev
```

### As an HTTP MCP server

```bash
NODE_ENV=production HOST=0.0.0.0 PORT=8080 \
PASSPORTIQ_CASEFLOW=true \
node dist/index.js
```

- MCP (Streamable HTTP): `http://localhost:8080/mcp`
- Officer console (UI): `http://localhost:8080/console`
- Health: `http://localhost:8080/api/console/health`

### Docker

```bash
docker build -t passportiq .
docker run -p 8080:8080 \
  -e NODE_ENV=production -e HOST=0.0.0.0 -e PORT=8080 \
  -e PASSPORTIQ_CASEFLOW=true passportiq
```

### Verify the MCP endpoint

```bash
SID=$(curl -s -D- -o /dev/null -X POST http://localhost:8080/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18","capabilities":{},
        "clientInfo":{"name":"probe","version":"1"}}}' \
  | grep -i '^mcp-session-id:' | tr -d '\r' | cut -d' ' -f2)

curl -s -X POST http://localhost:8080/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "mcp-session-id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | grep -o '"name":"[a-z_]*"' | sort -u | wc -l     # -> 44
```

### Tests

```bash
npm run test:all      # 366 assertions
```

```
✅ Seed integrity:        67
✅ Backend B acceptance: 106
✅ Agent acceptance:      63
✅ Caseflow acceptance:   95
✅ Console acceptance:    35
```

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | auto | `production` ⇒ HTTP + stdio. Auto-set when `PORT` is present. |
| `HOST` | `0.0.0.0` | Bind address. |
| `PORT` | `3000` | HTTP port. Injected by most hosts. |
| `PASSPORTIQ_CASEFLOW` | `false` | Arms the background case orchestrator. |
| `PASSPORTIQ_AUTOPILOT` | `false` | Arms the queue-sweep autopilot. |
| `GEMINI_API_KEY` | — | Enables LLM planning (`gemini-2.0-flash`). |
| `OPENAI_API_KEY` | — | Alternative provider (`gpt-4o-mini`). |

**No LLM key is required.** Every stage, the rulebook, the risk score and the
agent loop have deterministic fallbacks — the full demo runs without a model.

---

## A demo worth 60 seconds

```
1. submit_passport_application   -> case opens, ARN issued
2. caseflow_autopilot            -> agent drives: fee, appointment, biometrics,
                                    verification, risk scoring
3. ...and halts at officer_review, reporting why it stopped
4. build_risk_graph              -> three applications, one forged address
5. officer_decide                -> the human decides; audit trail records who
```

Step 3 is the pitch. The agent does not stop because it was asked nicely — it
stops because `autonomous: false` makes continuing unrepresentable.

---

## Notes on scope

The PSK appointment, police-verification and booklet-printing stages are
**simulated adapters**, not live government integrations. The verification
pipeline, fraud graph, risk scoring, agent loop, state machine and audit trail
are all real and fully implemented. Seed data is synthetic.

---

Built with [NitroStack](https://nitrostack.ai) ⚡
