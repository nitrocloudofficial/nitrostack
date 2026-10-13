# Aegis — Pitch & Demo Script

## Problem Statement

Enterprises are connecting AI agents to more tools every week — Gmail, Dropbox, Slack, internal databases —
and each integration gets approved on its own merits. Nobody looks at what the agent can do once every
approved permission is added *together*. That blind spot isn't theoretical: it's how the Supabase MCP leak
happened, how a compromised `postmark-mcp` package started silently BCC'ing every email it sent to an
attacker, and how "tool-poisoning" attacks hide malicious instructions inside a tool's own metadata.
Individually-reasonable permissions — "read a database," "send an email" — combine into a data-exfiltration
path, and nothing in the stack today catches that combination before it's exploited. Access reviews audit
tools one at a time; none of them compute the union.

## Solution

Aegis is a blast-radius auditor for AI agents. It's an MCP server that computes an agent's *effective*
capability set across every tool it's connected to, checks that set against a library of toxic-combination
policy rules, and flags the result — instantly, deterministically, at zero LLM cost. When a dangerous
combination appears (e.g. "can read private data" + "can send external"), Aegis renders it as a live risk
graph with the dangerous path highlighted in red, explains the finding in plain English for a non-technical
reviewer (the *only* step that touches an LLM — and only after detection, cached, cheap), and remediates it
in one click by disconnecting the offending tool. It's a security layer that scales with how many tools an
agent has, instead of one more manual review nobody has time to run.

---

## Setup (before you're on stage)

1. `npm run dev` running in a terminal, **started before** you open/connect NitroStack Studio (widgets need
   the dev server up first — reconnect the project in Studio if you started dev after connecting).
2. Studio → confirm you're on the **Tools** panel with `aegis-mcp` showing "Connected."
3. Pick a **fresh `agentId`** you haven't used in testing — e.g. `demo-agent` — clean slate, no surprises.
4. Confirm `GROQ_API_KEY` is set — `explain_attack_path` needs it for the plain-English beat.
5. One dry run through the exact steps below, right before you go on, so you're not typing IDs live for the
   first time under pressure.

## The script (~90 seconds, 5 beats)

**Beat 1 — the hook (15s)**
> "Enterprises connect AI agents to dozens of tools. Each one gets approved individually — nobody checks
> what the agent can do once you add them *together*. That's exactly how the Supabase MCP leak happened."

**Beat 2 — build the risk, live (20s)**
- `connect_tool` → `{"agentId": "demo-agent", "toolId": "gmail"}` → Execute. *"One tool, nothing alarming."*
- `connect_tool` → `{"agentId": "demo-agent", "toolId": "dropbox"}` → Execute.

**Beat 3 — the visual payoff (20s)**
- `get_capability_graph` → `{"agentId": "demo-agent"}` → Execute.
- Point at the **red exfiltration edge**: *"It can now read private data and send it externally. Zero LLM
  tokens spent to catch that — pure deterministic rule matching."*

**Beat 4 — plain English, then the fix (25s)**
- `explain_attack_path` → `{"agentId": "demo-agent", "ruleId": "exfiltration"}` → Execute.
  *"This is the only place we spend a token — narrating a finding that already happened, not making it."*
- `apply_policy_fix` → `{"agentId": "demo-agent", "ruleId": "exfiltration"}` → Execute.
  *"Graph goes clean. One click, and it's auditable — a logged deterministic action, not 'the AI decided.'"*

**Beat 5 — the close (10s)**
> "Aegis computes an agent's real blast radius across every connected tool, catches the toxic combination
> before it's exploited, explains it in plain English, and fixes it in one click. No LLM in the detection
> loop — deterministic, fast, and auditable."

## If you get asked...

- **"Why not just have the AI decide what's risky?"** — Because then the audit trail is "the model thought
  so." Aegis's detection is a fixed rule table (`source capability → sink capability`), so every flag is
  reproducible and explainable without re-running an LLM.
- **"Does this scale beyond 6 tools?"** — `TOOL_REGISTRY` and the policy rules are both just data — adding a
  7th tool or a 4th rule is a one-line addition, not new logic.
- **"What's the LLM actually doing?"** — Only `explain_attack_path`, only after a rule already fired,
  cached by `hash(ruleId + sorted(viaTools))` so the same finding is never re-explained twice.

## Deploying to NitroCloud (for a live Service URL instead of Studio)

1. [cloud.nitrostack.ai](https://cloud.nitrostack.ai) → your Aegis app → **MCP** module → **Open MCP**.
2. Deploy from GitHub → authorize → connect `prince-rai88/aegis-mcp`, branch `main`.
3. Add environment variable **`GROQ_API_KEY`**.
4. Enable auto-deploy → Deploy → copy the **Service URL**.
5. Connect a real chat client: ChatGPT (Developer Mode → Plugins → Add → Server URL) or Claude, pointed at
   `{serviceUrl}/mcp`, then run the same 5 beats above for real — this is the strongest version of the demo
   if it's ready in time, since the widget renders inline in an actual chat conversation.

## Fallback if Studio or NitroCloud isn't cooperating live

- `bash scripts/test-mcp.sh` — proves every tool works end-to-end from a terminal in ~10 seconds. Not
  visual, but zero risk of a live connection failing on you.
- `scripts/preview-widgets.html` (open directly in a browser, needs `npm run dev` running) — shows the real
  rendered graph/alert widgets with real data, no Studio dependency, if you just need the visual without
  the click-through.
