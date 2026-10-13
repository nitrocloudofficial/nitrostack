# CLAUDE.md — Foray

Working memory for Claude Code sessions on this repo. **Keep this file updated
as the hackathon progresses** — the "Current state" section is the live part.

---

## What this is

Foray — a school of agents. A student writes a 90-second reflection; an agent
squad names the **specific misconception** they hold (from a fixed taxonomy),
and refuses to send any correction it cannot cite in the student's own
prescribed course material. Cohort-level, deterministic code clusters those
named misconceptions and traces each cluster back through a prerequisite graph
to the concept that actually caused it. A week later the same misconception ID
is re-counted to verify the intervention worked.

**Headline metric:** time to detect a class-wide misconception, 6 weeks → 24 hours.

**It is not** a chatbot, a tutor, a proctoring tool, or a grade predictor.

---

## The three documents

| File | Role | Change it? |
|---|---|---|
| `foray_plan.md` | **Single source of truth for WHAT.** Schema, agent contracts, requirements, pitch, objections. | Only by all-hands agreement |
| `SPRINT_PLAN.md` | **WHEN and WHO.** Real-clock sprints, checkpoints, pre-made cut decisions. | Update actuals as you go |
| `CLAUDE.md` (this) | Working memory for Claude sessions | Update every sprint |
| `RUN.md` | **How to run it.** Verified commands, ports, gotchas. | When setup changes |
| `PITCH.md` | **The sell.** What it is, why it's defensible, + the demo VIDEO script (the stage script stays in `demo/script.md`). | When the story changes |
| `DEPLOY.md` | **Shipping to NitroCloud.** Two-service topology, the one coupling. | When deploy changes |

If they disagree: `foray_plan.md` wins on *what*, `SPRINT_PLAN.md` wins on *when*.

---

## Current state

**Phase:** S8 complete (user-directed, post-freeze). Every student is now
enrolled in ALL SIX subjects with a per-subject graph, taxonomy, chat,
roadmap and transcript — switch subject and the whole surface follows.
Previous: S7. **ALL SIX BEATS STILL
PASS** (runthrough 6.1s, live Gemini), warden **10/10**, MCP round trip
**8/8** — after adding: real logins, an enrolled class fed by the uploaded
`sem V.zip`, a chat/voice capture surface with per-message analysis, an
append-only interaction log (R-11), and deterministic questioned-topic
counts (R-12).

**S7 additions, verified end to end in the browser:**

- **Logins.** 1 teacher (`faculty@foray.edu`) + 8 students, password
  `foray123` — accounts table in RUN.md. The 3 CN students map BY QUERY to
  real seeded cohort members whose data tells that scenario's story
  (`demo/seed_profiles.py` exits non-zero if a slot can't be filled).
- **Six classes, one teacher (S7b).** CS3591 Computer Networks (sem V,
  flagship demo cohort) + five Semester VI subjects from
  `Desktop/Edu/sem VI`: CS3501 Compiler Design, CS3551 Distributed
  Systems, 19CSE311 Cyber Security, CS3691 IoT, CS3452 Software
  Engineering. Each student is enrolled in their own subject; chat,
  taxonomy, tagging, constellation and topics all scope to it via a
  `course` column on concepts/misconceptions/material_chunks/classes.
  Course packs (concepts + keywords + misconceptions) are hand-authored
  in `data/sem6_courses.json`; `tools/chunk_sem6.py` chunks sources from
  `notes/sem VI/`.
  > ⚠️ **In this checkout only CN has material (204 chunks).** `notes/` is
  > gitignored, so the sem VI sources are absent and `sem6_chunks.json` is
  > never generated. The five Semester VI classes have concepts,
  > misconceptions, roster and topics but **no grounding corpus** — every
  > correction there escalates and beat 1 has no citation for them.
  > **The CN demo path (all six beats) is unaffected.** `reset.sh` now
  > prints coverage per course and names the fix.
- **Chat capture** replaces the bare 90-second box. Voice via Web Speech
  API (Chrome/Edge). Pipeline per student turn: `core/topics.py`
  (deterministic question/topic tagger) → Diagnostician (FULL taxonomy —
  narrowing by tagged concept missed M12-on-C03-phrasing; found live in
  the browser) → Grounding gate → `agents/elicitor.py` reply. Chat
  reflections stay at week 99 so 23→4 never drifts.
- **Regulation log.** `chat_sessions`/`chat_messages`, append-only, with
  per-message analysis JSON. Student reads their own; faculty is DENIED
  (P-06/R-11) and the denial writes an AccessLog row — beat 6 now covers
  chat. MCP: `get_chat_log` (elicitor/diagnostician/student only).
- **Most questioned topics.** `topic_questions` rows counted per concept,
  k-gated like R-04 (C12 seeded below k to prove the gate hides it).
  Faculty panel + `get_topic_questions` MCP tool. Pitch line: *C03 was
  being questioned from week 2 — the questions saw the root cause before
  the heatmap did.*
- **MCP layer**: 4th module `records` (get_roster · get_chat_log); scopes
  `student_profile` + `chat_log` added to BOTH sides of the permissions
  mirror in the same commit.

**S8 — many subjects per student:**

- `enrollments(user_id, class_id)` is the real enrolment; `users.class_id`
  stays as the DEFAULT class a session opens on. Seed enrols all 8 students
  in all 6 classes (48 rows).
- `_selected_class(user, class_id)` resolves every scoped request and
  **refuses a class the caller is not enrolled in (403 + AccessLog P-08)** —
  otherwise "switch subject" is a way to read another cohort by editing a URL.
- Scoped to the selected subject: `/ui/me`, `/ui/mastery` (the
  constellation), `/ui/compass` (roadmap, incl. the cache key), `/ui/chat`
  (new session per subject), `/ui/taxonomy`, `_roster_rows`.
- UI: subject `<select>` in the nav; Compass and chat clear on change so a
  student never sees Networks gaps under a Compiler Design header.
- Graphs per subject: CN 13 nodes, CD/DS/FCS/IO 7, SE 6. Taxonomy per
  subject: CN 18, others 3–4 (was 37 for everyone — a display bug).
  The Diagnostician still classifies against the FULL taxonomy on purpose.

**Clock:** T0 18:30 Sat 25 Jul 2026 · code freeze 06:30 Sun · pitch 12:00 Sun
**Team:** 2–3 (P1 data+Loop 1 · P2 backend+Warden+Loop 2 · P3 UI+pitch)

### The pre-demo sequence — this exact order

```bash
npm run verify              # FIRST: warden 5/5 + MCP round trip 5/5
bash demo/reset.sh          # THEN: 23 → 4, root cause C03, log empty
python demo/runthrough.py   # all six beats, in demo order, ~6.5s
```

> ⚠️ **Order matters.** `npm run verify` writes DENIED rows to the access
> log. Running it *after* `reset.sh` leaves beat 6 starting with rows already
> on screen. The run-through caught this.

Then three processes, from the repo root:

```bash
uvicorn api.main:app --port 8000    # Python spine
npm --prefix ui run dev             # UI → http://localhost:5173 (NOT 127.0.0.1)
npm run dev                         # MCP server — NitroStudio connects here
```

### Beat status — all measured, not assumed

| Beat | Proof | Live? |
|---|---|---|
| 1 live capture | names M12, `quote_verbatim=True`, conf 0.95 | ~2.2s model |
| 2 forced failure | out-of-unit → escalates **before any model call** | instant |
| 3 faculty view | wk6/C11 → 23/60 → **C03** unit U0, crosses_unit | instant |
| 4 verification | **23 → 4, cleared** — counted, never generated | instant |
| 5 compass | 3 items, every one cites a reflection id | instant (cached) |
| 6 mic drop | faculty DENIED + AccessLog row, warden 5/5 | instant |

**Only beats 1 and 2 make live model calls.** 3/4/5/6 need no network at all —
say that out loud if the wifi dies; it reads as confidence.

**LLM:** `gemini-3.5-flash-lite` via `FORAY_LLM_PROVIDER=gemini` in `.env`
(free tier). Swap providers with one env var — see `agents/llm.py`.
`/health` reports the active provider. `source="offline"` on any agent output
means the offline matcher ran — **never claim the model produced it.**

**Course & unit (frozen at S0):** Computer Networks · **Transport Layer**,
Kurose & Ross 8e Ch. 3, printed pp. 213–334. Prereqs = Ch. 1–2, pp. 59–212.
**Printed page = PDF index − 1**, verified across all 797 pages. Chunkers must
emit the *printed* page — beat 1 cites the page a student would turn to.

**Planted demo:** `M12` — *"believes a TCP connection is identified by the
destination port alone"* — spikes week 6 on `C11`, 23 of 60. Backward walk
`C11 → C10 → C06 → C05 → C03` lands on **C03 Addressing and ports**, in the
*earlier* unit. `reset.sh` exits non-zero if either the 23→4 or the C03 trace
drifts, so a broken beat 3 or 4 fails at reset time and not on stage.

> **Update this block at every checkpoint.** It is the first thing a new
> Claude session reads.

---

## Hard rules — violating any of these is a bug

1. **`api/schema.py` is frozen** after it is written in S0. Records from three
   people must join. Changing it requires everyone to stop.
2. **`/core/` contains no LLM calls.** Clustering, k-anonymity, mastery EMA and
   efficacy counting are deterministic. If you find an API call in `/core/`,
   it is a bug. The crown-jewel efficacy number must never be generated.
3. **No vector DB, no embeddings, no RAG framework.** Retrieval is
   `[c for c in CHUNKS if concept_id in c["concept_ids"]]` over hand-tagged
   chunks. See `foray_plan.md` §9. If someone proposes ChromaDB, the answer is no.
4. **No agent orchestration framework.** Direct API calls, constrained JSON,
   low temperature, retry once on malformed JSON then fall back to a safe
   default (escalate / empty list). Never let a bad parse crash a demo path.
5. **The Diagnostician classifies, it never generates.** It picks misconception
   IDs from the taxonomy passed to it, or returns `novel`. It must quote the
   student's literal words in `evidence_span`.
6. **The Grounding Verifier is a gate, not a guideline.** `grounded=False` →
   no correction is ever sent → escalate to faculty. `material_ids` must be
   non-empty whenever `grounded=True`.
7. **There is no score field and no grade field on `Reflection`.** Deliberate (R-06).
8. **Every seeded LLM call is written to `data/seed_cache/` and never
   regenerated.** Only demo beats 1 and 2 make live calls.
9. **`reset.sh` must restore a known-good demo state in one command.** It is
   written in S2, not at hour 22.
10. **After 06:30 Sun: no features, no refactors.** Bugfixes on demo paths only.

---

## Stack — split at the MCP boundary, and nowhere else

This is a **NitroStack hackathon**, and NitroStack is TypeScript. So the MCP
layer is TS; everything else stays Python. A `nitrostack-python-sdk` exists but
has 14 commits and no documented NitroCloud path — not what you bet a demo on.

**Python** — FastAPI · SQLite (single file, no ORM) · LLM behind
`agents/llm.py` (Gemini / Groq / OpenRouter / Anthropic / local, one env var) ·
React + Vite + **one hand-written stylesheet, no Tailwind** · hand-positioned
SVG · CSS grid heatmap (no chart library).

**TypeScript (repo root — `src/`)** — NitroStack: 4 MCP servers, 13 `@Tool`
defs, and the Warden as a `Guard`. **Holds zero business logic** — the tools
are `fetch` calls onto the Python API. No SQLite driver (no native module to
fail on install), no added dependencies.

> The Warden being a NitroStack `Guard` means it runs *before* the handler, so
> a model cannot reach a handler the framework never dispatched to. §3.1's
> claim — *"enforced at the MCP layer, not in a policy document"* — is now
> literally true.

## Repo layout

The repo root is simultaneously the NitroStack project and the Python project.
That is deliberate: Studio validates a folder by `package.json` +
`src/index.ts` + `@nitrostack/core`, and NitroCloud's GitHub auto-deploy links
a *repository*, so both need the project at the root.

```
package.json  tsconfig.json  src/       ← THE NITROSTACK PROJECT (TypeScript)
  src/index.ts              bootstrap
  src/app.module.ts         3 modules behind the Warden
  src/foray/permissions.ts  MIRROR of api/schema.py PERMISSIONS
  src/foray/warden.guard.ts the Guard. Beat 6.
  src/foray/api.client.ts   fetch onto Python
  src/modules/{content,student,cohort}/
  src/widgets/              React widgets (Next.js)
verify-warden.mjs           the permission boundary (beat 6)
verify-mcp.mjs              that an ALLOWED call round-trips and returns data
                            → `npm run verify` runs both
NITROSTACK.md               MCP layer docs + the /internal contract
DEPLOY.md  Dockerfile.api   shipping to NitroCloud

/api        main.py  db.py  schema.py  auth.py   # schema.py IS THE CONTRACT
/core       mastery.py  clustering.py  efficacy.py  topics.py  # DETERMINISTIC, no LLM
/agents     llm.py            ← provider shim, all agents go through it
            diagnostician.py  grounding.py  rootcause.py
            intervention.py   compass.py    elicitor.py (chat agent, S7)
/data       taxonomy.json  concepts.json  materials/  seed_cache/
/tools      chunk_material.py  chunk_class_content.py  preflight.py
/ui         Vite + React app (its own package.json)
/demo       script.md  runthrough.py  reset.sh
            seed_generator.py  seed_profiles.py  seed_crosscourse.py
/notes      course PDFs + "sem V" class archive (gitignored)
```

**Commands worth knowing:**

| | |
|---|---|
| `npm run verify` | warden + MCP round trip. After ANY change to `permissions.ts` or `/internal/*`. |
| `python demo/runthrough.py` | all six beats in demo order, with timings |
| `bash demo/reset.sh` | known-good demo state, one command, no API calls |
| `npm run preflight` | is this deployable to NitroCloud, and what's missing |
| `python -m agents.llm` | which provider/model is live |

**`src/foray/permissions.ts` mirrors `api/schema.py`.** Change one,
change the other in the same commit. Every new tool must be added to
`TOOL_SCOPES` — unmapped tools are denied by default. That is deliberate.

---

## The six agents (and the things that are deliberately not agents)

**Agents** — Elicitor, Diagnostician, Grounding Verifier (Loop 1) · Root Cause
Analyst, Intervention Designer (Loop 2) · Compass (Loop 3). Contracts in
`foray_plan.md` §12 — typed output, single responsibility, constrained JSON.

**Not agents, on purpose** — clustering (`GROUP BY misconception_id`),
k-anonymity gate (`if count < 5`), mastery EMA, efficacy counting, Warden
permission check. All deterministic code. This is a pitch point, not an
implementation shortcut: *"we only used an agent where judgement was required."*

**Why multiple agents at all:** the agents are separate because their
**permissions** are separate. See the matrix in `foray_plan.md` §6.3. The Warden
enforces it and writes an `AccessLog` row on denial. That log row is demo beat 6.

---

## Language rules for anything user-facing

**Never say:** monitor, track, detect, surveillance, revolutionary, disrupt,
seamless, empower, one-stop. Do not sell "AI-powered" as a differentiator.

**Say:** named, grounded, verified, evidence, cohort, prerequisite, cleared.

The student is not watched — **the student narrates**. The faculty member is the
hero of the pitch; the enemy is *finding out too late*, never the teacher and
never the student.

**Never overclaim.** If we don't ship real MCP transport, we don't say "MCP" —
we say "permission-scoped servers behind a gateway." No regulatory dates or rule
numbers on a slide without the primary source open. See `foray_plan.md` §18.

---

## Demo beats (memorise the order)

1. Live capture → misconception **named**, correction cited to a real page
2. Forced failure → out-of-unit question, refuses to correct, escalates
3. Faculty view → week 6 red, 23 of 60, root cause traces to `C03`
4. Intervention → verify → **23 → 4, cleared** ← the line they remember
5. Compass → three gaps, each citing the reflection that proved it
6. **Mic drop** → faculty tries to read a raw reflection, gets BLOCKED + logged

## The floor

Loop 1 real · Loop 2 real · Warden blocking for real · beats 1, 3, 4, 6 · real
student reflections on a slide. Everything else is upside.

---

## Gotchas that already cost time — do not rediscover these

**Environment**

- **Vite binds IPv6-only here.** `http://localhost:5173` works,
  `http://127.0.0.1:5173` is connection-refused. Also: Vite silently moves to
  **5174** if 5173 is held by a stray. Read its terminal output.
- **`reset.sh` fails while the API is running** — Windows holds the SQLite
  lock. Stop uvicorn first; the script now says so.
- **Windows consoles are cp1252.** Box-drawing characters, `→`, `█` etc. in
  `print()` crash with `UnicodeEncodeError`. Keep CLI output ASCII.
- **`create-vite@latest` needs newer Node than 20.10.** The UI was hand-rolled
  (six files) rather than fighting it.

**LLM providers**

- **Check the per-model DAILY quota, not just req/min.** `gemini-3.5-flash` is
  **20 requests/day** on free tier — a few test runs exhaust it, and it only
  surfaces as a 429 afterwards. `gemini-2.5-flash` is retired (404).
  `python -m agents.llm` lists what your key actually reaches.
- **Gemini 3.x charges thinking tokens against `max_output_tokens`.** ~365 for
  a one-line classification, so a 300-token budget returns `MAX_TOKENS` and an
  empty body. The shim floors at 1500 and sets `thinking_level=low`.
- **Groq/OpenRouter/Together speak OpenAI's wire format** — that's a protocol
  detail, not an OpenAI dependency. Set `FORAY_LLM_PROVIDER=groq` +
  `GROQ_API_KEY`; base URLs are built in.

**Things only the live path exposed**

These all looked fine on the deterministic offline paths:

- Grounding passed `chunks[:6]` — the lowest MAT_ ids, i.e. Chapter 2 pages —
  so the model correctly refused **every** correction and beat 1 would never
  have shown a citation. Both paths now share `rank_chunks()`.
- The rate-limit retry called `time.sleep` without importing `time`, so every
  429 became a NameError and silently degraded to offline mid-demo.
- Course Content was gated behind `cohort_aggregate`, so the Grounding Verifier
  was **denied `get_material_chunks`** over MCP — R-02 unsatisfiable. The
  Python agents call the API directly, so nothing looked wrong until
  `verify-mcp.mjs` existed.

**Things only the run-through exposed**

- **Beat 1 broke beat 4.** Live capture defaulted to week 6, so a volunteer's
  reflection joined the week-6 count and beat 4 read **24 → 4** while the slide
  said 23. Live captures now use week 99 / `S_LIVE`.
- **Beat 5 took 39 seconds** live (3 sequential calls + backoff). Precomputed
  by `reset.sh` into `data/seed_cache/compass.json`. Now 0.0s.

**The pattern worth keeping:** every one of these was found by *checking the
output* rather than trusting a green build. Counts, citations and quotes were
verified against the source, not assumed.

---

## Session log

Append one line per session. Newest at the bottom.

- **2026-07-25 18:30** — Planning session. Rebased `foray_plan.md` §11 onto the
  real 17.5 h / 2–3 person clock as `SPRINT_PLAN.md`. Cut Recharts, live
  Elicitor, auth, week scrubber. Compass + Institution demoted to stretch with
  hard drop-times. No code written yet.
- **2026-07-25 19:00** — **S0 executed.** Unit chosen: CN Transport Layer
  (Kurose Ch. 3) — picked because the textbook gives real citable page numbers
  and because transport misconceptions trace backwards to Ch. 1 addressing,
  which is exactly the beat-3 story. Verified text extraction and the
  printed-page offset. `schema.py` frozen; concept graph authored and
  prereq-validated; 7 taxonomy rows seeded; outreach messages drafted.
  **Open:** P1 must finish taxonomy to 18 rows and chunk Ch. 3 in S1.
- **2026-07-25 19:45** — **Stack decision + MCP layer built.** Researched
  NitroStack: TS is the flagship, the Python SDK is 14 commits with no
  NitroCloud path. Split the stack at the MCP boundary — `src/` (TS,
  NitroStack) holds the 3 servers + Warden and zero logic; Python keeps
  everything else. Verified end to end: build green, 10 tools registered,
  `verify:warden` 5/5. **Beat 6 enforcement is done at hour 1 instead of
  hour 11.** Remaining: 11 `/internal/*` endpoints in Python, and the denial
  rendered in the UI.
- **2026-07-25 21:15** — **S1.** Python spine (`api/db.py`, `api/main.py`),
  deterministic `/core/` (mastery EMA, clustering + k-gate, efficacy),
  `tools/chunk_material.py` → 204 chunks, and the Vite/React UI shell.
  **The Py↔TS seam is proven:** TS Warden denials persist as SQLite rows.
  Two chunker bugs found by checking retrieval quality rather than trusting
  it: running headers leaked into chunk text, and substring tagging matched
  `"ack "` inside `"back "` (C08 inflated 67→112, C11 pulling app-layer
  pages). Both fixed with word boundaries.
  **Open for S2:** seed generator with the planted week-6 M12 cluster,
  taxonomy 7→18 rows, and the Diagnostician.
- **2026-07-25 23:30** — **S2. CP2 passed, beat 1 works.** Taxonomy to 18 rows;
  seed generator (410 reflections, 157 diagnoses, 20 clusters, 4 k-suppressed)
  that makes zero API calls and exits non-zero if the plant drifts — it caught
  two real bugs (participation roll eating planted students; non-planted
  students drawing M12 at random in weeks 6–7). Diagnostician enforces
  taxonomy-membership and verbatim-quote in code, retries once, then falls
  back to an offline matcher.
  **Open for S3:** Grounding Verifier + escalation (beat 2), Root Cause
  Analyst walking prereqs backwards (beat 3), faculty cell drill-down in UI.
- **2026-07-26 02:00** — **S3. CP3 passed, beats 2 + 3 work.** Grounding
  Verifier enforces R-02 in code (non-empty citation, no invented ids, zero
  chunks → escalate before any model call). Root Cause Analyst walks the graph
  deterministically and rejects naming the origin concept. **Found and closed a
  gap:** mastery was never seeded, so root cause's "prefer low cohort mastery"
  rule could not fire — now 374 states from the same deterministic EMA, and
  C03 wins on merit (0.593, lowest on the walk, margin 0.024). Seed generator
  now asserts the C03 trace like it asserts 23→4.
  **Open for S4:** Intervention Designer, `efficacy.measure()` wired to a
  deliver button, week 6/7 toggle showing 23 → 4.
- **2026-07-26 04:00** — **S4. CP4 passed — beat 4 works: 23 → 4, cleared.**
  Intervention Designer targets the root-cause concept (not the week's topic)
  and cites printed p.222. The number is counted by `core/efficacy.py` with no
  model near it, so beat 4 is identical with no key and no wifi. Proved the
  loop can report failure: inverted weeks give `cleared=False`.
  Also this session: switched off Anthropic to a **provider shim**
  (`agents/llm.py`) — Gemini/Groq/OpenRouter/Anthropic/local behind one env
  var — and fixed three bugs only the live path exposed (thinking tokens
  charged against max_output_tokens; grounding passing unranked chunks so it
  refused every correction; rate-limit retry missing its `time` import).
  **Open:** Compass (beat 5, stretch), full run-through ×3, fallback video.
- **2026-07-26 05:30** — **S6. Compass done — ALL SIX BEATS WORK.** Selection
  is deterministic (weakest concepts that HAVE a reflection behind them); the
  model writes the why/action prose. Same split as rootcause, same reason.
  R-09 gate proved, not asserted: a student with no reflections yields 0
  items rather than an invented roadmap.
  Earlier this session, asked to confirm the MCP layer worked, wrote
  `verify-mcp.mjs` and it immediately found a real bug — Course Content was
  gated behind `cohort_aggregate`, so the Grounding Verifier was DENIED
  `get_material_chunks`, i.e. R-02 was unsatisfiable over MCP. Fixed on both
  sides; `npm run verify` now runs warden + round trip.
  Also added deploy prep: `tools/preflight.py`, `Dockerfile.api`, `DEPLOY.md`.
  **Open:** run-through ×3, fallback video by 08:00, deck.
- **2026-07-26 06:00** — **Run-through harness + demo script.**
  `demo/runthrough.py` walks all six beats through the real endpoints in demo
  order with timings — the §14 "wire the demo" check. It found three bugs on
  first run: beat 1's live capture defaulted to week 6 and made beat 4 read
  **24 → 4** (slide says 23); Compass took **39s** live; and `npm run verify`
  after `reset.sh` left beat 6's log dirty. All fixed — the correct order is
  **verify → reset → runthrough**. Now: ALL SIX BEATS PASS, 6.5s total.
  `demo/script.md` has every line, who says it, measured timings, and the
  break-glass table.
  **Open: fallback video (the highest-value 20 min left), rehearse ×6, deck.**
  Per §17, being ahead means *"polish beat 4 and beat 6. Nothing new."*
- **2026-07-26 (S7, user-directed, post-freeze)** — Logins, class, chat.
  The uploaded `sem V.zip` became the class: its CN folder extracted to
  `notes/sem V/`, `tools/chunk_class_content.py` chunked slides/problem
  sets/labs (179 chunks, slide-number citations), loaded next to the
  textbook corpus. Auth (`users`/`auth_tokens`, sha256+email-salt via
  `api/auth.py`), one class + 1 teacher + 8 students each query-mapped to
  a seeded cohort member with a scenario on the faculty roster. The 90-s
  box became a chat (Web Speech API voice both ways); every turn runs
  tagger → Diagnostician → Grounding gate → Elicitor and lands append-only
  in `chat_messages` (R-11). New deterministic count: `topic_questions`
  per concept, k-gated, on the faculty dashboard (R-12). Permissions grew
  `student_profile` + `chat_log` on BOTH mirror sides; 4th MCP module
  `records`; warden tests 5→10, round trips 5→8, all green. Runthrough
  still passes in 6.1s. Two live-path catches this session: chat
  diagnosis must use the FULL taxonomy (topic-narrowing missed M12 when
  the phrasing tagged C03), and the browser's typed-vs-React-state
  mismatch (use real input events). reset.sh now also seeds profiles.
- **2026-07-26 (S7b, user-directed)** — Different subjects per student.
  Five Semester VI courses added from `Desktop/Edu/sem VI` with
  hand-authored packs (`data/sem6_courses.json`: 34 concepts, 19
  misconceptions) and `tools/chunk_sem6.py` (~700 chunks; ANTLR ref +
  Engineering a Compiler page-capped; IoT PDFs are scanned images so its
  corpus is labeled hand-authored notes). `course` column threads through
  concepts/misconceptions/chunks/classes; chat, tagging and diagnosis
  scope to the logged-in student's course; roster and questioned-topics
  panels span all six classes of the one teacher, each class k-gated on
  its own. Two catches this pass: slide DEFINITIONS are short — the
  120-char slide floor dropped "many goroutines execute within a single
  main thread", so sem VI slides floor at 60 and grounding for DS_M1 went
  from escalate to a real citation (Goroutines slides, p.3); and evidence
  spans in seeded diagnoses are now asserted verbatim at seed time.
  Verified: warden 10/10, MCP 8/8, runthrough six beats pass, live DS
  chat named DS_M1 at 0.99 with citation, per-class topics all hold.
