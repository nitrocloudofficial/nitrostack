# Placement Control Tower

An agentic AI placement guide with accounts, saved progress, and a proper
multi-page flow. Sign up, tell it your target role, and work through five
specialist agents one page at a time — close the tab and come back later,
it resumes exactly where you left off.

## Pages

| Route | What it is |
|---|---|
| `/` | Public landing page |
| `/signup`, `/login` | Account creation / sign-in |
| `/dashboard` | Intake form (first visit) or progress overview + "Continue" (returning users) |
| `/pipeline/<agentId>` | One page per agent — runs the station, shows the result, `Next` advances |
| `/interview` | Standalone multi-turn mock interview |

All of `/dashboard`, `/pipeline/*`, and `/interview` are behind login,
enforced in `middleware.ts` (page requests redirect to `/login`, API
requests get a 401).

## The 5-agent pipeline

| # | Agent | Produces |
|---|-------|----------|
| 1 | **Path Architect** | Skill stack + certifications (marks what you already have if a resume's attached) |
| 2 | **Chronos Master** | Day-by-day / phase-by-phase study timetable |
| 3 | **Portfolio Builder** | 3 leveled projects + a competition/hackathon timeline |
| 4 | **Resume Engineer** | Section weightage, X-Y-Z bullets, resume/JD gap analysis |
| 5 | **Pipeline Scout** | Where to apply, cadence, cold-outreach + LinkedIn templates |

Each agent is a role/goal/backstory + task prompt sent to **Gemini**
(`lib/agents.ts` + `lib/gemini.ts`). `/pipeline/[agentId]/page.tsx` runs the
current station on load (if not already saved), persists the result, and
only unlocks the next station once the current one is done — no skipping
ahead by editing the URL, that's enforced server-side too.

## Accounts & persistence

- **Auth**: email + password, hashed with `bcryptjs`, session held in an
  httpOnly JWT cookie (`jose`, `lib/auth.ts` / `lib/auth-edge.ts`).
  `middleware.ts` gates every protected page and API route.
- **Storage**: `lib/db.ts` is a small JSON-file store at `data/db.json`
  (git-ignored) holding users and each user's pipeline progress
  (`profile`, `currentStep`, `outputs`). Zero native dependencies, so it
  installs anywhere — but it's a **local/dev-only** store. The filesystem
  resets between requests on serverless hosts (Vercel, etc.), so before
  deploying anywhere stateless, swap `lib/db.ts` for Postgres/Supabase —
  every function in that file is small and isolated specifically so that
  swap only touches one file.
- Saving the intake form again always resets progress to station 1 — agent
  outputs are only valid for the profile that produced them.

## Resume gap analysis

Upload a PDF on the dashboard (optional) → parsed server-side
(`app/api/resume-parse`, `pdf-parse` v2) → extracted text saved into the
profile and fed into Path Architect (skip what you have) and Resume
Engineer (the real gap analysis: match %, ranked gaps, keep-as-is, and
specific edits to your *existing* resume text).

## Mock interview (`/interview`)

The one genuinely multi-turn piece — not part of the saved pipeline
progress. `lib/interview.ts` calls Gemini with a strict `responseSchema`
so every turn reliably returns a score, feedback, a STAR check in
behavioral mode, and the next question. Capped at 5 core questions,
enforced server-side.

## Setup

```bash
npm install
cp .env.example .env.local
# then fill in .env.local:
#   GEMINI_API_KEY     — https://aistudio.google.com/apikey
#   SESSION_SECRET      — any long random string (e.g. `openssl rand -hex 32`)
npm run dev
```

Open http://localhost:3000, sign up, and go.

## Switching models

`lib/gemini.ts` exports `GEMINI_MODEL`, currently `gemini-2.5-flash`. One
constant, used everywhere — bump it to `gemini-2.5-pro` for higher quality
at higher latency/cost.

## Extending it

- **Real database**: swap `lib/db.ts` for Postgres/Supabase before any
  serverless deployment (see above).
- **Mock interview → pipeline feedback loop**: pass `weakTopics` from
  `/interview` into the saved profile so Chronos Master's timetable can
  react to interview performance.
- **Password reset / email verification**: not implemented — this is a
  minimal credentials system, not a production auth stack. Consider
  NextAuth/Auth.js if you need those flows.
- **Swap orchestration frameworks**: the five agent definitions in
  `lib/agents.ts` map 1:1 onto CrewAI `Agent`/`Task` objects if you'd
  rather run the backend in Python.
