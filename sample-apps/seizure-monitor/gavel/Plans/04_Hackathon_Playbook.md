# 4. Hackathon Playbook

**Project:** Frontend Intelligence MCP — NitroStack × SRMIST Hackathon, Jul 31 – Aug 1, 2026
**Purpose:** The team's operational handbook from start to finish — what to do, in what order, and what to do when something goes wrong.

---

## 4.1 First 30 Minutes

This is not building time — it's alignment time. Rushing this costs more hours later than it saves now.

| Min | Action |
|---|---|
| 0–5 | Everyone reads the final architecture doc together (not separately) — confirm shared understanding before anything else |
| 5–10 | Confirm roles A/B/C/D are assigned (use the questionnaire in the Team Execution Plan if not already settled) |
| 10–15 | Attend the mandatory keynote/MCP intro — note anything that changes assumptions (API limits, judging criteria specifics, sponsor tool updates) |
| 15–20 | Lock final scope as a team out loud: confirm 6 libraries, React/Next.js only, no freeform code generation — say it, don't assume it |
| 20–25 | Role B starts the scaffold (§3.7 of the Starter Repository Spec) while everyone else watches/confirms folder structure |
| 25–30 | Everyone has repo access, has cloned it, and has run `npm install` successfully on their own machine before splitting up |

**Do not start writing feature logic before minute 30.** A team that starts coding at minute 5 without alignment loses more time to rework than it gains in head start.

---

## 4.2 Hour-by-Hour Timeline

| Time | Focus | Key deliverable |
|---|---|---|
| 0–2h | Keynote/MCP intro, scope lock | Shared understanding, roles assigned |
| 2–4h | Repo scaffold, lock tool contracts | Scaffold commit on `main`, schemas locked |
| 4–6h | Role A starts widget "hello world" test immediately | One dummy tool → widget → visible in NitroStudio |
| 6–12h | Parallel build: analyzer, knowledge base, rule JSON, first real widget | Each role's core logic taking shape |
| 12–16h | **Checkpoint: first full integration** — run the entire flow end to end, even ugly | Every tool callable in sequence without crashing |
| 16–20h | Continue building on top of confirmed-working integration | Real logic replacing stubs |
| 20–24h | Push toward feature-complete for MVP scope | All 6 rules firing, analyzer extracting real theme tokens |
| 24–24h | **Rest / rotate** — don't skip this | Team is actually rested, not just off-screen |
| 24–32h | Sprint 2: real Groq reasoning wired in, real Lighthouse numbers, widget polish | Confidence scores, rejected list, benchmark chart all real |
| 32–36h | **Checkpoint: deploy live** | MCP server reachable from a fresh machine |
| 36–40h | Run the full flow repeatedly to kill bugs | Stable, repeatable demo run |
| 40–44h | **Feature freeze** — rehearse the live demo, record the backup video | Backup video saved in `demo/`, team has rehearsed twice |
| 44–48h | Buffer, final README pass, submit | Submission complete before deadline, not at the deadline |

**The single most important checkpoint is 12–16h.** If the full pipeline hasn't run end to end by then — even with fake data — that's the team's clearest early-warning signal, not something to push past.

---

## 4.3 Communication Protocol

- **Primary channel:** one shared group chat (Discord/WhatsApp/Slack) — no side DMs for project decisions, everything relevant goes in the main channel so context isn't lost.
- **Standups: every 4 hours**, 5 minutes each, async or live. Each person answers 3 things:
  1. What did I just finish?
  2. What am I doing next?
  3. Am I blocked on anything?
- **Checkpoint syncs:** at each Integration Checkpoint (§1.4 of the Team Execution Plan), all 4 people stop and verify together — this is not optional, not a "check the chat later" moment.
- **Urgent blockers:** tag the specific person directly (not just the channel) and say what you need within 1 sentence — "need X from Y to unblock Z."
- **Decisions that affect shared contracts** (schemas, tool signatures) require an explicit "yes" from the affected role before merging — silence is not agreement.
- **During the sleep/rotate window (16–24h):** at least one person stays reachable for genuine emergencies (e.g., deploy is down), but nobody is expected to be actively working.

---

## 4.4 Risk Management

| Risk | Likelihood | Owner | Mitigation |
|---|---|---|---|
| Widget rendering doesn't work as expected in the demo client | Medium | A | Test in hour 4–6, not hour 40. Fallback: show raw NitroStudio JSON tool output if widgets fail |
| Groq rate limits hit mid-demo | Low–Medium | C | Keep the demo to a handful of calls, cache/reuse results while testing, don't hammer the API while debugging |
| Live Lighthouse run is slow/flaky on stage | Medium | D | Backup video of a full clean run, recorded by hour 44 |
| Scope creep eats build time | High | All (enforced by whoever notices first) | Hold the line at 6 libraries, React/Next.js only, no freeform code generation |
| Deploy breaks last minute | Medium | D | Deploy early (by hour 32–36), not at hour 47 |
| Shared schema changes late and breaks another role's code | Medium | B (arbitrates) | Schema changes go through B, flagged in channel, never a silent edit |
| Team member burns out / disappears for a stretch | Low–Medium | All | Enforce the 16–24h rest window; no one codes through the entire 48 hours solo |

**Rule:** any risk that materializes gets flagged in the main channel the moment it's noticed — not after someone's already spent an hour trying to fix it alone.

---

## 4.5 Feature Prioritization (MoSCoW)

**Must have (MVP — the demo does not work without these):**
- `analyzeProject()` returning a real ProjectProfile
- Rule engine evaluating all 6 libraries with at least one condition each
- Confidence scoring formula, visibly broken down
- Recommendation widget rendering in NitroStudio
- At least one real Lighthouse before/after run

**Should have (strengthens the pitch significantly):**
- Rejected-recommendations list with real reasons
- Groq-generated one-line justification per recommendation
- Design spec widget with real extracted colors/motion values
- Ops Canvas tool-call visualization working cleanly

**Could have (only if ahead of schedule after hour 32):**
- Additional rule conditions per library for finer-grained matching
- Polish pass on widget visuals beyond functional
- Extra libraries beyond the 6 MVP set

**Won't have (explicitly out of scope — say no if suggested mid-hackathon):**
- Freeform code generation by the MCP server itself
- Support for frameworks beyond React/Next.js
- A custom dashboard outside of NitroStudio's native widget rendering
- The fuller DOM/vision-based evidence pipeline (Playwright, Lighthouse-as-evidence-layer) — explicitly deferred, not part of this build

If a new idea comes up after hour 24, it goes in "Could have" by default — it only moves up if a "Must have" is already done and there are verified spare hours.

---

## 4.6 Demo Preparation

- **Script the exact sequence** of what's shown on screen, step by step — this matters as much as the code (see Slide 5 in the pitch deck: analyze → recommendation → design spec → agent writes code → before/after benchmark).
- **Rehearse at least twice** before the final submission window, on the actual machine/setup that will be used live.
- **Know your fallback for every live-dependency step:**
  - Widgets fail → show raw tool JSON output
  - Groq is slow/rate-limited → use a cached response from testing
  - Live Lighthouse is flaky → cut to the backup video
- **Assign a narrator.** One person talks through the flow while it runs; the others watch for and quietly handle anything going wrong, rather than everyone narrating at once.
- **Time it.** Know exactly how long the demo takes and leave margin for the unexpected — don't design a demo that only works if everything goes perfectly.

---

## 4.7 Final Submission Checklist

- [ ] `main` branch reflects the final, working build (see GitHub Workflow §2.8)
- [ ] Live MCP server URL confirmed working from a fresh machine
- [ ] Backup demo video recorded, clean, and saved in `demo/`
- [ ] README fully filled in — architecture, setup, team, tools table
- [ ] No API keys or secrets committed anywhere in git history
- [ ] Repo visibility matches submission requirements (public if required)
- [ ] Pitch deck finalized (8 slides, per the architecture doc)
- [ ] Demo rehearsed at least twice on the actual presentation setup
- [ ] Submission form filled out completely — repo link, live URL, deck, video — before the deadline, not at it
- [ ] Every team member knows their part of the live pitch
