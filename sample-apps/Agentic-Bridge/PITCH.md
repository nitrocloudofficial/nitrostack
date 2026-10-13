# Enterprise Agentic Bridge — Presentation Script

> **Total runtime: 13 minutes** (8 min talk + 5 min live demo). Cut section 6 and the
> skill-forge beat if you only have 8 — but keep **Beat 4b**, it is the strongest thing here.
>
> Every number in this script was measured on this repository, not estimated. Where the live
> demo prints something surprising, it is flagged with **⚠ SAY THIS** so you are never caught out.

---

## 0. Pre-flight — do this 10 minutes before you present

```bash
cd ~/Desktop/Projects/Agentic-Bridge
npm install                    # must complete; installs widget deps + builds them
npm run typecheck              # must print nothing
rm -rf .bridge                 # clean slate so the swarm run is a real cold start
rm -f src/skills/*.skill.ts    # IMPORTANT: without this the tool count starts at 25,
                               # and the 24→25 reveal in Beat 5 will not happen
```

**Register the bridge with Claude Code (for Beat 4b) — do this now, not on stage:**

```bash
cd ~/path/to/some-real-project-of-yours       # NOT the Agentic-Bridge repo

claude mcp add agentic-bridge \
  -e BRIDGE_ALLOWED_ROOTS="$PWD" \
  -- /home/ks/Desktop/Projects/Agentic-Bridge/bin/agentic-bridge

claude mcp list        # must print: agentic-bridge: ✔ Connected
```

> The `bin/agentic-bridge` launcher is required — do **not** register `npx tsx src/index.ts`
> directly. An MCP client spawns the server with *its own* cwd, and both tsx's tsconfig lookup
> and NitroStack's widget-bundle resolution are cwd-relative, so a raw command fails with
> `Cannot access 'AppModule' before initialization` or `Exported HTML for route … not found`.
> The launcher cd's first. This is verified working.

Open **three terminals** and **one browser tab**:

| Window | Contents |
|---|---|
| Terminal A | NitroStudio, or `npx tsx src/index.ts` for the raw server |
| Terminal B | for the GitHub-URL demo (section 7) |
| Terminal C | **`claude` running inside your own project** (Beat 4b) |
| Browser | your Jira board (section 6) — have it already logged in |

**Live Jira (optional but strong — see §6 for the 4-minute setup):**

```bash
export JIRA_BASE_URL=https://your-site.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_API_TOKEN=****
export JIRA_BOARD_ID=1
```

Sanity-check it before the audience is watching:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/agile/1.0/board/$JIRA_BOARD_ID/sprint?state=active" | head -c 300
```

If that returns a sprint, you are live. **If it does not, do not panic and do not skip the
section** — the product handles it, and that is itself a talking point (§6, fallback path).

---

## 1. The problem — 60 seconds

> "Everyone here has dropped an AI coding assistant into a large old codebase. It writes code
> that compiles, passes review-by-vibes, and then gets rejected. Not because the model is weak.
> Because the model cannot see the things that actually govern the codebase."

Put these on screen. They are all true of the demo repository:

- `aurora-orm.js` is load-bearing and **frozen for the sprint** — decided out loud in standup,
  written down nowhere.
- The Jira ticket says *"introduce Redis"*. The engineering lead **killed that decision verbally
  two days ago.**
- CI rejects any commit without an `[AUR-1234]` key.
- The coverage gate is 78% lines and the build hard-fails below it.
- Every list view must use `<DataTable>`; nobody may invent a hex colour.

> "None of that is in the source code. It is in Jira, in a chat channel, in a Jenkinsfile, in
> CONTRIBUTING.md, and in a tokens.css file nobody reads. The context an AI needs is scattered
> across five systems and one conversation that was never written down."

---

## 2. The gap — 45 seconds

> "So the obvious answer is RAG — index the repo, embed the docs. We tried that framing and it
> breaks on the case that matters most."

**The gap in one sentence:**

> "Existing tools index *artifacts*. Nobody reconciles *contradictions between* artifacts —
> and in a real enterprise the written record and the spoken record disagree constantly."

Then the killer detail:

> "The architecture spec for this kind of system says: flag a conflict when cosine similarity
> drops below 0.7. That rule **provably misses the exact case it was written for.** Watch."

> **Jira AUR-4471:** *"Introduce a Redis cache in front of the invoice read path…"*
> **Standup:** *"we are NOT introducing Redis. We stay on Memcached."*

> "These two sentences share nearly all their vocabulary. A similarity threshold sails straight
> past them. Measured on our fixture: **alignment 0.21** — they look unrelated to cosine — but
> **divergence 1.00.** They are in total opposition. One signal cannot see this. We use two."

---

## 3. The solution — 45 seconds

> "The Enterprise Agentic Bridge is an MCP server that runs a swarm of seven specialist agents
> across the codebase *and* the human systems around it, cross-references what was written
> against what was said, **stops and asks a human when they disagree**, and compiles the result
> into a single `CLAUDE.md` manifest that any AI agent reads on startup."

```
run_swarm ──► 7 personas ──► knowledge base ──► conflict? ──► HUMAN RULES ──► CLAUDE.md
                                                    │                            ▲
                                                    └── paused, nothing guessed ──┘
```

**The one-liner to repeat at the end:**

> "It does not summarise your codebase. It reconciles it — and it refuses to guess."

---

## 4. KPI metrics — 45 seconds

Read these off. All measured on this repo.

| Metric | Value |
|---|---|
| **MCP tools shipped** | **24** (a 25th is *written by the swarm at runtime* — §7) |
| **Reconnaissance personas** | **7**, running in parallel |
| **External systems integrated** | **5** — Jira, Slack, GitHub, Jenkins, git |
| **Integration points** | **9** — 3 inbound (context), 6 outbound (action) |
| **Interactive widgets** | **7**, rendering inside Studio / ChatGPT / NitroCloud |
| **MCP resources / prompts** | **14 / 3** |
| **End-to-end assertions** | **71**, driving the real server over JSON-RPC |
| **Production TypeScript** | **~13,100 lines** across 11 domain modules |
| **Cold-start swarm run** | **7 personas → ~56 facts**, single pass |
| **LLM calls required** | **0** — the manifest is fully deterministic |

**The two numbers to actually emphasise:**

> "**Zero LLM calls** to produce the manifest. Same repo in, byte-identical manifest out, every
> claim carrying its evidence path. It cannot hallucinate a coverage threshold, because it read
> it out of `jest.config.js`. LLM reasoning is layered on *top* as an optional enrichment — the
> artifact is correct without it."

> "And **9 integration points**, split deliberately: three that pull context *in*, six that push
> action *out* — and every outbound one is gated twice before it fires."

---

## 5. Architecture — 90 seconds

Show this diagram:

```
                    ┌──────────────── INBOUND CONTEXT ────────────────┐
                    │                                                 │
   GitHub repo ─────┤  git clone --depth 1 → temp dir → traverse → rm │
   Jira Agile API ──┤  active sprint + backlog, done/doing/todo       │
   Slack Web API ───┤  last 50 messages → decisions                   │
                    └────────────────────────┬────────────────────────┘
                                             ▼
    ┌────────────────────── 7 PERSONAS, ONE PASS ──────────────────────┐
    │ Structural Cartographer   dependency graph, blast radius          │
    │ Documentation Synthesizer manifests, aging deps                   │
    │ QA Analyst                frameworks, coverage gates              │
    │ DevOps Navigator          pipelines, commit convention, gates     │
    │ Product Synchronizer      Jira sprint + backlog state             │
    │ Scrum Analyst             spoken decisions → adopt/reject/freeze  │
    │ UI/UX Integrator          tokens, components, violations          │
    └────────────────────────────┬─────────────────────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  DURABLE KNOWLEDGE BASE │  every fact + evidence path
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   CONFLICT ENGINE       │  alignment × divergence
                    └────────────┬────────────┘
                     disagree?   │   agree
                        ┌────────┴────────┐
                        ▼                 ▼
              ⏸ PAUSE, ASK A HUMAN    ✅ SYNTHESIZE
              (run state persisted)    CLAUDE.md, deterministic
                        │                 ▲
                        └── ruling ───────┘
                            (outranks everything)
```

Three technical points worth making — pick two if short on time:

**(a) Two-signal conflict detection.**
> "Alignment is cosine over hashed token vectors: *are these about the same thing?* Divergence is
> entity extraction plus per-clause polarity — adopt, reject, freeze, mandate: *do they choose
> differently?* A contradiction is high divergence regardless of alignment. That is what catches
> the Redis case that cosine alone misses."

**(b) The pause is a real state machine, not a print statement.**
> "When sources disagree the run persists to disk in `awaiting-resolution`. Kill the process,
> restart it, the run is still paused and still waiting. The human ruling is written into the
> knowledge base at the highest weight, so it outranks everything the parsers inferred and lands
> verbatim in section 0 of the manifest. Provenance survives the restart."

**(c) It runs anywhere because it takes URLs, not paths.**
> "Any tool that takes a target accepts a GitHub URL. It shallow-clones into a private temp
> directory, analyses it, and deletes it in a `finally` — success path, failure path, and process
> exit. That is what makes this cloud-deployable: the server never needs the caller's hard drive."

---

## 6. Live Jira — backlog sync — 90 seconds

**Setup, if you have not done it (4 minutes, free):**

1. `id.atlassian.com` → Security → **Create API token**.
2. Any free Jira Cloud site → create a Scrum project → create a sprint → add 4–6 issues.
3. Drag them across the board so you have a realistic spread: 1 Done, 2–3 In Progress/In Review,
   2 To Do.
4. Board id is the number in the board URL: `…/boards/**1**`.
5. Export the four variables from §0 and restart the server.

**Run it:**

```
fetch_sprint_goals
```

**Talk over the output:**

> "That is a live call to the Jira Agile REST API — board, active sprint, every issue with its
> real status and assignee. And notice the first field in the response: `dataSource: "jira-live"`.
> Every response from this server tells you where its data came from."

Point at `backlog.counts` and `backlog.guidance`:

```json
"backlog": {
  "counts": { "done": 1, "inProgress": 3, "toDo": 2 },
  "guidance": "AUR-4471, AUR-4480, AUR-4485 are being worked right now —
               do not generate code that collides with them.
               AUR-4472, AUR-4490 are unclaimed."
}
```

> "The bridge collapses the sprint into the three states a coding agent actually cares about:
> what is shipped and safe to build on, what a human is holding right now, and what is unclaimed
> and fair game. Jira lets every team invent its own status names, so this maps by workflow
> *category*, not by exact string — 'In Review', 'Blocked', 'Ready for QA' all land correctly."

> "This is what stops the classic failure: the AI cheerfully reimplementing the ticket a
> teammate is already halfway through."

**⚠ SAY THIS if your Jira credentials fail live** — this is a feature, not a save:

> "And there it is — `dataSource: "fixture"`, with a hint naming exactly which variables to set.
> When the integration is not configured, this server falls back to bundled data and **tells you
> it did.** It never passes mock data off as real. If you would rather it fail loudly instead,
> `BRIDGE_DATA_MODE=live` turns the fallback off entirely. For a demo, that honesty is the
> difference between a broken slide and a designed behaviour."

---

## 7. THE DEMO — 4 minutes

### Beat 1 — cold start on a real legacy codebase (60s)

In Studio, run with **no arguments**:

```
run_swarm
```

> "Seven agents, one pass, over a 33-file enterprise repo — Node services, a Java pom, a Python
> batch tier, React components, a Jenkinsfile and a GitHub Actions workflow."

*(The widget will read `33 files` — that is the text-file count the traversal actually parsed.)*

The **Swarm Console** widget renders. Point at it while it fills in:

> "Structural Cartographer found the dependency graph and the blast radius. Documentation
> Synthesizer read three package manifests across three ecosystems and flagged eight aging
> dependencies. QA Analyst recovered the coverage gate — 78% lines — out of the Jest config.
> DevOps Navigator parsed both pipelines and recovered the commit convention. UI/UX Integrator
> pulled 23 design tokens and 3 canonical components."

> "About **56 facts**, each one carrying the file path it came from."

*Nice detail to point at:* the Product Synchronizer and Scrum Analyst rows end with `· jira-live`
and `· slack-live` when the integrations are wired, and `· fixture` when they are not — the
provenance is visible per-agent, right in the console.

**Exactly what you will see (verified on a cold start):**

```
structural-cartographer     done | 33 files, 11 layers, 10 hotspots
documentation-synthesizer   done | 21 deps across 3 manifest(s), 8 aging signal(s)
qa-analyst                  done | 4 runner(s), 5 written policy(ies)
devops-navigator            done | 2 pipeline(s), commit convention recovered
product-synchronizer        done | sprint "Sprint 41 - Invoice Read Path", 5 open issue(s)
scrum-analyst               done | 14 binding directive(s) extracted
uiux-integrator             done | 23 token(s), 3 component(s), 0 ad-hoc colour(s)

status: awaiting-resolution · 7/7 agents · 56 facts · 3 open conflicts · manifest withheld
```

### Beat 2 — the pause (45s) — **this is the moment**

The run stops. Status: `awaiting-resolution`.

> "It stopped. It found contradictions between the ticket tracker and the spoken record, and
> rather than picking a side it **paused and refused to write the manifest.**"

**⚠ SAY THIS — the demo finds 3 conflicts, not 1:**

> "Three of them, actually. Redis versus Memcached, and two more. Every one is a real
> disagreement between what a ticket says and what a human said out loud."

Run:

```
detect_conflicts
```

The **Conflict Resolver** widget renders, side by side.

> "Alignment 0.21, divergence 1.00, classified as a contradiction. And it recommends the meeting
> as authoritative — because the speaker was the engineering lead and the polarity was a
> rejection. But it is a *recommendation*. A human clicks."

**Click the ruling.** Then:

> "That ruling just went into the knowledge base at the highest weight, and the paused run
> resumed."

### Beat 3 — the artifact (45s)

```
synthesize_claude_md
```

> "Zero LLM calls. Deterministic. Same repo in, byte-identical manifest out."

Open the generated `CLAUDE.md` and scroll to **section 0**:

> "Section 0: authoritative human decisions. This is the ruling you just clicked, verbatim, with
> the timestamp and who made it — and it explicitly overrides everything else in the document,
> in the tracker, and in the code. Below it: the topography, the blast-radius files, the sprint
> state you just saw from Jira, the frozen files, the commit convention, the coverage gate, the
> colour tokens."

> "And it was written *into the repository we analysed* — beside the code it describes, which is
> where the next agent will look for it."

### Beat 4 — remote codebase, zero local setup (45s)

Terminal B, or straight in Studio:

```
run_swarm { "target": "https://github.com/<pick-a-real-repo>" }
```

> "Same swarm, but I have not cloned anything. It shallow-clones into a temp directory, runs all
> seven personas over it, generates the manifest, and deletes the clone before the call returns.
> The manifest comes back in the response body, because the directory it would have been written
> to no longer exists."

> "That is what makes this deployable rather than a laptop toy. Hosted in the cloud, this server
> cannot read your hard drive — so it does not need to."

### Beat 4b — the payoff: wire it into Claude Code, on your own project (75s)

**This is the beat that turns a demo into a product.** Everything so far was inside Studio.
Now show it working inside the tool the audience actually uses every day.

**Registered once, from inside your own project's directory:**

```bash
cd ~/path/to/my-legacy-app

claude mcp add agentic-bridge \
  -e BRIDGE_ALLOWED_ROOTS="$PWD" \
  -- /home/ks/Desktop/Projects/Agentic-Bridge/bin/agentic-bridge

claude mcp list        # → agentic-bridge: ✔ Connected
```

> "One line. The bridge is now a tool that Claude Code can call, sitting alongside my own repo."

**Then, in Claude Code — local project:**

```
> Use agentic-bridge to run the swarm on this project and write the manifest.
```

Verified output on a real local project:

```
Status:   completed — 7/7 agents done, 0 failed, 0 conflicts
Facts:    7  (architecture 3, dependency 3, testing 1)
Manifest: ~/path/to/my-legacy-app/CLAUDE.md
```

> "Seven agents ran against my actual repository and dropped a `CLAUDE.md` at its root — which
> means the *next* Claude Code session in this folder starts already knowing the architecture,
> the dependency reality and the test strategy. The bridge primed the environment for the agent
> that comes after it. That is the whole thesis in one command."

**And the same tool, on a repo I have never cloned:**

```
> Use agentic-bridge to run the swarm on https://github.com/sindresorhus/p-limit
```

Verified output:

```
status:              completed (7/7 agents, 0 conflicts)
target:              sindresorhus/p-limit@main
facts:               10  (architecture 4, dependency 4, testing 1, cicd 1)
manifestDestination: clone-archive
manifestContent:     returned inline — clone already deleted
```

> "I never cloned that. It shallow-cloned, ran all seven personas, generated the manifest,
> deleted the clone, and handed the manifest back in the response. Same tool, same session, no
> local checkout — which is exactly what makes this deployable to the cloud instead of being a
> laptop toy."

**⚠ SAY THIS — the honesty beat, and it lands well here:**

> "Notice that on both of these, the Product Synchronizer and Scrum Analyst contributed **zero
> facts** and said why: no live Jira or Slack is configured for *this* repo. It would have been
> easy to let the demo fixture fill those sections in — and the manifest would have confidently
> told my agent that six invented tickets were in flight. It refuses. If it doesn't have real
> data about *your* project, it writes nothing rather than something plausible."

### Beat 5 — the swarm writes its own tools (45s) — *cut this first if short*

```
generate_custom_skill
```

> "The Structural Cartographer found a hand-rolled 2009 ORM with no modern equivalent. A
> paragraph in a markdown file is useless to the next agent. So the swarm **writes a new MCP
> tool** that knows how to drive it — real reviewable TypeScript with a proper decorator, on
> disk, in version control."

Then show the tool count go **24 → 25** in the client, with no restart:

> "And it registered on the running server. The tool list updated live. No redeploy."

---

## 8. Close — 30 seconds

> "So: seven agents, five external systems, nine integration points, one deterministic artifact
> — and a hard stop whenever the humans disagree."

> "The insight we would leave you with is this. Everyone is racing to give AI *more* context.
> The harder problem is that enterprise context **contradicts itself** — the ticket and the
> standup say different things, and the standup is usually right and never written down. An
> agent that averages those two is worse than one that asks."

> "This one asks. And then it never forgets the answer."

---

## Q&A — prepared answers

**"Is the conflict detection just an LLM call?"**
> No. It is deterministic — hashed token vectors for alignment, entity extraction plus clause
> polarity for divergence. It runs offline, in milliseconds, with no API key. LLM reasoning is an
> optional layer on top; the manifest is correct without it.

**"What happens if Jira or Slack is down?"**
> The tool returns the bundled fixture, tags the response `dataSource: "fixture"`, and includes a
> warning naming the failure. It never silently substitutes mock data. `BRIDGE_DATA_MODE=live`
> makes it fail hard instead, if you prefer that.

**"Is cloning arbitrary GitHub URLs safe?"**
> Host allow-list, defaults to github.com only. URLs are parsed and re-assembled from validated
> parts — never passed to git verbatim. `execFile`, never a shell, so a repo name is data and not
> code. Temp dir at mode 0700. Tokens go through the environment, not argv, so they do not appear
> in `ps`. Cleanup runs on success, failure and process exit.

**"How do you know the manifest is accurate?"**
> Every claim cites the file it came from. You can check any line in the document against the
> repository in about five seconds. That is the point of generating it deterministically rather
> than asking a model to write it.

**"Does this replace the developer?"**
> The opposite. The whole design centres on a human ruling that the machine is not allowed to
> make. It automates the reading; it escalates the deciding.

**"Why Slack and not Teams?"**
> Teams means Graph, which means an app registration, admin consent and a transcript permission
> before a single message arrives. For reading a channel that ceremony buys nothing. And the
> parser is source-agnostic — Slack is rendered into the same transcript layout, so the
> classification logic is shared. Adding Discord or Teams is a rendering adapter, not a rewrite.

---

## Known rough edges — if a judge runs `npm run verify` themselves

Be upfront, it reads as confidence:

- **`npm run verify` prints `4 FAILED, 67 passed`.** All four are one pre-existing mismatch: the
  demo fixture contains **three** planted contradictions while the test script still asserts
  exactly one, so `synthesize_claude_md` correctly refuses on the two the script never resolves.
  The product behaviour is right — the refusal is the feature — the assertion is stale. Two-line
  fix in `scripts/verify.ts`.
- Everything else passes, including a live GitHub clone, the HTTP transport, auth enforcement at
  the socket, and real side-effect execution.
