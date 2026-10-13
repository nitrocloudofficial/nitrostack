# Foray — a school of agents

A student writes ninety seconds about what they think they learned. An
agent squad names the **specific misconception** behind it — an ID from a
fixed taxonomy, not a label it made up — and refuses to send any
correction it cannot cite in that student's own prescribed course
material. Deterministic code then clusters those named misconceptions
across the cohort and walks a prerequisite graph *backwards* to the
concept that actually caused them. A week later the same misconception ID
is counted again, to show the intervention worked — or that it did not.

> **How long a class-wide misconception goes unnamed: six weeks → 24 hours.**

Foray is not a tutor, not a chatbot, not a proctoring tool and not a grade
predictor. **There is no score field and no grade field in the schema.**
That is a structural decision, not a policy promise.

Built for the NitroStack hackathon (17.5 hours, 2–3 people).

---

## Run it

```bash
pip install -r requirements.txt
npm install && npm --prefix ui install

cp .env.example .env          # add one LLM key — see the table in RUN.md
bash demo/reset.sh            # seeds the cohort; makes zero API calls

uvicorn api.main:app --port 8000     # the Python spine
npm --prefix ui run dev              # → http://localhost:5173
npm run dev                          # the MCP server (NitroStudio connects here)
```

Sign in as `faculty@foray.edu` or `divya@foray.edu` — password `foray123`.
Full account table, provider setup and gotchas: **[RUN.md](RUN.md)**.

> `http://localhost:5173`, **not** `127.0.0.1:5173`. Vite binds IPv6-only
> here and the loopback address is refused.

---

## The three loops

**Loop 1 — the student narrates.** Typed or spoken, any language. Each
turn is tagged for topic by deterministic code, classified by the
**Diagnostician** (which picks from the taxonomy or returns `novel`, and
must quote the student's literal words), checked by the **Grounding
Verifier**, and answered by the **Elicitor**. No citation → no correction
is sent → it escalates to faculty.

**Loop 2 — the cohort, and the cause.** Clustering is `GROUP BY`. The
k-anonymity gate is `if count < 5`. Neither goes near a model. The **Root
Cause Analyst** then walks the prerequisite graph backwards: in the seeded
class, 23 of 60 students hold `M12` in week 6 on TCP connection
management, and the walk lands on `C03 Addressing and ports` — from an
*earlier unit*.

**Loop 3 — did it work?** The **Intervention Designer** targets the root
cause rather than the week's topic. A week later the same ID is counted
again: **23 → 4, cleared.** That number is a `SELECT`. It is counted,
never generated, and `cleared` is a strict decrease — invert the weeks and
it reports `cleared=False`.

---

## Why it holds up

| | |
|---|---|
| **Named, not scored** | The output is a misconception *identity*, which is why it can be counted, traced to a cause, and re-counted to verify. |
| **Grounded, or silent** | Retrieval is a filter over hand-tagged chunks of the class's own material. No vector DB, no embeddings, no RAG framework. |
| **The numbers are deterministic** | `/core/` contains no LLM calls, ever. Agents were used only where judgement was genuinely required. |
| **The boundary is code** | The Warden is a NitroStack `Guard`, so it runs *before* the handler — a model cannot reach a tool the framework never dispatched to. Denials are written to an append-only log. |
| **Every safety claim is a test** | `npm run verify`, `demo/reset.sh` and `demo/runthrough.py` all exit non-zero when something drifts. |

---

## What's in the box

| | |
|---|---|
| Subjects | 6 — Computer Networks (Sem V) + 5 Semester VI courses |
| Enrolment | 8 students × 6 subjects = 48; switch subject and the graph, taxonomy, chat, roadmap and transcript all follow |
| Graphs | 47 concepts, 37 taxonomy rows |
| Cohort data | 620 reflections, 34 clusters, 290 counted topic questions |
| Grounding corpus | 204 hand-tagged chunks citing printed page numbers |
| Agents | 6 — Elicitor · Diagnostician · Grounding Verifier · Root Cause Analyst · Intervention Designer · Compass |
| MCP layer | 13 tools, 4 permission-scoped modules, behind the Warden |

---

## Architecture

The stack splits at the MCP boundary and nowhere else.

```
      NitroCloud                                    your host
 ┌──────────────────────┐   FORAY_API_URL   ┌─────────────────────────┐
 │  src/  (TypeScript)  │ ────────────────► │  api/  core/  agents/   │
 │  4 MCP modules       │       HTTPS       │  FastAPI + SQLite       │
 │  Warden guard        │                   │  + the LLM calls        │
 └──────────────────────┘                   └─────────────────────────┘
```

The TypeScript side holds **zero business logic** — every tool is a
`fetch` onto the Python API. There is exactly one coupling between the two
halves, the `FORAY_API_URL` environment variable.

```
src/            NitroStack project (TS) — index.ts, app.module.ts,
                foray/permissions.ts, foray/warden.guard.ts, modules/
api/            main.py · db.py · schema.py (THE CONTRACT) · auth.py
core/           mastery · clustering · efficacy · topics — DETERMINISTIC
agents/         llm.py (provider shim) + the six agents
data/           taxonomy · concepts · materials · seed_cache
tools/          chunkers · preflight
ui/             Vite + React, one hand-written stylesheet
demo/           reset.sh · runthrough.py · seeders · script.md
```

`src/foray/permissions.ts` **mirrors** `api/schema.py`. Change one, change
the other in the same commit; unmapped tools are denied by default.

---

## Commands

| | |
|---|---|
| `bash demo/reset.sh` | known-good demo state, one command, no API calls |
| `python demo/runthrough.py` | all six demo beats, in order, with timings |
| `npm run verify` | permission boundary + MCP round trip |
| `npm run preflight` | is this deployable, and what's missing |
| `python -m agents.llm` | which provider and model your key actually reaches |

Run them in the order **verify → reset → runthrough**. `verify` writes
denial rows to the access log, so running it last leaves the log dirty.

---

## Documentation

| File | What it's for |
|---|---|
| **[RUN.md](RUN.md)** | Setup, accounts, providers, gotchas |
| **[DEPLOY.md](DEPLOY.md)** | Shipping to NitroCloud — the two-service topology |
| **[demo/script.md](demo/script.md)** | The live demo script — order, timings, break-glass |
| **[CLAUDE.md](CLAUDE.md)** | Working memory: current state, hard rules, gotchas already paid for |

The planning and specification documents (the full plan, sprint log, pitch
and MCP contract notes) are kept out of this repo on purpose — they are
working material, not product.

---

## Known limits

Worth knowing before you go looking for them.

- **Only Computer Networks has a grounding corpus.** The five Semester VI
  subjects have concepts, taxonomies, rosters, cohort data and topics, but
  their source material is not in this checkout (`notes/` is gitignored),
  so corrections there escalate instead of citing. `reset.sh` prints
  coverage per course and names the fix.
- **`data/materials/chunks.json` is gitignored** — it is extracted
  textbook content. A deploy built from a clean clone has no material at
  all. See DEPLOY.md before shipping.
- **The cohort is seeded, not observed.** 620 reflections generated by
  `demo/seed_generator.py` with a planted week-6 cluster. It is realistic
  and internally consistent, and it is not real classroom data.
- **SQLite on an ephemeral disk is not persistence.** Fine for a demo; the
  seeded cohort is baked into the image and returns on every boot.

---

## License

MIT — see [LICENSE](LICENSE).
