# Enterprise AI Copilot

An MCP (Model Context Protocol) server that connects GitHub, Google Drive, Gmail, Google Calendar, and Jira into one AI-accessible toolset — plus a web dashboard with live data panels, direct-action forms, and an AI chat assistant.

## What this project does

Ask natural-language questions or take actions across five connected services, all through one interface:

- **GitHub** — read recent commits
- **Google Drive** — search files
- **Gmail** — search and send email
- **Google Calendar** — check availability, list events, create events
- **Jira** — create/assign/prioritize tasks, monitor deadlines, detect blockers, sprint summaries, generate reports, create projects

A "Knowledge" tool combines GitHub + Drive + Gmail + Jira + Calendar into a single cross-source project update — ask "what's happening with Project X" and get one combined answer instead of five separate lookups.

## Architecture

```
┌─────────────────────────┐
│   NitroStudio / Claude    │  ← AI chat clients (talk to the MCP server directly)
│   (Custom Connector)      │
└────────────┬──────────────┘
             │ MCP protocol (stdio or HTTP)
┌────────────▼──────────────┐
│   NitroStack MCP Server    │  ← src/app.module.ts + src/modules/*
│   (this repo, port 3000)   │     Tools: Jira, Gmail, Drive, Calendar,
└────────────┬──────────────┘     GitHub, Knowledge orchestration
             │ MCP client bridge (StreamableHTTPClientTransport)
┌────────────▼──────────────┐
│   Dashboard Server         │  ← dashboard-server.js (port 4000)
│   (Express + MCP client)   │     REST API + direct action endpoints
└────────────┬──────────────┘     + Groq-powered chat (optional)
             │
┌────────────▼──────────────┐
│   Dashboard UI              │  ← dashboard/index.html
│   Data panels + action forms│     Served as static files by the above
└─────────────────────────────┘
```

Two independent ways to talk to the same tools:
1. **Dashboard** (`localhost:4000`) — data panels, reliable no-AI action forms, optional chat
2. **AI clients** (NitroStudio, Claude via Custom Connector, ChatGPT via Developer Mode) — connect directly to the MCP server's `/mcp` endpoint

## Setup

### Prerequisites
- Node.js 20+, npm 9+
- Git

### 1. Clone and install

```bash
git clone https://github.com/KAZIYAKI/Hackathon26.git
cd Hackathon26
npm install
```

### 2. Configure credentials

```bash
copy .env.example .env
```

Fill in `.env` with your own credentials — **none of these are included in this repo**:

| Variable | Where to get it |
|---|---|
| `GITHUB_TOKEN` | github.com/settings/tokens — classic token, `public_repo` scope |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | console.cloud.google.com → OAuth Desktop app credentials |
| `GOOGLE_REFRESH_TOKEN` | Run `node get-google-token.js` after setting the above two, follow the printed URL |
| `JIRA_BASE_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN` | id.atlassian.com/manage-profile/security/api-tokens |
| `GROQ_API_KEY` | console.groq.com/keys (only needed for the dashboard's AI chat feature) |

Required Google OAuth scopes: `drive.readonly`, `gmail.readonly`, `gmail.send`, `calendar`.

### 3. Run the MCP server

```bash
npm run dev
```

Connects over STDIO by default (for NitroStudio). For HTTP access (dashboard, remote AI clients), set in `.env`:
```
MCP_TRANSPORT_TYPE=dual
PORT=3000
```
then use `npm run build && npm start` for a stable HTTP+STDIO server at `http://localhost:3000/mcp`.

### 4. Run the dashboard (optional, separate terminal)

```bash
node dashboard-server.js
```

Open `http://localhost:4000`.

### 5. Connect an AI client (optional)

- **NitroStudio**: Add/Manage Projects → point to this folder
- **Claude (Pro/Max/Team/Enterprise)**: expose port 3000 publicly (e.g. via `ngrok http 3000`), then Settings → Connectors → Add custom connector → URL = `https://your-ngrok-url/mcp`
- **ChatGPT (Plus/Pro)**: set `NITROSTACK_APP_MODE=openai` in `.env`, expose via ngrok, register in ChatGPT Settings → Apps → Developer Mode, URL = `https://your-ngrok-url/sse`

## Security

### Credentials are not committed
`.env` is git-ignored. Only `.env.example` (blank template) is in this repo. Anyone running this project must supply their own credentials for every service.

### Single-user by design
Every tool call runs under **one** set of credentials (whoever's tokens are in `.env`) — not per-user. This is appropriate for a personal assistant or team tool run by one operator, but is **not** multi-tenant. Two different people running the same server both act as the same underlying Google/Jira/GitHub account. Production multi-user support would require per-user OAuth flows and a database of user→token mappings — noted here as a deliberate scope decision, not an oversight.

### Token rotation
If you ever paste your `.env` contents somewhere (chat, screenshot, shared terminal), treat every value in it as compromised and rotate immediately:
- GitHub: github.com/settings/tokens → revoke, generate new
- Google: Cloud Console → Credentials → rotate client secret; re-run `get-google-token.js` for a fresh refresh token
- Jira: id.atlassian.com/manage-profile/security/api-tokens → revoke, generate new

### Debug tools
`jira.tools.ts` may contain debug-only tools (`debug_get_project`, `debug_get_issue`, `debug_get_transitions`, `debug_list_project_types`) used during development. Remove these before any public-facing deployment — they expose internal API shapes and aren't meant for end users.

### Dashboard action endpoints
The dashboard's `/api/action/*` routes call MCP tools directly with no authentication layer. This is fine for local/single-user use. Before deploying the dashboard publicly, add an authentication check (API key header, session auth, etc.) so arbitrary internet visitors can't send emails or create Jira issues through your account.

### AI chat reliability
Free-tier LLMs (tested: Groq's `llama-3.3-70b-versatile`) can hallucinate tool success without actually calling the tool — confirmed during testing when an email was reported "sent" but never appeared in the Sent folder. The dashboard's **action forms** call tools directly with no AI interpretation and are the reliable path for anything where correctness matters (sending real emails, creating real tickets). Treat AI chat responses claiming an action succeeded as unverified until checked in the underlying service.
