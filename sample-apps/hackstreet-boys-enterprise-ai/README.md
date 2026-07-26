# 🚀 Enterprise AI Knowledge Platform — MCP Server

> **Team:** Hackstreet Boys &nbsp;|&nbsp; **Domain:** Enterprise AI &nbsp;|&nbsp; **Hackathon:** NitroStack Hackathon

---

## 📌 What This MCP Does

The **Enterprise AI Knowledge Platform** is a production-ready MCP (Model Context Protocol) server that enables employees to interact with all company knowledge using natural language — no manual tool selection required.

Ask questions like:
- _"What is our leave policy?"_
- _"Who owns Project Atlas?"_
- _"Summarize yesterday's meetings."_
- _"Create a Jira ticket for the payment bug."_
- _"Show incidents from last month."_
- _"Search Slack for #devops messages."_

The AI orchestrator **automatically detects intent and calls the right MCP tools** — no user intervention needed.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)               │
│  Streaming Chat UI · Dark Mode · Tool Execution Cards   │
└───────────────────────┬────────────────────────────────┘
                        │ REST / SSE
┌───────────────────────▼────────────────────────────────┐
│              Backend (FastAPI + FastMCP)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ AI Orchestr. │  │  MCP Tools   │  │  Auth (JWT)  │  │
│  │  (LangChain) │  │  (FastMCP)   │  │  RBAC        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                              │
│  ┌──────▼─────────────────▼───────────────────────────┐ │
│  │           Infrastructure Layer                      │ │
│  │  PostgreSQL · Redis · FAISS · Celery Workers        │ │
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Clean Architecture layers:**
- **Presentation** — FastAPI routes, Next.js UI
- **Application** — AI Orchestrator, use cases
- **Domain** — Entities, business logic
- **Infrastructure** — DB, vector store, connectors, workers

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, FastMCP, Pydantic v2 |
| **ORM / DB** | SQLAlchemy, Alembic, PostgreSQL |
| **Caching / Queue** | Redis, Celery |
| **Vector Search** | FAISS / ChromaDB |
| **AI** | OpenAI GPT-4 (Gemini-compatible via abstraction) |
| **Frontend** | Next.js 15, React, TailwindCSS, Shadcn UI |
| **Auth** | JWT + Refresh Tokens + RBAC |
| **Deployment** | Docker, Docker Compose, Nginx |
| **CI/CD** | GitHub Actions |
| **Observability** | Prometheus, OpenTelemetry |

---

## 🔧 MCP Tools

| Tool | Description |
|------|-------------|
| `search_documents(query)` | Semantic FAISS vector search over company docs |
| `find_policy(policy_name)` | Fetch HR/company policy by name |
| `summarize_meeting(date)` | Summarize meeting notes for a given date |
| `lookup_employee(name)` | Look up employee info and org hierarchy |
| `find_owner(project_name)` | Find who owns a given project |
| `create_ticket(title, desc, priority)` | Create a Jira ticket |
| `search_incidents(month)` | Retrieve incidents for a given month |
| `search_slack(query)` | Search internal Slack messages |
| `search_notion(query)` | Search Notion pages |
| `list_projects()` | List all active company projects |
| `upload_document()` | Upload & index a new document |
| `delete_document()` | Remove a document from the index |
| `reindex_documents()` | Trigger full re-indexing |
| `conversation_history()` | Retrieve past conversation context |
| `tool_execution_history()` | View tool call audit trail |

---

## 🚀 How to Run

### Prerequisites
- Docker & Docker Compose
- OpenAI API Key (or Gemini-compatible endpoint)

### 1. Clone & configure environment

```bash
git clone https://github.com/surya-8143/nitrostack
cd nitrostack/sample-apps/hackstreet-boys-enterprise-ai
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Start all services with Docker Compose

```bash
docker-compose up --build
```

This spins up:
- 🐍 **FastAPI backend** on http://localhost:8000
- ⚛️  **Next.js frontend** on http://localhost:3000
- 🐘 **PostgreSQL** on port 5432
- 🔴 **Redis** on port 6379
- 🧠 **ChromaDB** vector store on port 8001
- 🌐 **Nginx** reverse proxy on port 80

### 3. Access the app

| Service | URL |
|---------|-----|
| Frontend Chat UI | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

### 4. Run without Docker (development)

```bash
# Backend
cd enterprise-mcp/backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd enterprise-mcp/frontend
npm install
npm run dev
```

---

## 🔐 Authentication & Roles

JWT-based login with RBAC. Example roles:

| Role | Permissions |
|------|------------|
| `admin` | Full access to all tools and admin panel |
| `hr` | Policies, employees, meetings |
| `engineering` | Documents, incidents, tickets, projects |
| `manager` | All read access + ticket creation |
| `employee` | Chat + read-only access |

Default test credentials (dev mode):
- **Admin:** `admin@company.com` / `admin123`
- **Employee:** `employee@company.com` / `emp123`

---

## 📁 Project Structure

```
hackstreet-boys-enterprise-ai/
├── enterprise-mcp/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/          # FastAPI route handlers
│   │   │   ├── core/         # Config, logging, security
│   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   ├── schemas/      # Pydantic v2 schemas
│   │   │   ├── repositories/ # Data access layer
│   │   │   ├── services/     # Business logic
│   │   │   ├── mcp/          # FastMCP tools & server
│   │   │   ├── vectorstore/  # FAISS embedding & search
│   │   │   ├── workers/      # Celery background tasks
│   │   │   ├── middleware/   # Auth, rate limit, CORS
│   │   │   ├── auth/         # JWT, RBAC
│   │   │   ├── connectors/   # Jira, Slack, Notion, GDrive
│   │   │   └── prompts/      # AI system prompts
│   │   ├── alembic/          # DB migrations
│   │   ├── tests/            # Pytest test suite
│   │   └── requirements.txt
│   ├── frontend/
│   │   └── app/              # Next.js 15 App Router
│   └── docker-compose.yml
├── README.md
└── .env.example
```

---

## 🧪 Running Tests

```bash
cd enterprise-mcp/backend
pytest tests/ -v --cov=app
```

Tests cover:
- ✅ Authentication & RBAC
- ✅ All MCP tool endpoints
- ✅ Vector search pipeline
- ✅ API routes (chat, upload, documents)
- ✅ Integration tests

---

## 🌐 Enterprise Connectors

All connectors are pluggable via dependency injection:

| Connector | Status |
|-----------|--------|
| Jira | ✅ Implemented |
| Slack | ✅ Implemented |
| Notion | ✅ Implemented |
| Google Drive | 🔧 Interface ready |
| SharePoint | 🔧 Interface ready |
| Confluence | 🔧 Interface ready |
| GitHub | 🔧 Interface ready |
| Microsoft Teams | 🔧 Interface ready |

---

## 👥 Team

**Hackstreet Boys** — Enterprise AI Domain

Built for the **NitroStack Hackathon** 🏆

---

## 📄 License

MIT License — see [LICENSE](../../LICENSE)
