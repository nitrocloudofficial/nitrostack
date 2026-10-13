# Invenio — Architecture

## Overview

Invenio is a multi-layer system built around a knowledge graph at its core. The architecture is designed for horizontal scalability, independent deployability of modules, and AI-first data pipelines.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│   React + Vite + TypeScript + TailwindCSS + shadcn/ui   │
│   Framer Motion                                          │
│   Port: 3000                                             │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / REST
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                           │
│   FastAPI (Python 3.11+)                                │
│   Pydantic v2 schemas                                    │
│   Uvicorn ASGI server                                    │
│   Port: 8000                                             │
└───────┬───────────────┬──────────────────┬──────────────┘
        │               │                  │
        ▼               ▼                  ▼
┌───────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Supabase  │  │     Neo4j       │  │     Redis        │
│ PostgreSQL│  │  Knowledge      │  │     Cache        │
│           │  │  Graph          │  │                  │
│ - Users   │  │  - Papers       │  │ - API responses  │
│ - Reports │  │  - Datasets     │  │ - Session data   │
│ - Tasks   │  │  - Repos        │  │ - Agent results  │
│ - Logs    │  │  - Concepts     │  │                  │
└───────────┘  │  - Relationships│  └─────────────────┘
               └─────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  NITRO LAYER (MCP)                       │
│   NitroStack AI Agent Orchestration                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Planner  │→ │ Research │  │     Datasets          │  │
│  │ (coord.) │  │  Agent   │  │     Agent             │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  Graph   │  │ Evidence │  │  Correlation          │  │
│  │  Agent   │  │  Agent   │  │  Agent                │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐                             │
│  │Hypothesis│  │ Reports  │                             │
│  │  Agent   │  │  Agent   │                             │
│  └──────────┘  └──────────┘                             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 EXTERNAL DATA SOURCES                    │
│  OpenAlex │ ArXiv │ Semantic Scholar │ PubMed           │
│  Kaggle │ HuggingFace │ Zenodo │ UCI ML Repo            │
│  GitHub API │ GitLab API │ Papers with Code             │
│  USPTO │ EPO │ Google Patents                           │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Decisions

### Frontend (React + Vite)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS with `lucide-react` icons. Premium glassmorphism UI.
- **Animations**: `framer-motion` for page transitions and micro-interactions.
- **Graphing**: `@xyflow/react` (React Flow) for DAG Workflow, `d3-force` for Knowledge Graph.
- **Performance**: `React.lazy` and `Suspense` for route-based code-splitting.

**Why Vite?** Fastest dev server in the ecosystem. Native ESM. Sub-second HMR.

**Why TypeScript?** Strict typing eliminates an entire class of runtime bugs in a large codebase.

**Why TailwindCSS?** Design system via CSS variables + utility classes. Zero runtime overhead.

**Why shadcn/ui?** Copy-paste component library — components live in the codebase, not a node_modules black box. Full control.

**Why Framer Motion?** Best-in-class animation library for React. Declarative, performant, physics-based.

### Backend: FastAPI + Python

**Why FastAPI?** Fastest Python web framework. Native async. Auto-generates OpenAPI docs. Pydantic v2 integration.

**Why Python?** Best ecosystem for AI/ML integrations. Native support for all major AI libraries.

**Why Pydantic v2?** 10-20x faster than v1. Runtime type validation. Clean schema definitions.

### Primary Database: Supabase PostgreSQL

**Why Supabase?** Managed PostgreSQL with realtime subscriptions, auth, and edge functions. Removes infrastructure complexity.

**What lives here:**
- User accounts and workspaces
- Report metadata and content
- Agent task history and logs
- Saved searches and annotations

### 3. Intelligence Layer (The Correlation Engine)

The core differentiator of Invenio (implemented in Phase 3) is the Correlation Engine. It discovers meaning beyond standard search.

### Similarity Engine
Compares entities using modular heuristic scoring:
- **Keyword Overlap (Jaccard)**
- **Author/Institution Overlap**
- **Temporal Proximity**
- **Cross-Domain Interpolation**

### Gap & Opportunity Detectors
- **Structural Gaps**: Discovered via `networkx` graph analysis (e.g., isolated high-impact papers, disconnected clusters).
- **High-Impact Opportunities**: Synthesized from detected gaps. Suggests cross-domain methodology transfers or reproducibility studies.

### Explainable Evidence
Every generated correlation, gap, or opportunity carries an `Evidence` object explaining *why* the AI generated it, pointing back to the raw source data.

## 4. Workflow Orchestration (Phase 4)

The centerpiece of Invenio is the autonomous **Workflow Engine**. It links all previous services into a deterministic Directed Acyclic Graph (DAG) pipeline.

### Components
- **Workflow State Manager**: An in-memory store in `WorkflowService` tracking live runs (no persistent DB to keep scope limited).
- **Node Implementations**: Base interface implemented by nodes like `ResearchSearchNode`, `CorrelationNode`, `GapDetectionNode`, and `SummaryNode`.
- **Copilot**: A visual, non-chat UI panel streaming real-time deterministically-generated execution logs, updating the user exactly on what the engine is processing.
- **Frontend Canvas**: Built with `React Flow`, it creates a live-animated graph of the workflow sequence.

## 5. Research Workspace & Report Studio (Phase 5)

When the automated Workflow Engine completes, it transitions the user into the **Research Workspace**.
This acts as a rich document editor (similar to Notion or Cursor Composer) where the generated intelligence is structured and editable.

### Architecture
- **Workspace Service**: Manages the generated layout of the workspace in-memory. Translates graph output into textual summaries.
- **Export Engine**: Takes the workspace session and serializes it into `Markdown`, `HTML`, or `BibTeX`.
- **Frontend Editor**: Renders the sections into editable text areas, with embedded AI reasoning, confidence scores, and icons.

## 6. Graph Database (Neo4j)

- **Research API (`/api/v1/research`)**: Semantic search, paper discovery, normalization, and ranking. (Completed Phase 2)
- **Correlation API (`/api/v1/correlation`)**: Knowledge graph generation, structural gap detection, and research opportunity synthesis via heuristic engines. (Completed Phase 3)
- **Workflow API (`/api/v1/workflow`)**: Trigger and monitor autonomous DAG research pipelines. (Completed Phase 4)
- **Workspace API (`/api/v1/workspace`)**: Generate, edit, and export rich research documents. (Completed Phase 5)

**Why Neo4j?** The world's most mature graph database. Cypher query language is the most expressive for graph traversal. Native path finding, clustering, and community detection algorithms.

**What lives here:**
- All entity nodes (papers, datasets, repos, patents, concepts, phenomena)
- All relationship edges (cites, implements, validates, inspires, contradicts)
- Relationship weights and confidence scores

### Cache: Redis

**Why Redis?** Sub-millisecond key-value lookup. Built-in TTL. Pub/Sub for realtime agent status. Queue support for async tasks.

**What lives here:**
- API response caches (external API results, 5-minute TTL)
- User session data
- Agent task queues and results
- Realtime agent status

### AI Orchestration: NitroStack MCP

**Why NitroStack?** Designed for multi-agent MCP coordination. Native tool call routing. Built-in agent state management.

**Why MCP (Model Context Protocol)?** The emerging standard for LLM tool use. Allows swapping AI providers without changing agent logic.

---

## Repository Structure

```
invenio/
├── .github/              — CI/CD workflows and PR templates
├── docs/                 — All project documentation
├── frontend/             — React application
│   └── src/
│       ├── components/   — Reusable UI components
│       │   ├── layout/   — Shell: Sidebar, TopNav, WorkspaceLayout
│       │   └── ui/       — shadcn + custom components
│       ├── pages/        — Route-level page components
│       ├── hooks/        — Custom React hooks
│       ├── store/        — Global state (Zustand, Phase 2)
│       ├── types/        — TypeScript type definitions
│       ├── constants/    — Application constants
│       └── lib/          — Utility functions
├── backend/              — FastAPI application
│   └── app/
│       ├── routers/      — Route handlers (thin layer)
│       ├── services/     — Business logic
│       ├── models/       — SQLAlchemy ORM models
│       ├── schemas/      — Pydantic request/response schemas
│       ├── core/         — Config, database, security, cache
│       └── utils/        — Shared utilities
├── nitro/                — NitroStack MCP agent workspace
│   └── agents/           — One directory per agent
├── shared/               — Cross-workspace types and constants
├── scripts/              — Dev environment bootstrap scripts
└── tests/                — Integration and e2e test suites
```

---

## Data Flow

### Research Discovery Flow (Phase 2+)

```
User enters research query
  ↓
Frontend → POST /api/v1/research/search
  ↓
FastAPI Research Router → ResearchService
  ↓
ResearchService → Check Redis cache
  ↓ (cache miss)
Nitro Research Agent → OpenAlex API, ArXiv API
  ↓
Results normalized → Supabase (persist) + Neo4j (graph nodes)
  ↓
Respon- Phase 2: Research Discovery Engine (Semantic Search, Graph Stub)
- Phase 3: Correlation Intelligence Engine (Knowledge Graph, Gap/Opportunity Detection)
- Phase 4: Workflow & Copilot Engine (Autonomous orchestrated pipeline)
- Phase 5: Research Workspace & Report Studio (Editable synthesis and export)
- Phase 6: Premium UI & Demo Mode (Polish, Performance, One-Click pipeline)ew entity
  ↓
Correlation Agent → Find similar entities via embedding search
  ↓
Hypothesis Agent → Score and rank novel connections
  ↓
Evidence Agent → Gather supporting evidence for top hypotheses
  ↓
Results stored in Neo4j + surfaced in frontend Knowledge Graph
```

---

## Security Architecture (Phase 3)

- **Authentication**: Supabase Auth (OAuth + email/password)
- **Authorization**: Row-Level Security (RLS) in Supabase
- **API Security**: JWT tokens + FastAPI dependency injection
- **Secrets**: Environment variables + Supabase vault
- **Network**: All services behind HTTPS/TLS in production

---

## Scalability Considerations

- **Frontend**: Static deploy to Vercel/Cloudflare Pages
- **Backend**: Containerized FastAPI → Kubernetes or Railway
- **Neo4j**: Neo4j AuraDB managed cloud or self-hosted cluster
- **Redis**: Redis Cloud managed instance
- **Supabase**: Managed, auto-scales to 500k MAU on Pro plan
- **Nitro**: Stateless agents → horizontally scalable
