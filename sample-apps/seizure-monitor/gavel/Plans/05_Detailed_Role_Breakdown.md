# 5. Detailed Role Breakdown — A / B / C / D

**Project:** Frontend Intelligence MCP
**Purpose:** Exactly what each person does, in what order, what's blocked vs. startable at hour 0, and what "done" looks like at each stage.

---

## Role A — UI, Widgets & Live Demo Surface

### Can start at hour 0? **Yes, fully.**
Widget work only depends on the schema shapes (already locked in the Starter Repo Spec), not on real data existing yet. This is why A's "hello world" test is scheduled first in the timeline — it's the least blocked role.

### Phase-by-phase

**Hour 0–2 (setup):**
- Get the NitroStack/Antigravity local dev environment running on your machine.
- Read the 3 output schemas you're rendering against: `ScoredRecommendationSchema`, `RejectedRecommendationSchema`, `DesignSpecSchema`, `BenchmarkResultSchema`.
- Sketch (on paper or Figma, fast) what each of the 3 widgets looks like: recommendation card, design-spec card, benchmark chart.

**Hour 2–6 (the critical test):**
- Build one throwaway `@Widget`-decorated tool that returns hardcoded fake data matching `ScoredRecommendationSchema`.
- Confirm it renders inside your actual demo client (NitroStudio or Antigravity — resolve that decision first, see prior conversation).
- **This is the single highest-risk task in the whole project.** If widgets don't render as expected, you need to know now, not at hour 40, so the team can pivot to a raw-JSON fallback with time to design around it.
- Deliverable: a screenshot/recording proving one widget renders live, shared in the team channel.

**Hour 6–12 (build real widgets against stub data):**
- Build the actual **recommendation card** widget: accepted picks + confidence breakdown (match strength / compatibility / conflict penalty shown, not just a number) + collapsible rejected list.
- Build the **design-spec card**: color swatches (rendered as actual color chips, not hex text), motion duration/easing shown clearly.
- Build the **benchmark chart**: before/after Lighthouse score + bundle size, visually comparable (bar or delta view).
- Work against Role B's and Role C's *stub* tool outputs — don't wait for real data.

**Hour 12–16 (first integration checkpoint):**
- Swap stub data for whatever real data B/C have by this point, even if partial.
- Fix anything that breaks when real (messier, less predictable) data flows through instead of your clean stub data.

**Hour 16–32 (polish + NitroStudio/Antigravity Ops view):**
- Get the tool-call visualization (Ops Canvas or equivalent) showing cleanly — this is your answer to "how do judges see it thinking."
- Visual polish pass: spacing, color consistency with the design-spec output itself (there's a nice meta-detail here — your own widget can literally use the design tokens your tool recommends).
- Start drafting the demo screenshot/GIF sequence for the pitch deck.

**Hour 32–40:**
- Full run-throughs with the real, deployed server (once D has it live).
- Fix any rendering issues that only show up against production data/latency.

**Hour 40–48:**
- Rehearse narrating the live demo twice.
- Finalize demo assets (`demo/screenshots/`, pitch deck visuals).

### Definition of done
- All 3 widgets render correctly against real (not stub) tool output.
- Rejected list is visible and collapsible.
- Tool-call visualization is clean and demo-ready.
- You've personally rehearsed the demo flow at least twice.

---

## Role B — MCP Core & Project Analyzer

### Can start at hour 0? **Yes, fully — and must.**
Everyone else is blocked on this role's early output. This is the one role where being late has compounding cost for the whole team.

### Phase-by-phase

**Hour 0–2 (scaffold):**
- Run the NitroStack init, shape the folder structure per the Starter Repo Spec.
- Push the initial scaffold commit to `main` before branch protection goes on.

**Hour 2–4 (contracts — the critical task):**
- Write the final Zod schemas: `ProjectProfileSchema`, `RuleSchema`, `ScoredRecommendationSchema`, `RejectedRecommendationSchema`, `DesignSpecSchema`, `BenchmarkResultSchema`.
- Get explicit sign-off from C (consumes ProjectProfile, produces recommendations) and D (produces BenchmarkResult) that the shapes cover what they need — a 5-minute call beats a schema change at hour 20.
- Commit schemas to `dev`. **This unblocks the entire team simultaneously** — treat this as the actual hour-4 deadline, not a soft target.

**Hour 4–8 (analyzeProject core):**
- Build `analyzeProject()`: read `package.json` (framework detection — react vs next), read lockfile for dependency list, walk the folder structure for a rough `projectType` guess (portfolio/dashboard/ecommerce heuristics — keep this simple, a few filename/route pattern checks is enough for MVP).
- Build `inspectDependencies()`: parse installed packages, flag if an animation library already exists (`hasAnimationLibrary`), estimate `bundleSizeKb` (can start with a rough `node_modules` size heuristic or a real bundler stat if time allows).

**Hour 8–12 (design language extraction — this is what makes the demo look real):**
- Build `inspectDesignLanguage()` / `theme-extractor.service.ts`: parse `tailwind.config.js` for the color palette, font families, spacing scale. If no Tailwind, fall back to scanning CSS custom properties (`:root { --color-... }`).
- This is worth extra care — a generic-looking design spec ("use blue-500") is far less convincing to judges than "we extracted your actual `#1E3A8A` from your own config."

**Hour 12–16 (first integration checkpoint):**
- Run `analyzeProject()` against a real test repo end to end, confirm the output actually validates against your own schema.
- Support C and D as they start consuming your real output instead of stubs — expect schema edge cases to surface here (missing fields, unexpected framework, etc.).

**Hour 16–24:**
- Harden edge cases: what happens with a repo that has no Tailwind, no clear project type, monorepo structure, etc. Decide sensible fallback defaults rather than crashing.

**Hour 24–32:**
- Support role C's rule engine — they'll be calling your output directly, be available for their questions about field meanings/edge cases.
- Write basic tests for `analyzeProject()` against 2–3 different real repos (different frameworks/structures) to catch regressions.

**Hour 32–40:**
- Bug-fix pass driven by full end-to-end runs.
- Help D with anything analyzer-related that breaks during deploy testing (e.g., file system access differences between local and deployed environment).

**Hour 40–48:**
- Final README architecture section (you understand the core pipeline best).
- Available for last-minute schema-related fire drills only — no new features.

### Definition of done
- `analyzeProject()` returns a real, populated, schema-valid `ProjectProfile` from an actual repo, not mocked data.
- Theme tokens are correctly extracted from a real Tailwind config or CSS variables.
- All schemas are stable and unchanged since the hour-4 lock (or changed only via explicit team sign-off).

---

## Role C — Knowledge Base, Rule Engine, Scoring & Groq Integration

### Can start at hour 0? **Partially.** Knowledge base curation and rule-writing can start immediately (doesn't need B's code, just the *shape* of the schema). Wiring the rule engine to real `ProjectProfile` data is blocked until B's schema lands (~hour 4) and blocked on real data until ~hour 8-12.

### Phase-by-phase

**Hour 0–2 (research, no code needed):**
- Curate the knowledge base for all 6 libraries (Framer Motion, GSAP, Lenis, Magic UI, React Bits, Three.js): bundle size, GPU cost, compatibility notes, common use cases. This is pure research — start immediately, doesn't block on anyone.

**Hour 2–4 (rule schema, against the agreed shape):**
- Once B shares the draft `RuleSchema` shape (even before it's fully committed), start writing the declarative rule JSON for each library — condition sets, priority, `reasoningTemplate`, `rejectionReason`.
- Aim for at least 2-3 conditions per rule so the confidence formula's `matchStrength` term has something meaningful to compute.

**Hour 4–8 (rule engine + scoring engine — code):**
- Build `rule-engine.ts`: evaluate each rule's `conditions` array (AND logic) against a `ProjectProfile`, using stub profiles from B while real ones aren't ready. Output matched → Raw Recommendations, unmatched → Rejected Recommendations.
- Build `scoring-engine.ts`: implement the confidence formula exactly —
  `confidence = clamp(0, 100, (0.6 × matchStrength + 0.4 × compatibility − conflictPenalty) × 100)`.
  Write this so the breakdown (not just the final number) is returned — Role A's widget needs to show "3/3 matched, fully compatible, no conflict" as a visible trail, not just "94%."

**Hour 8–12 (Groq integration):**
- Wire `groq.service.ts`: OpenAI-compatible client, `llama-3.3-70b-versatile`, endpoint `https://api.groq.com/openai/v1/chat/completions`.
- Write a short, tight prompt template that takes a scored decision object and returns one sentence of justification. Keep the prompt itself short — free tier is ~30 req/min, 6000 tokens/min, plenty for a demo but not something to hammer while testing.
- Test with 5–10 varied inputs to make sure the tone stays consistent and doesn't ramble.

**Hour 12–16 (first integration checkpoint):**
- Swap stub `ProjectProfile` data for B's real output.
- Debug real-world mismatches (e.g., a real repo doesn't cleanly match any rule — make sure the "no strong match" case degrades gracefully rather than returning nothing).

**Hour 16–24:**
- Build `generateDesignSpec()`: take the top recommendation + B's extracted theme tokens, produce exact hex values (not generic ones), motion duration/easing pairs, and target file suggestions.
- Build `compareLibraries()` and `estimateBundleImpact()` as supporting tools.

**Hour 24–32:**
- Tune rules against real test repos — this is where you'll discover a rule is too strict (never fires) or too loose (fires on everything). Expect to rewrite 2-3 rules.
- Coordinate with A on the exact output shape the widget needs for the rejected list (specific wording, not just a boolean).

**Hour 32–40:**
- Full pipeline stress test: run against 3-4 different real repos, confirm recommendations feel *right*, not just technically valid.
- Prep your answer for the judge question you will definitely get: "how do you know this recommendation is good?" — rehearse walking through one real example, live.

**Hour 40–48:**
- No new rules or logic changes after freeze (hour 40) — only bug fixes.
- Support A if any widget/data-shape mismatches surface during rehearsal.

### Definition of done
- All 6 libraries have at least one real, tested declarative rule — no hardcoded if/else anywhere.
- Confidence breakdown is transparent and matches the documented formula exactly.
- Rejected recommendations carry a specific, real reason, not a generic placeholder.
- Groq justification is coherent, on-tone, and returns within demo-safe latency (test this — if it's slow, that's a live-demo risk D needs to know about).

---

## Role D — Benchmarking, Deploy & Demo Safety Net

### Can start at hour 0? **No, not on the core tools** — Lighthouse needs a real page to benchmark, and deploy needs a real server to deploy. **But there's genuine, non-blocked prep work from hour 0** — don't sit idle.

### Phase-by-phase

**Hour 0–2 (prep work that doesn't block on anyone):**
- Set up the deploy target account now: NitroCloud or Railway (backup) — get credentials, confirm you can deploy *any* hello-world MCP server before you need to deploy the real one.
- Set up a Lighthouse CLI / Lighthouse CI locally, confirm it runs against any arbitrary public URL as a smoke test.
- Draft the README skeleton (architecture placeholder, setup steps, team table) — real content gets filled in later, but the structure can exist now.

**Hour 2–6 (deploy pipeline dry run):**
- Deploy B's bare scaffold (even with `Not implemented yet` stub tools) to your chosen host. The goal isn't a working server yet — it's proving the *deploy mechanics* work (build step, env vars, port config) before real logic exists to complicate debugging.
- This is the equivalent of A's "hello world" widget test — a deploy "hello world," done early on purpose.

**Hour 6–12 (benchmark tooling, against a placeholder):**
- Build `run-lighthouse.tool.ts` against any real public URL (even an unrelated test site) to confirm the Lighthouse-runner service works mechanically — you don't need the actual demo project ready yet to build the plumbing.
- Build `compare-metrics.tool.ts`: before/after diffing logic, bundle size delta calculation.

**Hour 12–16 (first integration checkpoint):**
- Point your benchmark tools at the actual demo project for the first time (once it has anything real to build/analyze).
- Run one real before/after comparison, even a rough one — confirm the numbers make sense (after-score should plausibly be different from before-score, not identical or nonsensical).

**Hour 16–24:**
- Continue hardening the Lighthouse runner — handle timeouts, retries, and slow-loading pages gracefully (this will matter a lot on a live/flaky conference wifi).

**Hour 24–32:**
- Redeploy with real tool logic now in place (once B/C's real code has landed on `dev`).
- Start repo hygiene pass: prune dead code, check folder structure matches the spec, no leftover stub files sitting unused.

**Hour 32–36 (deploy checkpoint — critical):**
- Full deploy of the real, integrated server. Confirm it's reachable from a device that is *not* the dev laptop (phone hotspot, another team member's machine) — this catches "works on my machine" issues before it's too late to fix them.

**Hour 36–40:**
- Record the backup demo video: a full, clean run of the entire flow, start to finish, no live-dependency failures. This is your insurance policy — treat it as seriously as the live demo itself.
- Final Lighthouse numbers locked in for the pitch deck.

**Hour 40–44:**
- Feature freeze — only fixes.
- Finalize README: architecture explanation, setup instructions that actually work from a clean clone, team section.
- Confirm `.env.example` is accurate and no real secrets are anywhere in git history.

**Hour 44–48:**
- Final deploy freeze — no further changes unless something is actively broken.
- Submission checklist pass (repo link, live URL, deck, video all ready).

### Definition of done
- `runLighthouse()` produces real before/after numbers on the actual demo project, not a placeholder site.
- Live deployment confirmed reachable from a non-dev machine.
- Backup video exists, is a full clean run, and is saved in `demo/`.
- README is clear enough that someone with zero context understands the architecture in under 2 minutes.

---

## Quick Reference: What Can Start at Hour 0

| Role | Fully unblocked at hour 0? | What to do instead if blocked |
|---|---|---|
| A | Yes | — |
| B | Yes (and must — team is waiting on you) | — |
| C | Partially — research/rules yes, engine wiring no | Do knowledge base + rule JSON writing hour 0–4 while waiting on B's schema |
| D | No, not on core tools | Deploy dry-run + Lighthouse smoke test + README skeleton — real prep, not busywork |
