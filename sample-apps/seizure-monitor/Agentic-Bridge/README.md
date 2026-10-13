# Enterprise Agentic Bridge

**An MCP server that turns a legacy codebase — and the human decisions around it — into
machine-readable context an AI can be trusted with.**

Built entirely on [NitroStack](https://nitrostack.ai). One project, one process: the swarm,
the admin dashboard, the metaprogramming engine and the deployment target are all NitroStack.

---

## The problem

Drop a stateless AI into a thirty-year-old enterprise repository and it produces code that
compiles and gets rejected in review. Not because the model is weak — because it cannot see
the things that actually govern the codebase:

- that `aurora-orm.js` is load-bearing and **frozen for the sprint** (said out loud in standup,
  written down nowhere);
- that the Jira ticket says *"introduce Redis"* but the engineering lead **killed that decision
  verbally two days ago**;
- that CI rejects any commit without a `[AUR-1234]` key;
- that the coverage gate is 78% lines and the build hard-fails below it;
- that every list view must use `<DataTable>` and no one may invent a hex colour.

None of that is in the source code. It is in Jira, in a Teams transcript, in a Jenkinsfile,
in `CONTRIBUTING.md`, and in a `tokens.css` file nobody reads.

## What this does

A swarm of seven specialist agents traverses all of it in one pass, cross-references the
written record against what humans actually said, **stops and asks a person when those two
disagree**, and distils the result into a single `CLAUDE.md` manifest that any AI reads on
startup.

Point it at a **GitHub URL** and it clones, analyses and cleans up on its own — so the server
runs in the cloud without ever needing the caller's hard drive. The sprint state comes from the
**Jira** REST API and the spoken decisions from **Slack**, with the bundled fixtures as a
clearly-labelled fallback when those are not configured.

Along the way it writes new MCP tools for whatever it finds that has no modern equivalent.

```
run_swarm ──► 7 personas ──► knowledge base ──► conflict? ──► HUMAN RULES ──► CLAUDE.md
                                                    │                            ▲
                                                    └── paused, nothing guessed ──┘
```

---

## Quick start

```bash
npm install     # also installs widget deps and builds them — see note below
npm run verify  # 71 assertions against the real server
npm run doctor  # are my live integrations wired up, and if not, exactly what is missing?
```

> Testing this against **your own codebase and a real Jira/Slack tenant**?
> [`TESTING.md`](TESTING.md) is the phased guide — credentials, validation, expected output and
> failure diagnosis.

> **One command is enough.** A `postinstall` step installs the widget dependencies and
> produces the static export. That export is derived, so it is correctly absent from git —
> but NitroStack resolves every `@Widget` route to `src/widgets/out/<name>/index.html` while
> building the tool list, so a clone that has never been built dies at startup with
> `Exported HTML for route 'architecture-map' not found` and the client reports only that the
> server shut down. The server also rebuilds the bundle itself if it ever goes missing.
> If either safety net is bypassed (`npm install --ignore-scripts`), run `npm run setup`.

`npm run verify` spawns the real MCP server over STDIO and drives the entire demo path with
live JSON-RPC — 71 assertions covering every claim in this README. It also boots a second
server on the HTTP transport to prove the 50 MB body limit reached the Express parser and that
an unauthenticated mutation is refused at the socket. If it prints `ALL 71 CHECKS PASSED`, the
demo works.

### In NitroStudio

1. **Add Server → Nitro Project → browse to this folder → Open Project → Studio App Canvas.**
   Studio runs `npx tsx src/index.ts` for you.
2. Go to **Tools** and run `run_swarm` with no arguments.
3. The **Swarm Console** widget renders. The run pauses on a conflict.
4. Run `detect_conflicts` → the **Conflict Resolution** widget renders → click a ruling.
5. Run `synthesize_claude_md` → read the manifest.

See [`DEMO.md`](DEMO.md) for the timed stage script.

---

## What's inside

### 23 tools across 11 domain modules

| Module | Persona | Tools |
|---|---|---|
| `codebase` | Structural Cartographer | `map_file_dependencies`, `find_change_surface` |
| `documentation` | Documentation Synthesizer | `parse_package_specs` |
| `qa` | Quality Assurance Analyst | `extract_test_strategy` |
| `devops` | DevOps Navigator | `parse_ci_cd_pipelines` |
| `agile` | Product Synchronizer / Scrum Analyst | `fetch_sprint_goals` (live Jira), `fetch_meeting_transcripts` (live Slack) |
| `uiux` | UI/UX Integrator | `parse_design_system` |
| `conflict` | — | `detect_conflicts`, `resolve_conflict`, `list_conflicts` |
| `skills` | — | `generate_custom_skill`, `list_generated_skills` |
| `pipeline` | — | `list_pipeline_nodes`, `save_pipeline`, `get_pipeline`, `run_pipeline`, `query_knowledge` |
| `synthesis` | — | `synthesize_claude_md`, `ingest_manual_document`, `reset_bridge` |
| `swarm` | Orchestrator | `run_swarm`, `get_swarm_run` |

Plus **5 MCP resources** (`bridge://manifest/claude-md`, `bridge://knowledge/graph`,
`bridge://skills/registry`, `bridge://conflicts`, `bridge://runs/latest`) and **3 prompts**
that encode the correct tool ordering, so a first-time user gets the full path from a menu.

### 7 widgets — the admin dashboard, inside NitroStack

The dashboard is not a separate Next.js app. It is seven `@nitrostack/widgets` React
components that call MCP tools back through `useWidgetSDK().callTool()`. Clicking
*"Source B is authoritative"* in the conflict widget invokes the real `resolve_conflict` tool,
writes the ruling into the durable knowledge base, and resumes the paused swarm run.

That means the same dashboard renders in NitroStudio, in ChatGPT, and on NitroCloud — with no
second server to deploy and nothing to keep in sync.

| Widget | Surfaces |
|---|---|
| `swarm-console` | per-agent status, timings, fact counts, pause state |
| `conflict-resolver` | side-by-side sources, two-signal scores, resolution buttons |
| `pipeline-builder` | 11-stage palette, ordered composer, run output |
| `architecture-map` | layer distribution, blast-radius meters, change-surface tracer |
| `design-system` | palette swatches, type stack, component inventory, violations |
| `skill-forge` | mint a tool and watch it register live |
| `claude-manifest` | the generated artifact + PDF/text document dropzone |

---

## Three things worth looking at closely

### 1. Cosine similarity alone cannot catch the conflict — so we don't rely on it

The architecture spec says: flag a conflict when cosine similarity drops below 0.7. That rule
**provably misses the case it was written for**. Compare:

> **Jira AUR-4471:** "Introduce a Redis cache in front of the invoice read path…"
> **Standup:** "we are NOT introducing Redis. We stay on Memcached."

These share nearly all their vocabulary. A pure similarity threshold sails straight past them.

[`semantic.service.ts`](src/shared/services/semantic.service.ts) scores two orthogonal signals:

- **Alignment** — cosine over hashed token vectors. *Are these about the same thing?*
- **Divergence** — entity extraction plus per-clause polarity (adopt / reject / freeze /
  mandate). *Do they choose differently?*

A contradiction is high divergence regardless of alignment; semantic drift is low alignment
with some divergence. Both raise a conflict, tagged with which kind it is. On the bundled
fixture: **alignment 0.21, divergence 1.00 → contradiction.** Caught.

### 2. The swarm genuinely writes and registers new MCP tools at runtime

`generate_custom_skill` is not a stub. It:

1. compiles the spec (syntax errors fail before anything touches disk);
2. writes real, reviewable NitroStack source to `src/skills/<name>.skill.ts` with a proper
   `@Tool` decorator;
3. registers it on the **running** server via `NitroStackServer.tool()` +
   `notifyToolsListChanged()`.

The verification suite asserts the tool count goes 23 → 24 in the same session and that
calling the brand-new tool returns real data. It also survives restart — skills are rehydrated
from the durable registry on boot.

### 3. The manifest is deterministic

`CLAUDE.md` is generated with **zero LLM calls**. Same repository in, byte-identical manifest
out — the verification suite asserts this. It cannot hallucinate a coverage threshold or
invent a component, every claim carries its evidence path, and it works offline with no API
key and no rate limit. Set `ANTHROPIC_API_KEY` only if you want narrative prose layered on
top; the manifest is correct without it.

---

## Honest notes

These are things a reviewer would find, so they are stated up front.

- **Jira and Slack are live, with the fixtures as a fallback.** `fetch_sprint_goals` calls the
  Jira Agile REST API and `fetch_meeting_transcripts` reads a Slack channel, both with simple
  token auth. When the credentials are absent the tools return the bundled fixtures
  (`data/mock-jira-sprint.json`, `data/mock-teams-transcript.txt`) and say so — every response
  carries `dataSource: "jira-live" | "slack-live" | "fixture"` plus a `configurationHint`
  naming the variables to set. Mock data is never presented as real. `BRIDGE_DATA_MODE=live`
  turns the fallback off entirely if you would rather fail loudly.
- **Slack, not Teams, for the spoken record.** Teams means Graph, which means an app
  registration, admin consent and a transcript permission before a single message arrives. For
  reading a channel, that ceremony buys nothing. The transcript *parser* is unchanged: Slack is
  rendered into the same `[HH:MM] Speaker: text` layout, so utterance segmentation, entity
  extraction, adopt/reject/freeze/mandate classification and the conflict engine are all reused
  verbatim. Adding another chat source is a rendering problem, not a rewrite.
- **Side-effecting pipeline stages are real, but gated twice.** `run_tests`, `push`, `deploy`,
  `update_jira` and `send_slack_message` genuinely run the test command, commit and push,
  dispatch a GitHub Actions workflow or Jenkins job, call Jira REST v3 and post to a Slack
  webhook — but only when `run_pipeline` is called with `execute_side_effects: true` *and* the
  integration is configured. The default is plan-only: each stage reports the exact command it
  would issue, derived from what the DevOps Navigator found, flagged `executed: false`. A bridge
  that force-pushes to a stranger's branch the first time someone clicks Run is not a feature.
  `push` additionally refuses protected branches and commit messages that fail the convention
  the swarm recovered.
- **Skill bodies execute in-process** via `new AsyncFunction`. That is not a security sandbox
  and is not presented as one. A deny-list rejects `require`, `import`, `process`, `eval`,
  `child_process`, `globalThis`, `fetch` and `__dirname` before compilation; the body gets no
  module scope, only a `WorkspaceService`-backed `api`; and
  `BRIDGE_ALLOW_SKILL_GENERATION=false` disables the path. Right threat model: a developer
  running this against their own codebase. Wrong threat model: accepting skill bodies from
  untrusted third parties.
- **`jsonBodyLimit` does not exist in NitroStack v1.0.14**, so the bridge installs it itself.
  The spec cites the option, but upstream it is still
  [issue #4](https://github.com/nitrocloudofficial/nitrostack/issues/4) and the transport calls a
  bare `express.json()` — body-parser's 100 kB default, two orders of magnitude below what
  `ingest_manual_document` is built for.
  [`HttpHardeningService`](src/shared/services/http-hardening.service.ts) decorates `express.json`
  on the exact express instance the transport imports, before the transport is constructed, and
  falls back to swapping the parser out of the router stack if that resolution ever changes.
  Configurable with `BRIDGE_JSON_BODY_LIMIT`; the startup banner reports the limit and how it was
  applied. Traversal safety is separate and unchanged, in
  [`WorkspaceService`](src/shared/services/workspace.service.ts): a root allow-list, a 4,000-file
  cap, a 2 MB per-file cap and a 64 MB traversal budget, with symlinks resolved before the
  containment check.
- **`@McpApp.transport` is accepted and ignored by NitroStack v1.0.14.** It selects the transport
  from `MCP_TRANSPORT_TYPE` / `NODE_ENV` and the listen address from `PORT` / `HOST`, so
  `BRIDGE_TRANSPORT=http` did nothing until [`shared/transport.ts`](src/shared/transport.ts)
  started translating it at boot. The decorator block is kept as documentation of intent and the
  two are derived from one function.
- **Restate is not used.** The value it would provide here — a long run and a human pause that
  both survive a restart — comes from MCP Tasks (`taskSupport: 'optional'`, `ctx.task`) plus an
  atomic-write JSON store that commits after every agent. One process instead of three.
- **The Vercel AI SDK is not used, and the swarm makes no LLM calls.** The architecture spec
  routes the seven personas through `experimental_createMCPClient`; here they are deterministic
  parsers, and the orchestrator is editorial rather than generative. That is a deliberate trade:
  it buys byte-identical output for the same repository, an evidence path on every claim, no API
  key, no rate limit and no hallucinated coverage threshold — and it costs the ability to
  summarise in prose. `ANTHROPIC_API_KEY` layers narrative enrichment on top if you want it; the
  manifest is complete without it.
- **The pipeline builder is an ordered chain, not a free-form React Flow canvas.** The backend
  executes a topologically sorted graph, an ordered chain is the shape that maps onto it, and it
  stays usable inside a narrow widget iframe where canvas drag-and-drop does not. Saving still
  serialises to the same node/edge JSON schema, and cycles are rejected by Kahn's algorithm
  server-side.
- The framework logs a `Cannot resolve token "OAUTH_CONFIG"` error on boot. That is NitroStack
  core instantiating its optional OAuth module; it is harmless and unrelated to this project.

---

## Configuration

Everything has a working default. Nothing is required.

| Variable | Default | Purpose |
|---|---|---|
| `BRIDGE_TRANSPORT` | `stdio` (`http` in production) | Transport mode |
| `PORT` / `HOST` | `8080` / `0.0.0.0` | HTTP listen address |
| `BRIDGE_ADMIN_API_KEY` | unset | Enables auth. One key or a comma-separated list; `label:secret` accepted |
| `BRIDGE_JWT_SECRET` | unset | Enables HS256/384/512 bearer tokens (`BRIDGE_JWT_ISSUER` / `_AUDIENCE` optional) |
| `BRIDGE_AUTH_SCOPE` | `mutations` | `all` requires a credential for reads too |
| `BRIDGE_JSON_BODY_LIMIT` | `50mb` | Max JSON request body on the HTTP transport |
| `BRIDGE_ALLOWED_ROOTS` | project + fixture | `:`-separated extra local roots the swarm may read |
| `BRIDGE_ALLOWED_REPO_HOSTS` | `github.com` | Git hosts a `target` URL may point at |
| `BRIDGE_CLONE_TIMEOUT_MS` | `120000` | Abort a clone that outruns this |
| `GITHUB_TOKEN` | unset | Clone private repositories (also used by the deploy stage) |
| `BRIDGE_DATA_MODE` | `auto` | `live` = no fixture fallback; `fixture` = never call out |
| `JIRA_BASE_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN` | unset | Live sprint state (`JIRA_BOARD_ID` optional) |
| `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` | unset | Live team decisions (`SLACK_MESSAGE_LIMIT` optional) |
| `BRIDGE_AUTHORITY_LEADS` / `_OPS` | unset | Whose spoken decision outranks a ticket |
| `BRIDGE_ALLOW_SKILL_GENERATION` | `true` | Set `false` to disable runtime skill minting |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |
| `ANTHROPIC_API_KEY` | unset | Optional; enables narrative enrichment |

Side-effecting pipeline stages are configured separately — `BRIDGE_TEST_COMMAND`,
`BRIDGE_GIT_REMOTE` / `_BRANCH` / `_ALLOW_PROTECTED`, `GITHUB_TOKEN` + `GITHUB_REPOSITORY`,
`JENKINS_URL` + `JENKINS_JOB` + credentials, `JIRA_BASE_URL` + `JIRA_EMAIL` + `JIRA_API_TOKEN`,
and `SLACK_WEBHOOK_URL`. See [`.env.example`](.env.example) for the full set.

### Securing the remote surface

Authentication is off until a credential is configured, which is right for stdio on a laptop and
wrong for a listening socket — the `security` health check reports `degraded` in exactly that
case. Once configured, the nine state-mutating tools require a credential and read-only tools
stay open (`BRIDGE_AUTH_SCOPE=all` closes those too):

```bash
export BRIDGE_ADMIN_API_KEY="dashboard:$(openssl rand -hex 24)"
export BRIDGE_TRANSPORT=http
npm start
```

```bash
curl -s localhost:8080/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resolve_conflict","arguments":{}}}'
# → 401, "This operation mutates bridge state and requires a credential."
```

Enforcement happens at two points against one list: an Express edge in front of `/mcp`, and
`AdminGuard` on the tools themselves — because stdio never touches Express. The HTTP edge copies
the verified credential into the call's `_meta`, so a request that passed the socket also passes
the guard.

### Using it from Claude Code (or any MCP client)

Register the bundled launcher from inside the project you want analysed:

```bash
cd ~/work/my-legacy-app

claude mcp add agentic-bridge \
  -e BRIDGE_ALLOWED_ROOTS="$PWD" \
  -- /abs/path/to/Agentic-Bridge/bin/agentic-bridge

claude mcp list        # → agentic-bridge: ✔ Connected
```

Then, in the session:

```
> Use agentic-bridge to run the swarm on this project and write the manifest.
> Use agentic-bridge to run the swarm on https://github.com/some-org/some-repo
```

The first writes `CLAUDE.md` into your repo root, so the *next* session in that folder starts
already knowing its architecture, dependencies and test strategy. The second analyses a repo you
have never cloned and hands the manifest back inline.

Use `bin/agentic-bridge` rather than registering `npx tsx src/index.ts` directly. An MCP client
spawns the server with the client's working directory, and both tsx's `tsconfig.json` lookup and
NitroStack's `@Widget` bundle resolution are cwd-relative — a raw command fails at boot. The
launcher `cd`s into the project first, then execs.

### Pointing at your own codebase

Every reconnaissance tool takes an optional `target`, which may be a **GitHub URL** or a local
absolute path:

```
run_swarm             { "target": "https://github.com/your-org/legacy-monolith" }
map_file_dependencies { "target": "https://github.com/your-org/legacy-monolith/tree/release-3" }
map_file_dependencies { "target": "/absolute/path/to/your/repo" }
```

The URL form is the one that matters for a hosted bridge. A server running in NitroCloud cannot
read the calling machine's disk, so a local path is meaningless there. Given a URL the bridge:

1. creates a private temp directory (`fs.mkdtemp`, mode 0700),
2. `git clone --depth 1 --single-branch --no-tags` into it,
3. runs the ordinary traversal over that directory,
4. deletes it in a `finally` — on the success path, the failure path and on process exit.

Because the clone is gone by the time the call returns, a remote run cannot write `CLAUDE.md`
into the repository it analysed. It archives the manifest under `.bridge/manifests/` **and
returns the full text as `manifestContent`**, so an agent can write it straight into its own
checkout. A local target gets `CLAUDE.md` written beside the code, as you would expect.

Only `github.com` is clonable by default; widen deliberately with
`BRIDGE_ALLOWED_REPO_HOSTS`. URLs carrying embedded credentials are refused — use `GITHUB_TOKEN`
for private repositories, which is passed to git through the environment rather than argv or the
URL, so it does not show up in `ps`.

Local paths outside the allow-list are refused with an actionable message. Opt in with:

```bash
export BRIDGE_ALLOWED_ROOTS="/Users/you/work/big-monolith"
```

---

## Deploying

```bash
npm run build
```

Bundles the 7 widgets and compiles TypeScript to `dist/`. Then from Studio's App Canvas:
**Link to app… → Deploy**. Once live, the ChatGPT connector URL is `{serviceUrl}/sse` —
verified working locally (`GET /sse` → 200, `POST /mcp` → 200 in production mode).

Ship `fixtures/` and `data/` with the bundle, or the bundled demo target will be missing in the
deployed environment.

---

## Layout

```
src/
├── index.ts                    bootstrap; body limit, transport, live server handle
├── app.module.ts               root @McpApp — see shared/transport.ts for what actually applies
├── shared/
│   ├── schemas/                every Zod schema, one place
│   ├── transport.ts            BRIDGE_TRANSPORT → the env vars NitroStack really reads
│   ├── security/
│   │   ├── protected-tools.ts     the authorisation boundary, in one list
│   │   └── admin.guard.ts         per-tool enforcement (covers stdio)
│   └── services/
│       ├── workspace.service.ts   allow-list + traversal budget — the only path to the disk
│       ├── store.service.ts       atomic-write durable state (the Restate replacement)
│       ├── semantic.service.ts    embeddings + the two-signal conflict engine
│       ├── auth.service.ts        API keys + HS256/384/512 JWT on node:crypto
│       ├── http-hardening.service.ts  50 MB body limit + the Express auth edge
│       ├── pdf-text.service.ts    PDF text layer extraction for manual ingestion
│       └── server-registry.ts     live server handle for runtime tool registration
├── modules/                    one directory per persona
│   └── pipeline/effects.service.ts  real git, CI, Jira and Slack execution
├── widgets/                    the admin dashboard (Next.js, in-project)
├── health/                     4 health checks, including security posture
└── skills/                     generated at runtime
fixtures/legacy-monolith/       34-file synthetic enterprise repo with a planted contradiction
data/                           fallback Jira sprint + chat transcript (used when live creds are absent)
scripts/verify.ts               71-assertion end-to-end suite
```

Built with `@nitrostack/core` 1.0.14 · `@nitrostack/cli` 1.0.15 · `@nitrostack/widgets` 1.0.8
