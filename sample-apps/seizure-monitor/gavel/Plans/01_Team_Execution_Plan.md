# 1. Team Execution Plan

**Project:** Frontend Intelligence MCP — NitroStack × SRMIST Hackathon
**Purpose:** Defines *who* owns *what*, so no two people are ever guessing whose job something is.

---

## 1.1 Team Roles (A / B / C / D)

Four roles, mapped directly to the four pipeline stages in the architecture: **read the project → decide what it needs → prove the decision is right → show it live.**

### Role A — UI, Widgets & Live Demo Surface
Owns everything a judge actually *sees*. Builds the `@Widget`-decorated components (recommendation card, design-spec card, benchmark chart), sets up NitroStudio as the live demo surface, and owns the judge-facing moment end to end.

### Role B — MCP Core & Project Analyzer
Owns the foundation everyone else builds on. Scaffolds the NitroStack project, builds `analyzeProject()` / `inspectDependencies()` / `inspectDesignLanguage()`, and locks the Zod input/output contracts that every other role depends on.

### Role C — Knowledge Base, Rule Engine, Scoring & Groq Integration
Owns the "brain" of the system. Curates the 6-library knowledge base, writes the declarative rule JSON, builds the rule engine + confidence-scoring engine, and wires the Groq call that turns a scored decision into a one-line justification.

### Role D — Benchmarking, Deploy & Demo Safety Net
Owns proof and survival. Builds the Lighthouse before/after benchmarking, owns deployment (NitroCloud/Railway), records the backup demo video, and keeps the repo itself judge-ready (README, folder hygiene, no dead code).

---

## 1.2 Work Distribution

| Role | Area | % of Build Effort | Why this weighting |
|---|---|---|---|
| **C** | Knowledge base, rule engine, scoring engine, Groq integration | **35%** | Largest surface area — 6 rule files, 2 engines, 4 tools, and the one part a judge will ask to inspect directly |
| **B** | MCP core, analyzer, schemas | **25%** | Everyone else's work depends on these contracts shipping early — high leverage, must be first |
| **A** | Widgets, live demo surface | **20%** | Judge-facing but scoped to 3 widgets + NitroStudio setup |
| **D** | Benchmarking, deploy, safety net | **20%** | Narrower tool surface, but carries deployment risk and demo insurance |

**Total: 100%.** If your team ends up with 4 people of roughly equal availability, this is *not* an even split of hours — Role C and B should expect to spend more raw time than A and D, especially in the first 12 hours.

---

## 1.3 Module / File Ownership

| Folder / File | Owner | Notes |
|---|---|---|
| `src/tools/analyzer/`, `src/services/file-reader.service.ts`, `src/services/theme-extractor.service.ts` | **B** | Owns project-reading logic and the schemas it outputs |
| `src/app.module.ts`, `src/main.ts`, `nitrostack.config.ts` | **B** | Scaffolded first (hour 2–4) so contracts exist before others build |
| `src/tools/recommendation/` (incl. `rules/`, `rule-engine.ts`, `scoring-engine.ts`), `src/resources/knowledge-base.resource.ts`, `src/data/library-knowledge-base.json`, `src/services/groq.service.ts` | **C** | Owns raw analysis → matched/rejected rules → scored decision → Groq-phrased reasoning |
| `src/tools/benchmark/`, `src/services/lighthouse-runner.service.ts`, `test/` | **D** | Owns before/after proof |
| `widgets/` (all three subfolders) | **A** | Everything judges visually see |
| `demo/` | **A + D** | A owns screenshots/pitch deck assets, D owns backup video + deploy verification |
| `.env.example`, `package.json`, `README.md`, deploy config | **D** | One clear owner for repo hygiene — judges review this directly |
| `src/schemas/` | **Shared, merged by B** | Each role writes the schema for their own tools' inputs/outputs; B keeps it consistent |

**One rule to avoid merge conflicts:** nobody edits inside another role's folder without a heads-up first. If C's recommendation engine needs something new from the analyzer, C asks B to add it to the schema — C does not reach into `src/tools/analyzer/` directly. Cross-folder changes go through a message, never a silent edit.

---

## 1.4 Integration Checkpoints

| Checkpoint | Hour | What gets verified | Who must be present |
|---|---|---|---|
| **Contracts locked** | ~4h | Zod schemas for `ProjectProfile`, `Rule`, `Recommendation`, `DesignSpec`, `BenchmarkResult` are finalized and committed | All 4 — this blocks everyone if it slips |
| **Widget "hello world" live** | ~4–6h | One dummy tool → one widget → visibly renders in NitroStudio | A (drives), B (supports MCP wiring) |
| **First full pipeline run** | ~12–16h | Every tool called once, end to end, even with stub/fake data — ugly is fine, broken is not | All 4 |
| **Real data flowing** | ~24h | Real Groq responses, real Lighthouse numbers replace stubs | C, D |
| **Deploy verified live** | ~32h | MCP server reachable from a fresh machine, not just a dev laptop | D (drives), B (supports) |
| **Full dry-run rehearsal** | ~40h | Complete demo run, timed, on the actual presentation setup | All 4 |

If a checkpoint is missed, it is flagged in the team channel immediately — see §1.7 Blocker Handling. Do not silently push a checkpoint to "later."

---

## 1.5 Role Selection Questionnaire

Use this before assigning A/B/C/D. Answer honestly — optimizing for what genuinely energizes each person beats optimizing for perceived seniority.

**Q1. Which of these would you rather spend 12 hours on?**
- A) Making something look good and demo well on screen
- B) Getting a foundational system running cleanly and quickly
- C) Designing the logic that decides "what is the right answer here"
- D) Proving something works with hard numbers, and making sure nothing breaks on stage

**Q2. When you get stuck, what's your instinct?**
- A) Tweak visuals/UX until it feels right
- B) Read the framework docs and rebuild the scaffold
- C) Write out the decision logic on paper first, then code it
- D) Find the smallest reproducible test case and isolate the bug

**Q3. Which failure would stress you out more during a live demo?**
- A) The widget doesn't render / looks broken
- B) The MCP server doesn't respond to the agent at all
- C) The recommendation is obviously wrong or unexplainable
- D) There's no fallback and something flakes live with no backup

**Q4. Pick your strongest practical skill for this project:**
- A) Frontend/React, design sense, presenting
- B) Backend scaffolding, TypeScript architecture, API contracts
- C) Rules/algorithms, data modeling, prompt design
- D) Testing, DevOps/deployment, performance measurement

**Q5. What do you want to be able to say you owned, after this is over?**
- A) "I made the thing judges actually looked at"
- B) "I built the engine everyone else plugged into"
- C) "I built the part that makes this smarter than a script"
- D) "I made sure it actually worked when it mattered"

**Scoring:** Tally your most frequent letter across all 5 answers. That's your suggested role. If two people land on the same letter, the tiebreaker is Q4 (practical skill match) — the closer skill fit takes the role, the other person takes their second-most-frequent letter.

---

## 1.6 Definition of Done

A role's work is **not done** until every item below is true — "it runs on my machine" does not count.

**Role A — done when:**
- [ ] All 3 widgets render correctly inside NitroStudio, not just in isolation
- [ ] Rejected-recommendations list is visible and collapsible in the widget
- [ ] NitroStudio Ops Canvas shows the full tool-call sequence cleanly
- [ ] Demo walkthrough has been rehearsed at least twice end to end

**Role B — done when:**
- [ ] `analyzeProject()` returns a real, populated `ProjectProfile` (not mocked) from an actual repo
- [ ] Theme tokens (colors, fonts, spacing) are correctly extracted from `tailwind.config`/CSS variables
- [ ] All output schemas are committed, documented, and unchanged since the contract-lock checkpoint (or changed only via the agreed process)

**Role C — done when:**
- [ ] All 6 libraries have at least one working declarative rule, no hardcoded if/else
- [ ] Confidence formula produces a visible, correct breakdown (match strength / compatibility / conflict penalty)
- [ ] Rejected recommendations include a real, specific `rejectionReason` — not a generic placeholder
- [ ] Groq call returns a coherent one-line justification within demo-safe latency

**Role D — done when:**
- [ ] `runLighthouse()` returns real before/after numbers on the actual demo project
- [ ] Live deployment is confirmed working from a machine that isn't the dev laptop
- [ ] Backup demo video exists, is a full clean run, and is saved in `demo/`
- [ ] README explains the architecture clearly enough that a judge with no context understands it in under 2 minutes

---

## 1.7 Blocker Handling

1. **First 15 minutes:** try to unblock yourself. Check the schema/contract docs, check this plan, check the source architecture doc.
2. **Still blocked:** post in the team channel immediately with (a) what you're trying to do, (b) what's blocking you, (c) what you've already tried. Don't sit on it silently — silent blockers are the #1 killer of hackathon timelines.
3. **Owner of the blocking piece responds within 15 minutes** if physically possible. If they're mid-focus on something else, they say so and give an ETA.
4. **If unresolved after 30 minutes total:** switch to a different task on your list while it's escalated. Never sit idle waiting — every role has fallback work (polish, tests, docs) that doesn't depend on the blocker.
5. **Cross-role blockers** (e.g., C needs a new field from B's schema) always go through a direct message first — never a silent edit into someone else's folder (see §1.3).
6. **Escalate to the whole team** if a blocker threatens a checkpoint in §1.4 — that's a team-level risk, not a one-person problem.
