# CLAUDE.md — Aegis (2-person build: Shreyas + Prince)

> Team: **Shreyas** (backend / MCP core, using Claude Code) and **Prince** (widgets / UI, using Antigravity).
> Both agents: read this whole file first. You work in **separate folders** connected by ONE shared data
> contract (§3), so you build in parallel and only integrate at the end. Build in small, tested steps.

Project: **Aegis** — an MCP server on **NitroStack** that audits an AI agent's effective permissions and
detects toxic capability combinations (a "blast-radius" auditor). Track 03: Enterprise AI & Workplace Automation.

---

## 0. GROUND YOURSELF FIRST (both people, before writing code)

NitroStack is a new framework — do NOT guess its API from memory.
1. Read a scaffolded sample under `src/modules/` (Shreyas) or `src/widgets/` (Prince) end to end. Copy its
   real imports, decorators, and data-passing convention. Scaffolded code is the source of truth.
2. Read `src/index.ts` and `src/app.module.ts` to see how the app boots and registers modules.
3. If the scaffolded code differs from any snippet here, **the scaffolded code wins.**

**Hard rule (both): use `ctx.logger.info(...)`. NEVER `console.log` / `console.*`** — it breaks STDIO and
kills the Studio connection.

---

## 1. What Aegis does (shared understanding)

Enterprises connect AI agents to many tools (Gmail, Dropbox, Postgres, Slack). Each is approved alone, so
nobody sees the agent's *combined* power. "Read private data" + "send external" silently becomes a
**data-exfiltration path**. Aegis computes the agent's effective capabilities, detects toxic combinations,
and shows a live **blast-radius graph** + report.

Demo flow both workstreams must support: user says "connect Dropbox to the support agent" → a tool fires →
the graph re-renders with a new **red** exfiltration path → it gets explained → one click fixes it.

---

## 2. WHO OWNS WHAT (no overlap = no merge conflicts)

| Area | Owner | Files (only this person edits these) |
|---|---|---|
| Capability model + policies | **Shreyas** | `src/modules/governance/capability.ts`, `policies.ts` |
| Detection engine | **Shreyas** | `src/modules/governance/detector.ts` |
| Tools / Resource / Prompt | **Shreyas** | `governance.tools.ts`, `governance.resources.ts`, `governance.prompts.ts` |
| Module wiring | **Shreyas** | `governance.module.ts`, `src/app.module.ts` |
| Deploy + repo + git | **Shreyas** | GitHub repo, NitroCloud deploy |
| Capability-graph widget | **Prince** | `src/widgets/capability-graph/**` |
| Attack-path-alert widget | **Prince** | `src/widgets/attack-path-alert/**` |
| README + demo script | **Prince** | `README.md`, `DEMO.md` |

**Rule:** never edit a file the other person owns. If you think you need to, message them instead. The only
files both care about are the **data shapes in §3** — those are frozen; if a change is needed, agree first.

---

## 3. THE SHARED DATA CONTRACT (frozen — the seam between the two of you)

Shreyas's tools RETURN these objects. Prince's widgets CONSUME them. Both build against these shapes
independently — Prince uses the mock fixtures below until Shreyas's real tools are ready.

### 3.1 `get_capability_graph` → feeds the `capability-graph` widget
```json
{
  "agentId": "support-agent",
  "nodes": [
    { "id": "agent", "type": "agent", "label": "Support Agent" },
    { "id": "tool:gmail", "type": "tool", "label": "Gmail" },
    { "id": "tool:dropbox", "type": "tool", "label": "Dropbox" },
    { "id": "cap:READ_PRIVATE_DATA", "type": "capability", "label": "Read Private Data" },
    { "id": "cap:SEND_EXTERNAL", "type": "capability", "label": "Send External" }
  ],
  "edges": [
    { "id": "e1", "source": "tool:dropbox", "target": "cap:READ_PRIVATE_DATA", "danger": true },
    { "id": "e2", "source": "tool:gmail",   "target": "cap:SEND_EXTERNAL",     "danger": true },
    { "id": "e3", "source": "tool:gmail",   "target": "cap:READ_PRIVATE_DATA", "danger": false }
  ],
  "attackPaths": [
    { "ruleId": "exfiltration", "source": "READ_PRIVATE_DATA", "sink": "SEND_EXTERNAL",
      "viaTools": ["dropbox", "gmail"], "severity": "critical",
      "message": "Agent can read private data AND send it externally — data exfiltration path." }
  ],
  "riskScore": 0.85
}
```
- `node.type` is `"agent" | "tool" | "capability"`.
- `edge.danger === true` means this edge participates in an attack path → widget renders it **red/animated**.
- `severity` is `"critical" | "high" | "medium"`.

### 3.2 `detect_attack_paths` → feeds the `attack-path-alert` widget
```json
{
  "agentId": "support-agent",
  "paths": [
    { "ruleId": "exfiltration", "severity": "critical", "viaTools": ["dropbox", "gmail"],
      "message": "Agent can read private data AND send it externally — data exfiltration path." }
  ],
  "riskScore": 0.85
}
```

**Prince: save these two JSON blobs as `src/widgets/_fixtures.json` and build against them immediately.**
Do not wait for Shreyas.

---

## 4. SHREYAS'S WORKSTREAM — backend / MCP core

Confirmed imports: `import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';`

### 4.1 `capability.ts` — the model
```
type Capability = 'READ_PRIVATE_DATA'|'READ_PUBLIC_DATA'|'WRITE_DATA'|'WRITE_PUBLIC'|'SEND_EXTERNAL'|'DELETE_DATA'|'EXECUTE';

const TOOL_REGISTRY = {
  gmail:['SEND_EXTERNAL','READ_PRIVATE_DATA'], dropbox:['READ_PRIVATE_DATA','WRITE_DATA','SEND_EXTERNAL'],
  postgres:['READ_PRIVATE_DATA','WRITE_DATA','DELETE_DATA'], slack:['WRITE_PUBLIC','SEND_EXTERNAL'],
  filesystem:['READ_PRIVATE_DATA','WRITE_DATA','EXECUTE'], calendar:['READ_PRIVATE_DATA','WRITE_DATA'],
};
```
Plus an in-memory per-agent store of connected tool IDs, and a function returning the agent's union of capabilities.

### 4.2 `policies.ts` — toxic-combination rules (data)
```
[ { id:'exfiltration', source:'READ_PRIVATE_DATA', sink:'SEND_EXTERNAL', severity:'critical', message:'...' },
  { id:'public-leak',  source:'READ_PRIVATE_DATA', sink:'WRITE_PUBLIC',  severity:'high',     message:'...' },
  { id:'destructive',  source:'DELETE_DATA',       sink:'EXECUTE',       severity:'high',     message:'...' } ]
```

### 4.3 `detector.ts` — `detectAttackPaths(agentId)` (pure TS, NO LLM, 0 tokens)
For each rule, if the agent's effective capabilities include both `source` and `sink`, emit a path with
`viaTools` (which connected tools supplied each). Aggregate `riskScore` (critical=1.0, high=0.6; sum, clamp to 1).

### 4.4 Tools (`governance.tools.ts`)
- **`connect_tool`** — input `{ agentId, toolId }`; add tool to the agent; return updated effective caps. Apply
  the OAuth guard from the oauth template here (verify the guard's real name in the scaffolded sample).
- **`get_capability_graph`** — `@Widget('capability-graph')`; input `{ agentId }`; return the §3.1 object.
- **`detect_attack_paths`** — `@Widget('attack-path-alert')`; input `{ agentId }`; return the §3.2 object.
- **`apply_policy_fix`** — input `{ agentId, ruleId }`; remove the tool supplying the riskier capability;
  return the fresh §3.1 graph with the risk cleared.
All tools: clear `description`, Zod `.describe()`, structured returns, try/catch → error object, `ctx.logger` only.

### 4.5 Resource + Prompt
- `governance.resources.ts`: `@Resource({ uri:'aegis://policies', name:'Aegis Policies', mimeType:'application/json' })` → returns the rules JSON.
- `governance.prompts.ts`: `@Prompt({ name:'explain_attack_path', ... })` → chat messages asking the model to
  explain a detected path in plain English. **Only invoke on a detected path; cache by hash of
  `ruleId + sorted(viaTools)`; use Claude Haiku.** This is the ONLY token spend.

### 4.6 Wiring
`governance.module.ts` → `@Module({ name:'governance', controllers:[GovernanceTools, GovernanceResources, GovernancePrompts] })`.
Register `GovernanceModule` in `src/app.module.ts` imports.

### 4.7 Shreyas also owns deploy
GitHub repo + NitroCloud auto-deploy (see §7). Get a minimal version LIVE early.

---

## 5. PRINCE'S WORKSTREAM — widgets / UI (Antigravity)

You build two React widgets in `src/widgets/`, using the §3 fixtures. Follow the scaffolded widget sample's
convention for how a widget receives the tool's returned object.

### 5.1 `capability-graph` (the hero visual — use React Flow)
- Center node = the agent. Around it: tool nodes and capability nodes, from `data.nodes`.
- Draw `data.edges`; any edge with `danger:true` (or on an `attackPaths` entry) renders **red and animated**,
  labeled with the rule (e.g. "exfiltration"). Neutral edges are gray.
- A corner risk badge showing `riskScore` and the attack-path count.
- Must re-render cleanly when new data arrives (so "connect Dropbox → red path appears" is smooth).
- Build/test against `_fixtures.json` §3.1 FIRST. If React Flow isn't available in the widget bundle, fall
  back to an SVG force/radial layout — same visual intent.

### 5.2 `attack-path-alert` (the alert list)
- Render `data.paths`: each row = a severity badge (critical=red, high=amber), the `message`, and the
  `viaTools` chips. Show `riskScore` at top. Optional "Fix" button that triggers `apply_policy_fix`.
- Build/test against `_fixtures.json` §3.2.

### 5.3 Prince also owns README + DEMO
- `README.md`: problem + real incidents (Supabase leak, postmark-mcp, Microsoft tool-poisoning; 88% of orgs
  hit last year; Gartner on access control), a **mermaid** architecture diagram, tool/resource/prompt list,
  setup steps, and the **live Service URL** (Shreyas provides once deployed).
- `DEMO.md`: the 2-minute script (problem → connect Dropbox → red path → explain → fix → live URL).

---

## 6. GIT WORKFLOW (so you never overwrite each other)

- Shreyas owns `main` and merges. Each person works on their own branch:
  - Shreyas: `git checkout -b backend`
  - Prince:  `git checkout -b widgets`
- Commit often, small messages (`feat: attack-path detector`). Push your branch: `git push -u origin <branch>`.
- Because your files are disjoint (§2), merges are clean. Merge to `main` via PR when a piece is done.
- Prince needs push access: Shreyas adds `prince-rai88`/`shreyascode11` as a collaborator in repo Settings.
- **Never both edit `src/app.module.ts`** — that's Shreyas only.

---

## 7. INTEGRATION + DEPLOY (Shreyas drives)

1. Once Shreyas's `get_capability_graph` returns real §3.1 data and Prince's widget renders fixtures, merge
   `widgets` into `main` and test the real tool in NitroStudio (Add Server → Nitro Project → folder → Studio
   App Canvas → Tools → Execute Tool; widgets show a live preview). Fix any shape mismatches against §3.
2. Deploy to NitroCloud via GitHub auto-deploy: sign in to NitroCloud → Create Nitrostack App `aegis-mcp` →
   MCP → Deployments → Deploy from GitHub → Install App / authorize → Connect Repository → branch `main` →
   Enable Auto-Deploy → Deploy. Copy the **Service URL** (judged link). Every push to `main` now redeploys.
3. Demo finale: connect the live `{serviceUrl}/sse` to ChatGPT (Developer Mode → Plugins → + → Server URL).

---

## 8. RULES (both)

- `ctx.logger` only, never `console.*`. No secrets in git; `.env` stays gitignored.
- Detection is deterministic TS (0 tokens); the model is only for `explain_attack_path`, cached, Haiku.
- Do NOT build via Compose/Vibe Coding (spends NitroCloud credits) — hand-build in your IDE.
- 4 clean tools + 2 good widgets + live deploy beats sprawling scope. Skip a database entirely.
- Don't edit files the other person owns. If a §3 shape must change, agree first, then both update.
- If you reference a NitroStack API not confirmed in the scaffolded code or the handbook, STOP and verify.

---

## 9. FIRST STEPS PER PERSON

**Shreyas:** `git checkout -b backend` → build `capability.ts` → `policies.ts` → `detector.ts` (test the case:
gmail+dropbox ⇒ an `exfiltration` path) → `connect_tool` + `detect_attack_paths` → wire module → test in
NitroStudio → deploy minimal.

**Prince:** `git checkout -b widgets` → save §3 fixtures to `src/widgets/_fixtures.json` → build
`capability-graph` (React Flow) against 3.1 → build `attack-path-alert` against 3.2 → start README/DEMO.
