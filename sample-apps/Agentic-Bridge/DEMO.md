# Stage script

Five minutes, six beats. Everything below is verified working — `npm run verify` asserts
every claim in it.

## Before you walk on

```bash
cd agentic-bridge
npm install                        # installs + builds widgets automatically
npx tsx scripts/verify.ts          # 89/89 — also resets state to a clean slate
```

Then in NitroStudio: **Add Server → Nitro Project → this folder → Open Project → Studio App Canvas.**

Reset between rehearsals with the `reset_bridge` tool (`confirm: true`), or just re-run
`verify`, which wipes `.bridge/`, `CLAUDE.md` and `src/skills/` first.

> If a widget renders blank, disconnect and reconnect the project in Studio. That is a known
> Studio behaviour, listed in the handbook's troubleshooting table.

---

## Beat 1 — the problem (30s)

*Say it, don't demo it.*

> "This is a thirty-year-old billing monolith. If I point Claude at it, Claude writes Redis
> code — because the Jira ticket says Redis. But the engineering lead killed Redis out loud in
> Tuesday's standup and nobody updated the ticket. That decision exists only in a Teams
> transcript. **That** is the gap we close."

Have `fixtures/legacy-monolith/` open in an editor if you want something on screen.

## Beat 2 — dispatch the swarm (45s)

**Tools → `run_swarm` → Execute** (no arguments).

The **Swarm Console** widget renders: seven personas, each with its own status dot, fact count
and timing.

> "Seven specialists, one pass. Structural Cartographer builds the dependency graph with the
> TypeScript compiler API. DevOps Navigator reads the Jenkinsfile. Scrum Analyst parses the
> standup transcript."

Point at the status badge: **`awaiting-resolution`**.

> "It stopped. It found something the sources disagree about, and it will not write the
> manifest until a human rules on it."

## Beat 3 — the conflict (75s) ← *this is the beat that wins it*

**Tools → `detect_conflicts` → Execute.**

The **Conflict Resolution** widget renders. Two panels side by side, two meters above them.

> "Jira says introduce Redis. The lead says we are not introducing Redis.
>
> Now — the obvious way to catch this is cosine similarity, and the obvious way is **wrong**.
> Look at the score: **alignment 0.21**. Those two sentences share most of their vocabulary,
> so similarity alone tells you almost nothing here. Plenty of real conflicts would score
> *high*.
>
> So we score a second, independent signal: **divergence — 1.00**. We extract the technology
> entities and the polarity of the language around each one. Jira *adopts* Redis. The standup
> *rejects* Redis. Same entity, opposite verbs. That's a contradiction, and it's caught
> regardless of what the cosine says."

Click **"Source B is authoritative."**

> "That ruling just went into the knowledge base at the highest weight, and the paused swarm
> run resumed. A human decided; the machine recorded it."

## Beat 4 — the swarm writes its own tools (60s)

**Tools → `generate_custom_skill`** — or open the **Skill Forge** widget and pick
*"AuroraORM call sites"* → **Mint & register live**.

> "The swarm found a hand-rolled ORM from 2009 with no modern equivalent. A paragraph of
> documentation about it is useless to the next agent. So it writes an actual MCP tool."

Now **refresh the Tools list**.

> "Twenty-three tools a second ago. Twenty-four now. No restart, no redeploy —
> `NitroStackServer.tool()` plus a `tools/list_changed` notification. And it wrote real
> reviewable source to `src/skills/`, so the tool survives a restart and can go through code
> review like anything else."

Run the new `query_aurora_orm_usage` tool. It returns 7 call sites across
`AUDIT_LOG`, `CUSTOMER`, `INVOICE`.

## Beat 5 — the artifact (60s)

**Tools → `synthesize_claude_md` → Execute.** Open the generated `CLAUDE.md`.

Scroll to **section 0** first:

> "Section zero is the human ruling. It sits above everything else in the document, and it
> says so: *these override anything else in this document, in the ticket tracker, or in the
> code.*"

Then scroll through and land on three specifics:

- **§4** — `[TICKET-KEY]` is mandatory, header max 90 chars, coverage gate 78% lines
- **§5** — the six approved Aurora colours, and `<DataTable>` marked as the mandatory list primitive
- **§3** — "aurora-orm.js is frozen. Fixes go in the service layer." — recovered from spoken words

> "Every line here carries its evidence path. And this is generated with **zero LLM calls** —
> same repo in, byte-identical manifest out. It can't hallucinate a coverage threshold,
> it works offline, and it costs nothing to regenerate."

## Beat 6 — the close (30s)

Open the **Pipeline Builder** widget briefly, then land the point:

> "All of this is NitroStack. The seven agents are `@Tool` classes. This dashboard is
> `@nitrostack/widgets` — those buttons call MCP tools through the Widget SDK. Durability and
> the human pause are MCP Tasks plus an atomic-write store. One process, deploys to NitroCloud
> with `npm run build`, and the same dashboard renders in ChatGPT at `{serviceUrl}/sse`.
>
> We didn't bolt a frontend onto an MCP server. The MCP server *is* the product."

---

## If a judge pushes back

**"Isn't the conflict detection just keyword matching?"**
> Partly, and deliberately. It is two signals: a real hashed-TF cosine embedding for topical
> alignment, and entity-plus-polarity extraction for decision divergence. We chose determinism
> over an LLM call because a demo that hallucinates a coverage threshold is worse than useless,
> and because an auditor needs to be able to reproduce the manifest exactly. The lexicon is one
> array — extending it is a one-line change.

**"The Jira and Teams data is mocked."**
> Yes, and it says so in the README. Live OAuth is a token-plumbing exercise, not an
> architecture one. `AgileService.loadSprint()` is the seam — swap the file read for a REST
> call and nothing downstream changes.

**"Does it work on a real codebase?"**
> Yes — pass `target` to any tool. Set `BRIDGE_ALLOWED_ROOTS` and point it at yours right now.
> The traversal is budgeted at 4,000 files and 64 MB, so it won't hang on a monorepo.

**"What happens if it crashes mid-run?"**
> Run state commits to disk after every agent, atomically. Restart and `get_swarm_run` shows
> exactly where it was. Generated skills rehydrate on boot. That is what we used instead of
> Restate — same guarantee, one process.

**"The pipeline stages don't really do anything, do they?"**
> They do. `run_pipeline` takes `execute_side_effects: true`, and then `run_tests` spawns the
> project's own test command and captures the output, `push` runs git, `deploy` dispatches a
> GitHub Actions workflow or a Jenkins job, `update_jira` calls Jira REST v3 to transition the
> ticket and comment, and `send_slack_message` posts to a webhook. The default is plan-only
> because a bridge that force-pushes the first time someone clicks Run is not a feature — and
> even in execute mode `push` refuses a protected branch and refuses a commit message that
> fails the convention the swarm recovered from `commitlint.config.js`.

**"What stops anyone hitting the deployed server and overruling a conflict?"**
> Set `BRIDGE_ADMIN_API_KEY` and the nine state-mutating tools require a credential — refused
> 401 without one, 403 with a wrong one — while read-only tools stay open so agents can still
> ask questions. It's enforced twice against one list: an Express edge in front of `/mcp`, and
> a guard on the tools themselves, because stdio never touches Express. JWT works too, HS256
> through HS512, verified on `node:crypto`.

**"Can I give it the architecture PDF nobody ever checked in?"**
> Drop it on the manifest widget. `ingest_manual_document` parses the PDF text layer —
> FlateDecode, object streams, per-font ToUnicode CMaps — chunks it into the same vector space
> as everything else, and it's searchable immediately and in the next manifest. The spec PDF
> for this project ingests as 15 pages and 53 chunks.

**"You didn't build the Next.js dashboard from the spec."**
> Correct, and on purpose. NitroStack widgets *are* Next.js React, and the Widget SDK's
> `callTool()` gives them full interactivity. Building a separate app would have meant three
> processes on stage and less of the demo running on NitroStack. Every pixel you saw is
> NitroStack rendering.
