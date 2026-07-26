# Contributing — FinBridge AI

Four people, 24 hours. Scope does not grow: **4 tools, 2 resources, 2 prompts.**

The organising boundary is **data vs. logic**. Jayaram authors the rulebook and
proves it; Deepak codes the evaluator that reads it. The contract between them is
the `Scheme` schema in `src/shared/contracts.ts`, frozen at +0:30 — so neither
can break the other silently.

---

## Ownership

Own your files. Do not open anyone else's.

| Owner | Branch | Files |
|---|---|---|
| **Jeevan** | `jeevan/server` | `src/index.ts`, `src/app.module.ts`, `src/modules/knowledge/`, config, deploy, README assembly, video, PR, community post |
| **Deepak** | `deepak/engine` | `src/modules/eligibility/`, his own test fixtures |
| **Praneeth** | `praneeth/live` | `src/clients/mfapi.ts`, `src/modules/growth/`, `src/modules/financial-health/` |
| **Jayaram** | `jayaram/data` | `data/schemes.json`, `data/glossary.json`, `src/modules/explain/`, the hallucination table |

`src/shared/contracts.ts` is nobody's. It is frozen.

---

## Git rules

1. `app.module.ts` and `index.ts` are Jeevan's. Need a registration change? **Ask him out loud.** It is not an edit you make.
2. `contracts.ts` is frozen. Changes need **all four agreeing out loud**.
3. `data/*.json` is Jayaram's. Deepak reads it, **never writes it.** A wrong scheme rule is a conversation, not a commit.
4. Never checkout someone else's file to quickly fix something.
5. Merge to `main` **hourly**, not at the end. Pull `main` before you push.
6. **A conflict means someone broke ownership. Fix that, not the merge.**
7. Push your branch before sleeping, even if unfinished.

Line endings are normalised to LF by `.gitattributes`. If you see a diff where
every line of an untouched file changed, do not commit it — say so.

---

## Timeline and gates

| Time | Gate | Owner |
|---|---|---|
| **+0:30** | Contracts frozen, stubs committed, branches cut | all |
| **+2:30** | **`schemes.json` complete — HARD DEADLINE** | Jayaram |
| **+3:00** | **Deployed to NitroStack Cloud on stub data** | Jeevan |
| +3:15 | Skeleton + screenshot posted to Discord/Reddit | Jeevan |
| +4:00 | `mfapi.ts` fetching real NAV, proven end to end | Praneeth |
| +4:00 → | Hourly tool sweeps through a real MCP client | Jeevan |
| +4:00 → | Hallucination table runs | Jayaram |
| 06:00 | All four README sections in, video recorded, secrets audit | all → Jeevan |

**If the +3:00 deploy gate is not green, everyone stops and helps.**

---

## Per-person detail

### Jeevan — server, deploy, submission

- Read **docs.nitrostack.ai** for deploy commands. **Do not accept AI-generated
  deploy snippets** — they are pattern-matched from other MCP SDKs and will look
  right and be wrong.
- **Hour one:** verify the exact demo video length limit, the Sample Apps PR
  format, and the Discord post tag requirements. Do not leave these to 06:00.
- Sweep every tool through a real MCP client hourly from +4:00. **Two errors in
  one sweep and that tool is cut from the video.**
- Own every redeploy after a merge.
- 06:00 onward: assemble README from the four sections, record the video, run the
  secrets audit — no `.env`, no `node_modules`, no keys.

### Deepak — eligibility engine

- `check_scheme_eligibility` evaluates **all seven** schemes on every call and
  returns both eligible *and* ineligible, each ineligible one naming its specific
  `failedCondition`.
- Reads `data/schemes.json`. **Never edits it.** Wrong data is Jayaram's bug to
  fix — say so out loud rather than patching the file.
- README section on how eligibility is computed → Jeevan by 06:00.

**Done when:** an 18-year-old, someone sitting *exactly* at an income ceiling, and
a 10-year-old girl child all get correct verdicts with the reason named.
**Test the boundaries, not the middle.**

### Praneeth — live data and financial math

- **First task, before anything else:** `mfapi.ts` fetching real NAV, proven end
  to end by +4:00. It is the only thing that can break for reasons outside this
  repo.
- Cached fallback, so a dead API at 3am doesn't kill the demo.
- `project_investment_growth` — **always a range with stated assumptions, never
  one confident number.**
- `calculate_financial_health` — score + three sub-scores + suggestions.
- README section on projection assumptions → Jeevan by 06:00.

### Jayaram — rulebook and evidence

**Phase 1 — by +2:30, HARD DEADLINE.** `schemes.json` with all 7 schemes (PMJDY,
APY, PMJJBY, PMSBY, SSY, SCSS, NPS) fully codified: age min/max, income ceiling,
gender restriction, existing-account requirement, tax-payer status, benefits,
documents, apply link. **Sourced from government circulars, not from a model's
memory** — every ceiling and age band traceable to a real document. Deepak is
blocked on this; it is the earliest thing on the critical path after the deploy
gate.

**Phase 2 — after `schemes.json` ships.** `glossary.json` (10–15 terms) and
`explain_financial_concept`, which reads it. Small tool, mostly content.

**Phase 3 — from +4:00, once Jeevan's deploy is live.** The hallucination table.
This is the Innovation argument and the README centrepiece.

- 10 eligibility questions, all with edge-case values — someone turning 10, income
  exactly at a ceiling, a boundary age for SCSS
- **Steelman the bare model:** give it the *full scheme documents in context*,
  then ask. No strawman.
- Run each question **3 times** on both the bare model and FinBridge
- Count two things: **wrong verdicts**, and **run-to-run inconsistency on
  identical inputs**
- The inconsistency number is usually the more damning one, and nobody expects it

Table + a short written framing → Jeevan by 06:00.

Phases 1 and 2 need no deployed server, so Jayaram is productive from minute 30.
Phase 3 needs no repo access at all — it runs through the MCP client against
Jeevan's deployment, so it cannot cause a merge conflict and can run at 3am.

---

## Sleep

| | 21:00–01:00 | 01:00–05:00 |
|---|---|---|
| Jeevan | awake | **sleep** |
| Deepak | awake | **sleep** |
| Praneeth | **sleep** | awake |
| Jayaram | **sleep** | awake |

Two people up at all times. The 01:00–05:00 shift is Praneeth on math and Jayaram
on the hallucination table — both mechanical, neither needs a merge, so nothing
lands in `main` while the other two are out.

**Jayaram must ship `schemes.json` before he sleeps at 21:00.** If it isn't done,
he doesn't sleep on schedule — Deepak's entire branch is downstream of it.
