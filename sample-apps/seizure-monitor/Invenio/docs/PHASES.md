# Invenio — Development Phases

## Roadmap Summary

| Phase | Name | Focus | Status |
|---|---|---|---|
| 1 | Foundation | Architecture, skeleton, documentation | ✅ Complete |
| 2 | Data Layer | API integrations, database, indexing | 🔲 Planned |
| 3 | Knowledge Graph | Neo4j construction, entity linking | 🔲 Planned |
| 4 | AI Agents | Nitro MCP implementation, correlation | 🔲 Planned |
| 5 | Discovery | Hypothesis generation, evidence chains | 🔲 Planned |
| 6 | Collaboration | Multi-user workspaces, sharing | 🔲 Planned |
| 7 | Publication | Reports, citations, export | 🔲 Planned |

---

## Phase 1 — Foundation (Current)

**Goal:** Create a production-ready project foundation. No intelligence, no AI, no search, no graph.

**Deliverables:**
- Complete repository structure
- React frontend with 9 professional placeholder pages
- FastAPI backend skeleton with all modules stubbed
- Nitro workspace with 9 agent module placeholders
- Shared types, constants, and helpers
- Full documentation suite
- CI/CD workflow stubs
- Dev environment bootstrap scripts

**Definition of Done:**
- Frontend builds with zero TypeScript errors
- Backend imports cleanly (no missing modules)
- All 9 pages render with professional layouts
- All documentation files are fully written

---

## Phase 2 — Data Layer

**Goal:** Connect Invenio to real data sources and populate the knowledge graph with initial entities.

**Frontend Tasks:**
- Implement Research page with functional search
- Implement Datasets browser with pagination and filters
- Implement Repositories browser
- Add TanStack Query for server state management
- Add global command palette (⌘K)
- Add Zustand stores for layout and workspace state

**Backend Tasks:**
- Connect Supabase PostgreSQL (SQLAlchemy + asyncpg)
- Implement `ResearchService` with OpenAlex integration
- Implement `DatasetService` with Kaggle + HuggingFace integration
- Implement `RepositoryService` with GitHub API integration
- Implement Redis caching layer
- Add authentication endpoints (Supabase Auth)
- Deploy all CRUD endpoints

**Nitro Tasks:**
- Implement Research agent (OpenAlex, ArXiv, Semantic Scholar)
- Implement Datasets agent (Kaggle, HuggingFace, Zenodo)
- Implement Repositories agent (GitHub API, Papers with Code)
- Deploy NitroStack MCP servers

**Infrastructure:**
- Supabase project setup and schema migration
- Redis instance setup
- Deploy backend to Railway or Render
- Configure GitHub Actions CI

---

## Phase 3 — Knowledge Graph

**Goal:** Build the Neo4j knowledge graph from indexed entities and surface it in the frontend.

**Frontend Tasks:**
- Implement Knowledge Graph page (D3.js or Cytoscape.js)
- Implement Evidence page
- Add entity inspector panel
- Add graph filter and layout controls

**Backend Tasks:**
- Implement Graph router and GraphService (Neo4j)
- Implement Evidence router and EvidenceService
- Add entity relationship creation on indexing
- Add path-finding endpoints

**Nitro Tasks:**
- Implement Knowledge Graph agent (Neo4j construction)
- Implement Evidence agent (extraction and scoring)
- Add embedding generation for semantic similarity

**Infrastructure:**
- Neo4j AuraDB setup
- Graph schema and constraint definitions
- Entity deduplication pipeline

---

## Phase 4 — AI Agents & Correlation

**Goal:** Activate the full Nitro multi-agent system for cross-domain correlation discovery.

**Frontend Tasks:**
- Implement Nitro agent activity panel in Dashboard
- Add real-time agent status indicators
- Add correlation browser

**Backend Tasks:**
- Add agent task management endpoints
- Add WebSocket support for real-time updates
- Implement correlation scoring models

**Nitro Tasks:**
- Implement Planner agent (orchestrator)
- Implement Correlation agent (cross-domain discovery)
- Implement Hypothesis agent (generation and scoring)
- Add full MCP tool call definitions

---

## Phase 5 — Discovery & Hypothesis

**Goal:** Surface AI-generated hypotheses and research opportunities.

**Deliverables:**
- Hypothesis browser and detail view
- Cross-domain opportunity feed
- Saved research threads
- Evidence-linked hypothesis validation

---

## Phase 6 — Collaboration

**Goal:** Multi-user research workspaces.

**Deliverables:**
- Team workspaces (Supabase RLS)
- Shared research threads
- Comment and annotation system
- Role-based access control

---

## Phase 7 — Publication

**Goal:** Full research report generation and export.

**Deliverables:**
- Fully functional Reports page
- Nitro Reports agent with Markdown generation
- PDF and DOCX export
- LaTeX citation format support
- Public report sharing links
