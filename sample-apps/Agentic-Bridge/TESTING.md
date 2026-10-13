# Testing the pipeline against real systems

There was no single guide for this, which is why this file exists. The other documents each
cover a slice:

| File | What it actually covers |
|---|---|
| `README.md` | Reference — config table, env vars, how to register with an MCP client |
| `.env.example` | Every variable, annotated, with working defaults |
| `PITCH.md` | Presentation script — stage beats and talk track, fixture-first |
| `DEMO.md` | Timed stage script for the bundled fixture |
| `scripts/verify.ts` | 71 automated assertions; adapts to live creds but does not help you get them |
| **this file** | Zero → validated live setup, on your own codebase and your own Jira |

Work through the phases in order. Each one is independently useful, and each ends with a
concrete check so you know whether to continue or stop and fix something.

---

## Ground truth: what has and has not been tested

Be aware of this before you start, because it tells you where bugs are most likely.

**Verified working end to end:**

- Fixture baseline — 7/7 agents, 56 facts, 3 conflicts, manifest withheld
- Real GitHub clone + full swarm — `expressjs/express`, `sindresorhus/p-limit`, `octocat/Hello-World`
- Local project analysis driven through Claude Code, manifest written to the repo root
- Manifest destinations for local vs remote targets, and clone cleanup on every path
- Jira/Slack **failure** handling — 404, wrong board id, `invalid_auth` all produce specific messages

**Never executed against a real credential** (nobody has run these against a live tenant yet):

- A *successful* Jira sprint fetch
- A *successful* Slack channel read
- ADF (Atlassian Document Format) description flattening against real Jira output
- Story-point custom-field detection on a real site
- Slack display-name resolution and `<@U123>` markup cleanup

Those five are where first contact with a real API is most likely to surface something. Phase 2
and 3 below exist specifically to shake them out.

---

## Phase 0 — baseline, no credentials (2 min)

Prove the machine works before adding variables.

```bash
cd /home/ks/Desktop/Projects/Agentic-Bridge
npm install
npm run typecheck          # must print nothing
rm -rf .bridge             # cold start
npm run verify
```

**Expected:** `4 FAILED, 67 passed`.

Those four failures are pre-existing and unrelated to live integrations — the demo fixture holds
three planted contradictions while `verify.ts` still asserts exactly one, so
`synthesize_claude_md` correctly refuses on the two the script never resolves. See *Known issues*
at the bottom. **Anything other than exactly those four means something else is wrong — stop and
investigate before continuing.**

---

## Phase 1 — your own codebase, still no live systems (5 min)

This isolates the traversal and synthesis half from the integration half.

```bash
npm run doctor
```

**Expected:** two yellow warnings (Jira, Slack unconfigured), everything else green, including
`a real shallow clone succeeded and cleaned up`. Exit code 0.

### 1a. A GitHub repo — nothing to set up

```bash
npx tsx -e "
  // or just call run_swarm from Studio / Claude Code
" # easiest path is Studio: run_swarm { \"target\": \"https://github.com/<you>/<repo>\" }
```

Check in the response:

- `status: completed`
- `source.kind: "github"`, with a real `commit` SHA
- `target` reads `owner/repo@branch`, **not** a `/tmp/...` path
- `manifestDestination: "clone-archive"` and `manifestContent` is populated
- `product-synchronizer` and `scrum-analyst` report **`skipped — no live Jira/Slack configured`**

That last point is the important one. Fixture sprint data must **not** appear in a manifest for
your repo. If you see `AUR-4471` or `Aurora` anywhere in the output, that is a bug — report it.

### 1b. A local path

```bash
export BRIDGE_ALLOWED_ROOTS="/absolute/path/to/your/repo"
```

Then `run_swarm { "target": "/absolute/path/to/your/repo" }`.

⚠️ **This writes `CLAUDE.md` into that repo's root, overwriting any existing one.** Back it up
first, or pass `output_path`. Do not point it at the Agentic-Bridge repo itself.

**Sanity-check the manifest:** open it and confirm the dependency list, the test framework and
the CI pipelines match what is actually in your repo. Section 3 should be empty or absent — you
have no live human sources yet.

---

## Phase 2 — real Jira (15 min)

### 2a. Get credentials

1. **API token:** `id.atlassian.com` → Security → *Create and manage API tokens* → Create.
   Copy it immediately; it is shown once.
2. **Site URL:** the base of your Jira, e.g. `https://your-org.atlassian.net` — no trailing path.
3. **Email:** the account the token belongs to. Basic auth here is *email + token*, not your
   password.
4. **Board id:** open your board; the URL ends `.../boards/<N>`. That `<N>` is the id.

If you do not have a Jira to test against, a free Atlassian Cloud site takes about five minutes:
create a **Scrum** project (Scrum, not Kanban — you need sprints), create and **start** a sprint,
add 5–6 issues, and drag them so you have a realistic spread across To Do / In Progress /
In Review / Done.

### 2b. Wire it up

Put these in `.env` at the project root (it is gitignored):

```bash
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=you@your-org.com
JIRA_API_TOKEN=your-token-here
JIRA_BOARD_ID=1
```

### 2c. Validate before running anything expensive

```bash
npm run doctor
```

This calls the exact `JiraClient` the swarm uses. **Expected on success:**

```
2. Jira — sprint state and backlog
  ✓ credentials present     https://your-org.atlassian.net as you@your-org.com
  ✓ board                   JIRA_BOARD_ID=1
  ✓ live sprint fetched     board 1 "…" → "Sprint 3" (active)
  ✓ issues returned         6
  ✓ backlog splits cleanly  1 done · 3 in progress · 2 to do
```

Failure messages are specific — these are verified real outputs:

| Message | Meaning |
|---|---|
| `Jira returned 404 — the resource does not exist` | `JIRA_BASE_URL` host is wrong |
| `Jira board 1 does not exist or is not visible` | wrong `JIRA_BOARD_ID`, or the account cannot see it |
| `the credential was rejected` (401) | email/token pair wrong — token revoked, or you used a password |
| `authenticated, but not permitted` (403) | account lacks Jira Software / board access |
| `has no active sprint` | the board's sprint exists but was never **started** |

### 2d. Test the tool itself

Call `fetch_sprint_goals` (Studio, or Claude Code). **Verify each of these:**

- `dataSource: "jira-live"` — if it says `"fixture"`, the credentials silently did not take
- `sprint.name` and `sprint.goal` match your board
- `backlog.counts` matches what you see on the board
- `backlog.guidance` names the right in-flight tickets
- **Descriptions are readable prose, not JSON** — this exercises the untested ADF flattening.
  If you see `{"type":"doc","content":[...]}` leaking through, that is a bug worth reporting.
- `issues[].storyPoints` is populated if your board uses points. If every issue shows
  `undefined` but Jira shows points, set `JIRA_STORY_POINTS_FIELD` — find the field id at
  `<your-site>/rest/api/3/field` and search for "Story Points".

### 2e. Force live-only mode

```bash
BRIDGE_DATA_MODE=live npm run doctor -- --strict
```

This turns off the fixture fallback entirely. Anything unconfigured or broken now fails hard
instead of degrading. Use this mode for real testing so a silent fallback cannot mask a problem.

---

## Phase 3 — real Slack (10 min, optional)

Only needed for the conflict engine — sections 0 and 3 of the manifest.

1. `api.slack.com/apps` → **Create New App** → From scratch.
2. **OAuth & Permissions** → Bot Token Scopes → add `channels:history`, `groups:history`,
   `users:read`.
3. **Install to Workspace**, copy the `xoxb-…` **Bot User OAuth Token**.
4. In Slack, invite the bot to the channel: `/invite @your-app-name`. ← most commonly forgotten
5. Channel id: channel → **Copy link** → the `C…` segment.

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C0123456789
SLACK_MESSAGE_LIMIT=50
```

```bash
npm run doctor
```

| Message | Meaning |
|---|---|
| `invalid_auth` | token wrong or revoked — must start with `xoxb-` |
| `not_in_channel` | the bot was never invited (step 4) |
| `channel_not_found` | you used `#name` instead of the `C…` id |
| `missing_scope` | add the scopes and **reinstall** the app |
| `no messages parsed into utterances` | the channel is empty or bot-only |

Then call `fetch_meeting_transcripts` and check `dataSource: "slack-live"`, that speaker names
are **real display names** rather than raw `U01ABCDEF` ids, and that `<@U…>` mentions and links
were converted to readable text. Both are untested against a live workspace.

**For the conflict engine to have anything to find**, the channel needs messages that actually
contradict a ticket. Post something like *"we are NOT doing X, we're staying on Y"* where X is
something a ticket in your sprint proposes.

---

## Phase 4 — the full pipeline, everything live (10 min)

The real test. All three sources genuine.

```bash
npm run doctor            # must be ALL INTEGRATIONS LIVE
BRIDGE_DATA_MODE=live npm run verify
```

With live credentials the suite asserts `dataSource === "jira-live"` and `"slack-live"` rather
than the fixture fallback, so this exercises a different path than Phase 0.

Then the end-to-end run against your own repo:

```
run_swarm { "target": "https://github.com/<you>/<your-repo>" }
```

**What to check in the result:**

1. All 7 agents `done`, and the agile personas now report `· jira-live` / `· slack-live`
2. `conflictSources: { jira: "jira-live", chat: "slack-live" }`
3. If you planted a contradiction in Phase 3, `status: "awaiting-resolution"` and the run paused
4. `detect_conflicts` shows your real ticket against your real Slack message, side by side
5. `resolve_conflict` → the run resumes → `synthesize_claude_md`
6. Section 0 of the manifest contains **your** ruling; section 3 contains **your** sprint

That is the whole product working on entirely real data.

---

## Phase 5 — through Claude Code (5 min)

```bash
cd ~/your-project

claude mcp add agentic-bridge \
  -e BRIDGE_ALLOWED_ROOTS="$PWD" \
  -- /home/ks/Desktop/Projects/Agentic-Bridge/bin/agentic-bridge

claude mcp list        # → agentic-bridge: ✔ Connected
```

Use `bin/agentic-bridge`, not `npx tsx src/index.ts` — an MCP client spawns the server with its
own cwd, and both tsx's tsconfig lookup and NitroStack's widget resolution are cwd-relative. The
raw command fails with `Cannot access 'AppModule' before initialization`.

Then, in the session:

```
> Use agentic-bridge to run the swarm on this project and write the manifest.
> Use agentic-bridge to run the swarm on https://github.com/some-org/some-repo
```

Note that `claude mcp add` env vars are captured at registration time — if you change `.env`
afterwards, remove and re-add the server, or pass the values with `-e`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `dataSource: "fixture"` when you expected live | env vars not loaded by the running process | restart the server; if via `claude mcp`, re-register — env is captured at registration |
| `Refusing to traverse … outside the allow-list` | local target not allow-listed | `export BRIDGE_ALLOWED_ROOTS=/abs/path` and restart |
| `Refusing to clone from gitlab.com` | host not permitted | `BRIDGE_ALLOWED_REPO_HOSTS=github.com,gitlab.com` |
| `it is private or does not exist` | private repo, no token | set `GITHUB_TOKEN` with repo read access |
| `Cloning … exceeded 120000ms` | large repository | raise `BRIDGE_CLONE_TIMEOUT_MS` |
| Aurora/AUR-4471 appears in *your* repo's manifest | fixture leak — this is a bug | report it; the guard should suppress it |
| Swarm truncates on a big monorepo | traversal budget | 4000 files / 2 MB per file / 64 MB total; the response says when it truncated |
| `Exported HTML for route … not found` | widgets never built, or wrong cwd | `npm run setup`, and use `bin/agentic-bridge` |

Useful signals:

```bash
npm run doctor              # integration status, with fixes
# the `live-data` health check reports the same thing from a running server
```

---

## Deploying to NitroCloud (or any container platform)

The server boots and binds correctly in production — the failure mode to know about is a
platform marking the rollout failed while the logs show a perfectly healthy app. That is a
**probe** problem, not a boot problem.

**Endpoint map, verified in production mode:**

| Path | Answers | Notes |
|---|---|---|
| `/health` `/healthz` `/readyz` `/livez` | 200 | mounted by this project for orchestrators; never require a credential |
| `/mcp/health` | 200 | NitroStack's own; note the `/mcp` prefix |
| `/mcp` | MCP protocol | POST/GET/DELETE; credential required per `BRIDGE_AUTH_SCOPE` |
| `/` | docs page | **401 when `BRIDGE_AUTH_SCOPE=all`** |

Reproduce the container's exact conditions locally before redeploying:

```bash
NODE_ENV=production PORT=3000 HOST=0.0.0.0 \
  BRIDGE_ADMIN_API_KEY=... BRIDGE_AUTH_SCOPE=... \
  npx tsx src/index.ts

curl -i http://127.0.0.1:3000/health      # must be 200
curl -i http://127.0.0.1:3000/mcp/health  # must be 200
```

The boot banner now names the mounted probe paths, so a deploy log answers the question directly:

```
[bridge] Liveness probes: /health, /healthz, /readyz, /livez (framework health: /mcp/health)
```

If it prints `NONE MOUNTED`, the transport did not expose an Express app and the platform has
only `/mcp/health` to probe.

**Checklist when a deploy fails but the app logs look healthy:**

1. **What path does the platform probe, and does it 404?** Health lives at `/mcp/health` under
   NitroStack's own routing; the unprefixed aliases above exist because most orchestrators
   assume `/health`.
2. **Is `BRIDGE_AUTH_SCOPE=all` set?** Under `all` every non-health path needs a credential,
   including `/`. A probe hitting `/` gets 401 and fails the rollout. Use the default
   (`mutations`) unless you specifically need reads gated too.
3. **Is the probe on the right port?** The app honours `PORT`; confirm the platform's expected
   port matches the `[bridge] Transport:` line in the logs.
4. **`Cannot write to /app/.bridge (EACCES)`** is expected on a read-only container and is
   non-fatal — state falls back to a tmpdir. For durable knowledge across restarts, mount a
   volume and set `BRIDGE_STATE_DIR` to it.
5. **`git` may be absent from a slim runtime image.** Without it, GitHub-URL targets cannot be
   cloned; the `live-data` health check reports this. Local paths still work.

Note that health checks reporting `degraded` (no admin key, no git, fixtures instead of live
Jira) are legitimate operating states and deliberately do **not** fail the liveness probes.

## Known issues

- **`npm run verify` reports `4 FAILED, 67 passed` on a clean checkout.** One root cause: the
  demo fixture contains three planted contradictions while the script asserts exactly one. The
  product behaviour is correct — refusing to synthesize with unresolved conflicts is the whole
  point — the assertion is stale. Fix is a two-line change in `scripts/verify.ts`; left alone
  because whether the fixture should hold one conflict or three is a product decision.
- **Two HTTP-transport checks are flaky** under parallel runs (port contention on 8991). They
  pass in isolation.
