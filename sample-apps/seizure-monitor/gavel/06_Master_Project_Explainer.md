# 6. Master Project Explainer

**Project:** Frontend Intelligence MCP (nickname you might hear: **Gavel**)
**Purpose:** This file assumes you know nothing else. Read this once, fully, and you should be able to look at any file your team or an AI agent generates and know exactly what it's supposed to do — and where to look when it breaks.

This doc doesn't replace files 01–05. It's the glue between them, in plain English.

---

## PART 1 — What We're Actually Building (zero jargon)

### The one-paragraph version
We're building a tool that an AI chat assistant can plug into. You point it at a real website's codebase. It reads the codebase, asks you a couple of questions about what the site is for, and then tells you — with a confidence score and real reasoning, not a guess — which animation/UI library (out of 6 options) would actually suit this specific project, exactly what colors and motion values to use, and then proves it worked by measuring the site's performance before and after.

### What "MCP" means, in plain terms
Normally, an AI chatbot can only talk to you. MCP ("Model Context Protocol") is a standard that lets an AI chatbot actually **do things** — read a real file, run a real check, show you a real interactive card instead of just text. An "MCP server" is the thing you build that exposes those "things it can do" to the AI.

### What "NitroStack" is
It's the toolkit/framework we're using to build our MCP server, so we don't have to write all the low-level wiring ourselves. In NitroStack:
- A **Tool** is one "thing the AI can do" — a function with a name, a description, defined inputs, and a defined output. You write a class, put `@Tool(...)` above it, and NitroStack handles making it callable by the AI.
- A **Widget** is a visual card/chart NitroStack can render live in the chat, instead of plain text — this is what judges will actually see on screen.
- A **Resource** is a piece of data the AI can read for context (like our library knowledge base).

### The whole thing, walked through with one fake example

Imagine a student, Priya, has a Next.js portfolio site. Here's exactly what happens, step by step, when she uses our tool:

1. **She points our tool at her repo.** First time using it on this project, so it asks her 3 quick questions: *Who's the audience? What's the priority — polish or performance? etc.* (This is the "intent" step — more in Part 2.)
2. **`analyzeProject()` reads her actual code** — her `package.json`, her `tailwind.config.js`, her folder structure. Not guesses — actual files.
3. **It also reads a few of her real component files** and notices something like "3 different button styles used inconsistently" — a specific, real observation, not a generic one.
4. **The rule engine checks her project against 6 candidate libraries** (Framer Motion, GSAP, Lenis, Magic UI, React Bits, Three.js) using fixed, written-in-advance rules — never a guess, never "vibes."
5. **A confidence score gets computed** — e.g. "Framer Motion: 91% confidence" — with a visible breakdown of *why*.
6. **An LLM (Groq) writes one clean sentence explaining the pick** in plain English — but the LLM never makes the decision, it only phrases a decision that was already made by the rules. This is important — more on why in Part 2.
7. **Three widgets appear live in the chat**: a recommendation card (with the winner and the rejected options), a design-spec card (the exact colors/motion values pulled from her real config), and later, a benchmark chart.
8. **Lighthouse actually measures her site's performance** before any change and after, so the recommendation isn't just talk — there are real numbers proving it helped (or didn't).

That's the whole product. Everything below is "how do 4 people build this in 48 hours without breaking each other's work."

### One open decision to nail down before you start
The specs mention testing this inside either **NitroStudio** (NitroStack's own built-in test-chat tool) or **Antigravity** (Google's agentic IDE, which can also act as an MCP client). Pick one as your primary demo client on hour 0 — don't leave this open past the first 30 minutes. NitroStudio is simpler and purpose-built for this; Antigravity is heavier but is what some of you already use daily. Whichever you pick, Role A tests widget rendering in *that exact tool*, because a widget that renders fine in one client can look different (or break) in another.

---

## PART 2 — The Full Pipeline, In Order (this is the spine of the whole project)

```
Step 0:  User gives repo path + answers 3 intent questions
           (first run: full form. Every run after: one-line "still accurate?" confirm)
              ↓
Step 1:  analyzeProject() — reads package.json, tailwind config, folder structure
              ↓  produces: ProjectProfile
Step 2:  Deep evidence — an LLM reads actual component files, extracts specific
         structured observations (not raw code dumped back)
              ↓  adds to: ProjectProfile
Step 3:  Rule engine — checks ProjectProfile against 6 written rule files
         (deterministic: if conditions match, it matches. No LLM involved here.)
              ↓  produces: matched recommendations + rejected recommendations
Step 4:  Scoring engine — computes a 0-100 confidence score per match
              ↓  produces: ScoredRecommendation (with the winner) + RejectedRecommendation (the rest)
Step 5:  Groq (LLM) — writes ONE sentence explaining the winning pick in plain English
              ↓  fills in: the `reasoning` field only — never touches the decision itself
Step 6:  generateDesignSpec() — turns the winner + Priya's real colors/fonts into
         exact usable values (hex codes, motion durations, which files to touch)
              ↓  produces: DesignSpec
Step 7:  Widgets render live: recommendation card, design-spec card
Step 8:  Lighthouse runs before/after the change is applied
              ↓  produces: BenchmarkResult
Step 9:  Benchmark chart widget renders — the "proof" moment
```

### Why the LLM never makes the actual decision — memorize this line
**The rule engine and scoring formula decide. Groq only writes the sentence explaining what was already decided.** This is the single most important design decision in the whole project, and it's why this beats "just ask ChatGPT which library to use": our answer is reproducible, explainable, and can't hallucinate a library that doesn't exist or contradict itself between runs. If a judge asks "how do you know this is right, and not just an LLM guessing?" — this is your answer, word for word.

### The confidence formula, explained with real numbers
```
confidence = clamp(0, 100, (0.6 × matchStrength + 0.4 × compatibility − conflictPenalty) × 100)
```
In plain English: *60% of the score comes from how well the project's actual conditions matched the rule's conditions. 40% comes from whether the library is compatible with what's already installed. Then we subtract points for any detected conflict.*

**Worked example:** a rule has 3 conditions, and Priya's project satisfies all 3 → `matchStrength = 1.0`. Nothing conflicts with what's installed → `compatibility = 1.0`, `conflictPenalty = 0`.
`confidence = (0.6×1.0 + 0.4×1.0 − 0) × 100 = 100`

**A messier, more realistic example:** only 2 of 3 conditions match → `matchStrength ≈ 0.67`. Mostly compatible but one minor overlap → `compatibility = 0.8`, `conflictPenalty = 0.1`.
`confidence = (0.6×0.67 + 0.4×0.8 − 0.1) × 100 ≈ 62`

If you ever see a confidence number in a widget and want to sanity-check it's not a bug, plug the three numbers into this formula yourself — it should match exactly. If it doesn't, the bug is in `scoring-engine.ts` (Role C's file).

### The intent-question feature (the "Gavel" upgrade — not in files 01–05 yet, but real and decided)
This part came out of a follow-up design discussion and needs to be understood alongside the rest:
- **First time** running the tool on a given project: it asks 3 direct questions (e.g. who's the audience, what matters more — polish or performance, etc.) and stores the answers in a small local cache file (`.gavel-context`) alongside a timestamp.
- **Every run after that:** instead of asking again from scratch, it shows what it remembers ("Last set 2 hours ago: Recruiter portfolio, Technical audience, Performance priority — still accurate?") with a one-line **Yes, continue / No, update** choice. Cheap to answer, but never silently assumes old answers still apply.
- **Why this matters:** silently reusing an old answer could produce a confident, wrong recommendation with no warning. Always asking from scratch every time is annoying and slow. This is the middle ground, and it's a detail worth mentioning to judges — it shows the team thought about a real UX failure mode, not just the happy path.
- **Who owns it:** entirely **Role B** — the cache file read/write, the "does a cache exist and is it recent" branching logic, and the actual elicitation call are all part of the same pre-analysis step B already owns. It is not a 5th role and nobody else needs to touch it.

---

## PART 3 — The Four Roles: What Each Person Builds, In What Order, And Exactly What They Hand Off

Read this as: **who's blocked on whom, and what exact "package" gets handed from one person to the next.**

```
        Role B                Role C                    Role A
   (reads the project)  →  (decides + explains)  →  (shows it live)
                                    ↑
                              Role D feeds in
                          benchmark numbers, independently
```

### Role B — MCP Core & Project Analyzer
**One-line job:** reads the real project and turns it into structured data everyone else builds on.
**Blocked at hour 0?** No — and this role blocks everyone else, so it goes first.

- **Hour 0–2:** runs the NitroStack scaffold command, shapes the folders, pushes the very first commit.
- **Hour 2–4 (the most important task in the whole project):** writes the final shape of every shared schema (`ProjectProfile`, `Rule`, `ScoredRecommendation`, `RejectedRecommendation`, `DesignSpec`, `BenchmarkResult`) and gets a quick "yes, this works for me" from Role C and Role D before locking it. **The whole team is stuck until this happens** — treat the hour-4 mark as a hard deadline, not a suggestion.
- **Hour 4–8:** builds `analyzeProject()` (reads `package.json`, detects React vs Next, guesses project type) and `inspectDependencies()` (checks what's already installed, estimates bundle size).
- **Hour 8–12:** builds the design-language extractor — pulls real colors/fonts/spacing out of `tailwind.config.js` (or CSS variables if no Tailwind). This is what makes the demo look real instead of generic.
- **Also owns:** the intent-question + `.gavel-context` caching feature from Part 2.

**What B hands off, in plain English:** *"Here is everything true about this specific project — what framework it is, roughly how big it is, what its actual colors and fonts are, whether it already has an animation library, and what the user told us they actually want it for."* That whole package is called `ProjectProfile`, and it's the only thing Role C is allowed to build against.

**Done when:** running it on a real repo (not fake data) produces a correctly filled-in `ProjectProfile`, and the schemas haven't changed since the hour-4 lock without everyone agreeing first.

---

### Role C — Knowledge Base, Rule Engine, Scoring & Groq
**One-line job:** takes B's `ProjectProfile` and decides, with real logic (not a guess), which library fits — then gets an LLM to phrase why.
**Blocked at hour 0?** Partially — research and rule-writing can start immediately; wiring real logic needs B's schema (~hour 4) and B's real data (~hour 8–12).

- **Hour 0–2 (no code, start immediately):** researches all 6 libraries — bundle size, GPU cost, what they're good for, what conflicts with what.
- **Hour 2–4:** writes the actual rule files — one JSON file per library, each with a list of conditions ("if the project has 3D elements and no existing animation library, Three.js scores highly").
- **Hour 4–8:** builds `rule-engine.ts` (checks conditions against B's data) and `scoring-engine.ts` (runs the confidence formula from Part 2).
- **Hour 8–12:** wires up Groq (`llama-3.3-70b-versatile`) to turn the winning, already-decided pick into one clean sentence. Free tier is roughly 30 requests/minute — plenty for a demo, but don't hammer it while testing.

**What C hands off, in plain English:** *"Here's the library we recommend, here's a confidence score with the math shown, here's a one-sentence human explanation of why, here's the exact colors/motion values to use, and here's the full list of libraries we rejected and specifically why each one didn't fit."* That's `ScoredRecommendation` + `RejectedRecommendation` + `DesignSpec` — Role A renders all three directly.

**Done when:** all 6 libraries have at least one real rule (no hardcoded if/else anywhere pretending to be a "rule"), the confidence breakdown is visible and correct, every rejection has a specific real reason, and Groq's sentence reads naturally.

---

### Role A — UI, Widgets & Live Demo Surface
**One-line job:** makes everything the judges actually look at.
**Blocked at hour 0?** No — this is the *least* blocked role, because it can build against fake stand-in data before B and C have real data ready.

- **Hour 0–2:** gets the local dev environment running, reads the output schemas it needs to render, sketches the 3 widgets fast (paper or Figma).
- **Hour 2–6 (the single highest-risk task on the whole team):** builds one fake, hardcoded widget just to prove that widgets render correctly inside your chosen demo client at all. **If this doesn't work, the team needs to know at hour 6, not hour 40.**
- **Hour 6–12:** builds the 3 real widgets against B's and C's stub/fake output — recommendation card, design-spec card, benchmark chart.
- **Hour 12+:** swaps fake data for real data as B/C/D finish it, fixes whatever breaks when messy real data replaces clean fake data.

**What A hands off:** nothing downstream — A is the last stop. Everything A builds is consumed directly by a human (the judge), not by another role's code.

**Done when:** all 3 widgets render correctly against *real* (not fake) data, the rejected list is visible and collapsible, and you've personally rehearsed the demo at least twice.

---

### Role D — Benchmarking, Deploy & Demo Safety Net
**One-line job:** proves the recommendation actually helped, gets the whole thing live on the internet, and makes sure nothing catastrophically fails on stage.
**Blocked at hour 0?** Yes, on the *core* tools (Lighthouse needs a real page, deploy needs a real server) — but there's real, non-busywork prep available immediately.

- **Hour 0–2:** sets up the deploy account (NitroCloud, or Railway as backup), gets Lighthouse running locally against any test site, drafts the README skeleton.
- **Hour 2–6:** deploys B's bare, not-yet-working scaffold — on purpose, before real logic exists, just to prove the deploy *mechanics* (build step, env vars, ports) work while nothing else is complicated yet.
- **Hour 6–12:** builds the actual Lighthouse-running tool and the before/after comparison logic, tested against any placeholder site.
- **Hour 24–36:** redeploys with the real, finished logic, then confirms it's reachable from a phone or a teammate's laptop — not just your own dev machine.
- **Hour 36–40:** records a full, clean backup video of the entire demo, start to finish. Treat this as seriously as the live demo — it's your insurance policy.

**What D hands off:** `BenchmarkResult` (the before/after Lighthouse numbers) goes straight to Role A's benchmark chart widget — this is the one handoff that happens independently of the B → C → A chain.

**Done when:** real before/after numbers exist on the actual demo project (not a placeholder site), the live deployment works from a machine that isn't yours, and the backup video exists and is genuinely clean.

---

## PART 4 — The Schemas, Translated Into Plain English

These live in `src/schemas/` and are the actual contract everyone's code is typed against. If code ever crashes with a type error, it's almost always because something doesn't match one of these shapes exactly.

**`ProjectProfile`** — *"everything true about this specific project"*
| Field | Plain meaning |
|---|---|
| `framework` | Is it React, Next.js, or something we don't recognize |
| `bundleSizeKb` | Roughly how big the built site is |
| `lighthouseScore` | The current performance score, before any change |
| `projectType` | Our best guess: portfolio, dashboard, e-commerce, landing page, or unknown |
| `hasAnimationLibrary` | Does it already have one installed (so we don't recommend a duplicate) |
| `themeTokens` | The actual colors, fonts, and spacing values pulled from their real config |

**`Rule`** — *"one library's if/then logic, written by a human, not guessed by an AI"*
| Field | Plain meaning |
|---|---|
| `conditions` | The list of things that must be true about the `ProjectProfile` for this rule to fire |
| `recommendation` | Which library this rule is arguing for, and a hint on how to implement it |
| `priority` | How strongly this rule should weigh in if multiple rules fire |
| `reasoningTemplate` | The template Groq's sentence is loosely built around |
| `rejectionReason` | What gets shown if this rule does *not* fire — never left blank |

**`ScoredRecommendation`** — *"the winner, with receipts"*
`library`, `title`, `confidence` (the final 0–100 number), `matchStrength`, `compatibility`, `conflictPenalty` (the three inputs to the formula — shown separately so the widget can display *why*, not just the number), and `reasoning` (Groq's one sentence).

**`RejectedRecommendation`** — *"the other 5, and specifically why each lost"*
Just `library` + `reason` — every single one must have a real, specific reason, never a generic placeholder like "not a good fit."

**`DesignSpec`** — *"exactly what to change, in values a coding agent could act on directly"*
`colors` (real hex values, not "blue-500"), `motion` (a duration in milliseconds + an easing curve), `targetFiles` (which actual files this should touch).

**`BenchmarkResult`** — *"the proof"*
`before` and `after`, each with `lighthouseScore` and `bundleSizeKb`, plus a computed `delta` for both.

---

## PART 5 — How To Read The Code (so nothing an agent generates is a black box to you)

Every tool file follows the exact same shape. Here's the annotated pattern — once you understand this one example, you understand every tool file in the project:

```ts
// src/tools/analyzer/analyze-project.tool.ts
import { Tool } from "@nitrostack/core";
import { z } from "zod";
import { ProjectProfileSchema, AnalyzeProjectInputSchema } from "../../schemas/analyzer.schemas";

@Tool({                                    // ← this line registers it as something the AI can call
  name: "analyzeProject",                  // ← the name the AI sees and calls
  description: "Reads a project's package.json, config, and folder structure...", // ← tells the AI when to use this
  input: AnalyzeProjectInputSchema,        // ← what shape of input this tool expects
  output: ProjectProfileSchema,            // ← what shape of output this tool promises to return
})
export class AnalyzeProjectTool {
  async execute(input: z.infer<typeof AnalyzeProjectInputSchema>) {
    // TODO(Role B): implement real analysis
    throw new Error("Not implemented yet");   // ← this is a STUB, not a bug — expected until real logic lands
  }
}
```

**If you ever see `"Not implemented yet"` thrown** — that's not broken code, it's an intentional placeholder so the project *compiles* before the real logic exists. Every tool starts like this on day one so every role can build against a working shape immediately. It only becomes a real problem if it's still there after that role's "done" checkpoint.

**Widgets follow the same idea** — a class, a decorator (`@Widget`), tied to one of the schemas above as its expected input, and it renders a visual card instead of raw text.

**Folder → owner, at a glance:**
| If you see a file under... | It's owned by |
|---|---|
| `src/tools/analyzer/`, `src/services/file-reader...`, `src/services/theme-extractor...` | B |
| `src/app.module.ts`, `src/main.ts`, `nitrostack.config.ts` | B |
| `src/tools/recommendation/`, `src/resources/knowledge-base...`, `src/services/groq...` | C |
| `src/tools/benchmark/`, `src/services/lighthouse-runner...`, `test/` | D |
| `widgets/` | A |
| `src/schemas/` | Shared — but B has final say on the merged shape |

---

## PART 6 — The Git Workflow (why "everyone makes a branch, then merge" breaks things)

### The problem with what you set up
Branches with each person's name/role are fine as a starting point — the missing piece is: **where do those branches merge into, and who checks them first.** Merging every role's branch straight into `main` with no review step means the first broken push instantly breaks the version that gets deployed and that judges see. There's no safety net.

### The actual structure you need
```
main       ← always demoable, judges see this, deployed from here. Nobody pushes here directly.
 └── dev   ← the shared "in progress" branch. Everyone's work lands here first.
      ├── feature/analyzer      (Role B)
      ├── feature/rule-engine   (Role C)
      ├── feature/widgets       (Role A)
      ├── feature/benchmark     (Role D)
      └── fix/whatever          (anyone, for quick bug fixes)
```
Think of it as two safety nets, not one: your own branch protects your teammates from your half-finished work; `dev` protects `main` (and the judges) from anything that isn't fully working yet.

### The actual daily loop, explained
```bash
git checkout dev
git pull origin dev              # get whatever teammates already merged
git checkout feature/<your-area>
git merge dev                    # bring those updates into your own branch
# ... do your work ...
git add .
git commit -m "feat(analyzer): extract theme tokens from tailwind config"
git push origin feature/<your-area>
# then open a Pull Request from your branch into `dev` — don't wait until it's perfect
```
**Why the PR step, not a direct merge:** a PR is just "hey, one other person, take 60 seconds and skim this before it joins everyone else's code." It's not a heavy formal review — it's a second pair of eyes catching an obviously broken schema before it blocks someone else's whole day.

### If a merge conflict happens
1. Whoever's merging resolves it — but pings whoever wrote the conflicting lines before finalizing. Never silently pick a side.
2. If it's one of the shared schema files, **Role B has the final say** on what the resolved version looks like.
3. If it's genuinely unclear, hop on a 2-minute call instead of going back and forth in chat.

### The two hard rules
- **Nobody edits inside another role's folder without a heads-up.** If C needs something new from B's data, C asks B to add it — C doesn't reach into B's files directly.
- **`main` only gets updated from `dev`, and only at the integration checkpoints** (roughly hour 4, 12–16, 32, and right before submission) — never as a constant trickle of half-done pushes.

---

## PART 7 — The Timeline, At A Glance

| Hour | What must be true by the end of it |
|---|---|
| 0–2 | Roles assigned, keynote attended, scope locked out loud |
| 2–4 | Scaffold + all schemas locked and committed — **the hardest deadline in the project** |
| 4–6 | One fake widget proven to render live in the demo client |
| 6–12 | Every role's core logic taking shape, in parallel |
| 12–16 | **First full integration** — every tool callable end to end, even with ugly/fake data. This is the earliest, clearest warning sign if something's off. |
| 16–24 | Real data replaces stub data everywhere |
| 24 | Actual rest — don't skip this |
| 24–32 | Real Groq responses, real Lighthouse numbers, widget polish |
| 32–36 | Live deploy confirmed working from a non-dev machine |
| 36–40 | Bug-killing, repeatable demo runs |
| 40–44 | **Feature freeze** — only fixes from here. Rehearse, record the backup video. |
| 44–48 | Buffer, final README, submit — not at the literal last minute |

---

## PART 8 — When Something Breaks: What To Actually Do

| It broke... | Do this |
|---|---|
| A widget doesn't render | Fall back to showing the raw tool JSON output in the demo client — check first whether the data doesn't match the schema shape the widget expects |
| A type/schema error appears anywhere | Someone's data doesn't match a schema in `src/schemas/` — find which of the two sides (producer or consumer) drifted, and remember only B changes the shared schema itself |
| Groq is slow or rate-limited | Free tier is ~30 requests/minute — stop hammering it while testing, use a cached response you saved earlier |
| Lighthouse is flaky/slow live | Cut to the backup video D recorded — this is exactly what it's for |
| You see `"Not implemented yet"` | Normal — it means that specific tool's real logic hasn't landed from that role yet, not a bug |
| A merge conflict | Resolve it, ping the original author, and if it's a schema file, B has final say |
| Deploy works locally but not live | Almost always an environment variable or a file-path assumption that only holds on your machine — check `.env` and any hardcoded local paths first |
| Someone's blocked for 15+ minutes | They post in the team channel immediately with what they're doing, what's blocking them, and what they've tried — never sit on it silently |

---

## PART 9 — What We Are Explicitly NOT Building (say no if this comes up mid-hackathon)
- No freeform code generation by the MCP server itself — it recommends and specs, it doesn't write the actual feature code
- No frameworks beyond React/Next.js
- No custom dashboard outside of the demo client's native widget rendering
- No deeper vision/DOM-based evidence pipeline (e.g. Playwright screenshots) — deferred on purpose

If a new idea shows up after hour 24, it's a "nice to have for later," not something anyone builds now — unless every "must have" is already done and there are verified spare hours.

---

## PART 10 — The One-Page Mental Model (glance at just this when you're under pressure)

1. **B reads the real project → C decides with fixed rules + explains with an LLM → A shows it live. D proves it worked and keeps everything deployed.**
2. **The rules decide. The LLM only phrases.** That's the whole defensibility story.
3. **`main` is sacred. Work happens in `dev` and feature branches. PRs, not direct merges.**
4. **Hour 4 (schemas locked) and hour 12–16 (full pipeline runs once, ugly is fine) are the two moments that matter most — if either slips, that's the team's earliest warning, not something to push past.**
5. **"Not implemented yet" is not a bug. A generic rejection reason is a bug. A confidence number that doesn't match the formula is a bug.**
