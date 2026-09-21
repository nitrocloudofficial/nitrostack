# VidyaAI — MCP Backend

The MCP server powering **VidyaAI**, an AI-powered personal study
companion. Built with [NitroStack](https://nitrostack.ai), this
service exposes a set of composable tools that let an AI agent (or
any MCP-compatible client, including ChatGPT) research topics,
generate quizzes, narrate lectures, chat with grounded context,
build study plans, and reward consistent studying — all as
independently callable, testable tools rather than one monolithic
prompt.

## What is MCP?

The Model Context Protocol is an open standard that lets an AI
model call external tools in a structured way — think of it as a
common "USB port" for AI, so any MCP-compatible client can use these
tools without custom integration work.

## Architecture

Frontend (React) ──HTTP──> MCP Server (this repo) ──> Gemini 2.0 Flash
│
└──> Supabase (persistence)


The frontend never talks to Gemini or Supabase directly — every
piece of intelligence and data access goes through this MCP server,
keeping business logic centralized and swappable.

## Modules

| Module | Purpose |
|---|---|
| `research` | Search papers, summarize abstracts (Gemini), format citations, build literature comparisons |
| `quiz` | Generate quizzes (Gemini), grade answers, track scores, award coins on completion |
| `lecture` | Generate spoken-style lecture scripts (Gemini) — narration happens client-side via the browser's Web Speech API |
| `chat` | "Vidya" — a chatbot grounded in the user's own research session context, not a generic assistant |
| `report` | Aggregates research, quiz, and lecture data into one session summary — no AI call, pure data assembly |
| `planner` | Turns exam schedules into AI-generated day-by-day roadmaps, with attached resource links and a to-do list |
| `viCoins` | Gamification layer — coin awards, streaks, Pomodoro session tracking, global leaderboard |

## Tech Stack

- **[NitroStack](https://nitrostack.ai)** (`@nitrostack/core`) — decorator-based MCP framework
- **Node.js 20.x**
- **Gemini 2.0 Flash** — all AI generation (summarization, quiz creation, lecture scripting, contextual chat)
- **Supabase** — auth-adjacent persistence (sessions, results, coins, tasks)
- **Zod** — input validation on every tool

## Project Structure

vidyaai-mcp/
├── src/
│ ├── index.ts # McpApplicationFactory bootstrap
│ ├── app.module.ts # root @Module wiring every feature module
│ ├── modules/
│ │ ├── research/
│ │ ├── quiz/
│ │ ├── lecture/
│ │ ├── chat/
│ │ ├── report/
│ │ ├── planner/
│ │ └── vicoins/
│ └── widgets/ # optional visual previews for tool results
├── package.json
└── .env


## Setup

```bash
npm install -g @nitrostack/cli
nitrostack-cli init vidyaai-mcp --template typescript-starter
cd vidyaai-mcp
npm install
```

Create a `.env` file:

GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NITRO_LOG_LEVEL=info
NITROSTACK_APP_MODE=universal
MCP_TRANSPORT_TYPE=stdio


Run locally:

```bash
npm run dev
```

## Database Schema (Supabase)

Run the schema SQL in your Supabase project's SQL editor before
testing any tool that reads/writes data — tables are **not**
auto-created:

research_sessions, papers, quiz_results, chat_history,
lecture_scripts, exam_schedules, roadmap_items, tasks,
pomodoro_sessions, user_coins


## Testing Tools

Open the project in **NitroStudio** → Tools tab → select a tool →
fill in the auto-generated input fields → **Execute Tool** →
confirm `Status: Success`.

## Deployment

Deployed via NitroCloud (App Canvas → **Deploy**). Environment
variables must be set separately in NitroCloud's app settings —
your local `.env` does not carry over automatically.

Once live, the MCP endpoint is available at:

https://<your-service-url>/mcp # Streamable HTTP (frontend use)
https://<your-service-url>/sse # Legacy SSE (ChatGPT connections)


## Connecting a Frontend

Set the deployed URL as an environment variable in your frontend:

VITE_MCP_API_URL=https://<your-service-url>/mcp


## Connecting to ChatGPT

ChatGPT → Settings → Plugins → Developer Mode → **+** → paste the
`/sse` URL → Connect. ChatGPT will load and can call every tool in
this server directly.

## Notes

- `ctx.logger` is used for all logging inside tools — `console.log`
  breaks STDIO transport and must never be used
- "Vidhyalaya" (study groups) is an intentionally out-of-scope
  feature, planned as a future roadmap item, not implemented here