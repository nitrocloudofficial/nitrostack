# Meeting Supervisor — NitroStack MCP Server

Rebuilt on [NitroStack](https://github.com/nitrocloudofficial/nitrostack) — the
decorator-based TypeScript framework for MCP servers — per the hackathon's stack
requirement. This replaces the earlier Next.js + FastAPI scaffold: there is no
separate REST backend or frontend app here. Meeting Supervisor is **one MCP
server** whose tools an AI client (Claude, ChatGPT, NitroStudio, or your own
agent) calls directly, with React **widgets** rendering the dashboards inline.

## Architecture

```
src/
├── modules/
│   ├── meetings/     list/create/complete meetings           (plan.md 3.A.3, 5.Phase1)
│   ├── tasks/         create/accept/deny/complete tasks        (plan.md 3.A.4)
│   ├── calendar/     Google OAuth2 + sync                     (plan.md 3.A.2)
│   ├── brain/         vector store + external search           (plan.md 3.A.1)
│   └── agents/        Supervisor / Summarizer / Review /
│                       Task Analyzer                            (plan.md 3.B)
├── services/
│   └── database.service.ts   Supabase client, injected everywhere
├── guards/
│   └── jwt.guard.ts           protects write tools
├── widgets/
│   ├── app/meeting-dashboard/page.tsx
│   ├── app/task-board/page.tsx
│   └── widget-manifest.json
├── app.module.ts
└── index.ts
```

Each module follows the same three files: `*.service.ts` (business logic +
Supabase access), `*.tools.ts` (thin `@Tool`-decorated methods an AI client
calls), `*.module.ts` (wiring). This mirrors NitroStack's own file structure
convention exactly, so `nitrostack generate` and the CLI's expectations still
work if you extend it.

## What's real vs. stubbed

**Working now (once `.env` and Supabase are set up):**
- `meetings` module — full CRUD against Supabase, matching `database/schema.sql`
- `tasks` module — create, accept/deny (with required reason), complete
- `calendar` module — OAuth2 URL generation and code exchange (needs Google credentials)
- Both dashboards render as real NitroStack **widgets** (`@Widget('meeting-dashboard')`,
  `@Widget('task-board')`) — open the project in NitroStudio to see them live

**Stubbed, each with a `TODO(Phase N)` pointing at what plan.md called for:**
- `brain.service.ts` — vector embed/query (Chroma or Pinecone) and Tavily search
- `agents.service.ts` — all four agents' actual LLM calls (Supervisor,
  Summarizer, Review, Task Analyzer). The Multi-Model Hub routing
  (`MODEL_TRANSCRIPTION_CLEANUP`, `MODEL_LONG_CONTEXT_ANALYSIS`,
  `MODEL_TASK_ANALYSIS` in `.env.example`) is read but not yet called.
- Whisper + Pyannote transcription/diarization aren't wired at all yet —
  `complete_meeting` accepts a transcript as a plain string input for now,
  so you can test the rest of the pipeline without audio infra.

Same reasoning as before: the ML/infra pieces need real API keys, GPUs, or
accounts I can't provision here. Everything around them — the module
structure, tool contracts, auth, data model, widgets — is real and runs.

## Running it

**Prerequisites:** Node.js ≥ 20.18, npm ≥ 9, and the NitroStack CLI.

```bash
npm install -g @nitrostack/cli   # if you don't have it
npm install                       # installs @nitrostack/core, zod, supabase-js, etc.
cp .env.example .env              # fill in Supabase + Google + model keys as you get them
npm run dev                       # nitrostack dev — starts the MCP server
```

Then open the project folder in **NitroStudio** (https://nitrostack.ai/studio)
to call tools directly, inspect payloads, and preview the `meeting-dashboard`
and `task-board` widgets without hooking up a separate client.

**Database:** create a Supabase project, run `database/schema.sql` in the SQL
editor — same schema as before (Users, Meetings, Tasks, participants).

## Roadmap (from plan.md, Section 5)

- [x] **Phase 1 — Foundation:** module structure, schema, calendar OAuth shape, dashboard widgets
- [ ] **Phase 2 — Meeting Engine:** audio capture tool, Whisper + Pyannote in a new `transcription` service, `brain.embedAndStore`, `agents.extractKeynotes`
- [ ] **Phase 3 — Task & Agent Workflow:** `agents.analyzeTask` real LLM call wired into `create_task`, real-time notifications on `decide_task`, Multi-Model Hub settings tool
- [ ] **Phase 4 — Refinement:** `meetings.markMissed` → auto-reschedule logic, `brain.searchWeb` via Tavily, end-to-end agent testing

## Notes for the team

- All write tools (`create_meeting`, `decide_task`, `sync_calendar`, etc.) sit
  behind `@UseGuards(JWTGuard)` — you'll need a valid JWT (`JWT_SECRET` in
  `.env`) to call them from a client that isn't NitroStudio's dev bypass.
- The two widgets are intentionally minimal inline-styled components so
  they're easy to restyle — NitroStack's widget SDK
  (`@nitrostack/widgets`, `withToolData`) can replace the manual
  `postMessage` listener once you're ready to lean on it.
- `agents.module.ts` imports `brain.module.ts` because the Supervisor Agent
  needs Brain context to suggest meeting slots — that's the one
  cross-module dependency so far.
