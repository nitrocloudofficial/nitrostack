# ContextOS - Credentials, API Keys & Multi-User Architecture Guide

This guide answers:
1. **How Multi-User & Multi-Workspace tokens work** when different people use ContextOS.
2. **Step-by-step instructions** for where and how to obtain every API key, token, and server URL from official websites.

---

## Part 1: How Tokens Work for Multiple Users & Workspaces

In ContextOS, credentials are split into **Two Security Layers**:

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ Layer 1: SYSTEM INFRASTRUCTURE (Configured once in backend .env)       │
 │ - Shared by all users for AI processing & hosting                       │
 │ - OpenAI / Gemini API Key (LLM Intelligence Engine)                    │
 │ - Supabase Database URL & Service Role Key (Database & Multi-Tenant)    │
 │ - Whisper STT Key (Speech Transcriptions)                               │
 │ - Novu API Key (Notification Dispatcher)                                │
 │ - ChromaDB Vector Store (Vector Embeddings)                             │
 └─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ Layer 2: PER-USER / WORKSPACE OAUTH & INTEGRATION TOKENS               │
 │ - Each user or company connects THEIR OWN third-party apps              │
 │ - User A connects User A's Slack, Jira, Notion, GitHub, Calendar       │
 │ - User B connects User B's Slack, Jira, Notion, GitHub, Calendar       │
 │ - Encrypted with AES-256 in Supabase 'user_integrations' table          │
 │ - MCP Gateway dynamically loads the current user's token per workflow  │
 └─────────────────────────────────────────────────────────────────────────┘
```

### What happens when someone else uses your ContextOS app?
- They create their own account via **Supabase Auth** (Email + Password + MFA).
- When they process a meeting, the **System Keys** (OpenAI, Supabase, Whisper) perform the AI understanding.
- When they approve tasks to dispatch to Slack or Jira, ContextOS uses **their own connected Slack/Jira tokens** so tickets go to *their* company's workspace, not yours!

---

## Part 2: Step-by-Step Guide to Getting API Keys & URLs

### 1. Supabase (Database, User Auth, File Storage)
- **Where to get it**: [https://supabase.com](https://supabase.com)
- **What you get**:
  - `SUPABASE_URL`: `https://[your-project-ref].supabase.co`
  - `SUPABASE_ANON_KEY`: Public key for frontend
  - `SUPABASE_SERVICE_ROLE_KEY`: Secret key for backend FastAPI
  - `DATABASE_URL`: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- **Steps**:
  1. Sign in to Supabase and click **New Project**.
  2. Go to **Project Settings (Gear icon)** → **API**.
  3. Copy Project URL, `anon` public key, and `service_role` secret key.
  4. Go to **Project Settings** → **Database** → Copy connection string URI.

---

### 2. OpenAI / Google Gemini (LLM Intelligence Engine)
- **OpenAI Key**: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Sign in → Click **+ Create new secret key** → Copy key (`sk-proj-...`).
  - Set as `OPENAI_API_KEY`.
- **Google Gemini Key**: [https://aistudio.google.com/](https://aistudio.google.com/)
  - Click **Get API Key** → **Create API key** → Copy key (`AIzaSy...`).
  - Set as `GEMINI_API_KEY`.

---

### 3. Speech-to-Text (Whisper API)
- **Option A (OpenAI Whisper)**: Uses your `OPENAI_API_KEY` directly!
- **Option B (Groq High-Speed Whisper)**: [https://console.groq.com/keys](https://console.groq.com/keys)
  - Sign in → Click **Create API Key** → Copy key (`gsk_...`).
  - Set as `GROQ_API_KEY`.

---

### 4. Novu (Multi-Channel Notifications)
- **Where to get it**: [https://novu.co](https://novu.co)
- **Steps**:
  1. Sign up for a free cloud account.
  2. Go to **Settings** → **API Keys**.
  3. Copy **App Identifier** → `VITE_NOVU_APP_IDENTIFIER`.
  4. Copy **Secret API Key** → `NOVU_API_KEY`.

---

### 5. Slack Integration (Communication)
- **Where to get it**: [https://api.slack.com/apps](https://api.slack.com/apps)
- **Steps**:
  1. Click **Create New App** → **From scratch** → Name it `ContextOS`.
  2. Go to **OAuth & Permissions** → Under **Bot Token Scopes**, add:
     - `chat:write`, `channels:read`, `incoming-webhook`, `files:write`.
  3. Click **Install to Workspace** and authorize.
  4. Copy **Bot User OAuth Token** (`xoxb-...`) → `SLACK_BOT_TOKEN`.
  5. Under **Incoming Webhooks**, toggle ON to generate a Webhook URL → `SLACK_WEBHOOK_URL`.

---

### 6. Jira Software (Project Management)
- **Where to get it**: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- **Steps**:
  1. Log into your Atlassian account.
  2. Click **Create API token** → Label it `ContextOS` → Copy token.
  3. Set variables:
     - `JIRA_DOMAIN`: `https://yourcompany.atlassian.net`
     - `JIRA_USER_EMAIL`: `your-email@company.com`
     - `JIRA_API_TOKEN`: `[Copied Token]`

---

### 7. Notion (Documentation Hub)
- **Where to get it**: [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
- **Steps**:
  1. Click **+ New integration** → Name: `ContextOS Hub`.
  2. Copy **Internal Integration Secret** (`secret_...` or `ntn_...`) → `NOTION_API_KEY`.
  3. Open your Notion page/database → Click `...` top right → **Add connections** → Select `ContextOS Hub`.

---

### 8. GitHub (Version Control)
- **Where to get it**: [https://github.com/settings/tokens](https://github.com/settings/tokens)
- **Steps**:
  1. Click **Generate new token** (Fine-grained or classic).
  2. Grant permissions: `Issues (Read & Write)`, `Pull Requests (Read & Write)`, `Contents (Read)`.
  3. Copy token (`ghp_...`) → `GITHUB_TOKEN`.

---

### 9. Google Calendar API (Multi-Timezone Scheduling)
- **Where to get it**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
- **Steps**:
  1. Create project `ContextOS` → Go to **APIs & Services** → **Library** → Search & Enable **Google Calendar API**.
  2. Go to **Credentials** → **+ Create Credentials** → **OAuth client ID** (Web application).
  3. Authorized Redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
  4. Copy **Client ID** (`GOOGLE_CLIENT_ID`) and **Client Secret** (`GOOGLE_CLIENT_SECRET`).

---

### 10. ChromaDB Vector Memory
- **Local Persistence** (Default): Stored automatically in `./chroma_db` folder inside the backend. No external key required!

---

## Summary `.env` File Example for Backend

Create `backend/.env`:

```env
# Server & Environment
APP_NAME=ContextOS
ENVIRONMENT=development
PORT=8000
CORS_ORIGINS=["http://localhost:3000","https://contextos.vercel.app"]

# Supabase Credentials (System Level)
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...
DATABASE_URL=postgresql://postgres:password@db.xyzcompany.supabase.co:5432/postgres

# AI Engines (System Level)
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...

# Notifications Engine
NOVU_API_KEY=nv_sec_...

# Default Fallback Integration Credentials (Overridden per User)
SLACK_BOT_TOKEN=xoxb-...
JIRA_DOMAIN=https://company.atlassian.net
JIRA_USER_EMAIL=admin@company.com
JIRA_API_TOKEN=your-jira-api-token
NOTION_API_KEY=ntn_...
GITHUB_TOKEN=ghp_...
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Vector Storage
CHROMADB_PATH=./chroma_db
```
