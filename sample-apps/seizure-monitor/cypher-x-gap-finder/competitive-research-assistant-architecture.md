# AI-Powered Competitive Research Assistant — System Architecture

### NitroStack × Amrita University Hackathon
**Prepared by:** Principal Software Architect (AI Platforms, SaaS, Distributed Systems)
**Scope:** Architecture-only document. No code, no pseudo-code, no implementation.

---

## 1. Executive Summary

Founders routinely burn 10–20 hours per idea manually searching Google, Product Hunt, GitHub, Crunchbase, and Reddit to understand who else is building what they're building. This is a **research aggregation and synthesis problem**, not a search problem — the value isn't in finding sources, it's in reading them, structuring them, and reasoning over them at scale.

This document architects a system that takes a plain-language product idea, autonomously researches the competitive landscape across multiple sources, extracts structured facts about each competitor, compares them against the user's idea using an LLM reasoning layer, and outputs a scored gap-analysis report — in minutes instead of hours.

The core architectural bet is **separation of orchestration from execution**: every meaningful unit of business logic (idea parsing, competitor discovery, extraction, comparison, scoring, report generation) is designed as an independently callable **service-layer function**, not entangled in HTTP controllers. This is what allows Phase 1 to ship as a normal web app in a hackathon timebox, while making a Phase 2 migration to NitroStack MCP tools a matter of wrapping existing functions — not rewriting them.

---

## 2. Functional Requirements

**Core (MVP-critical)**
- FR1: User submits a free-text startup/product idea.
- FR2: System uses an LLM to parse idea into structured intent (category, target user, core value prop, keywords).
- FR3: System discovers candidate competitors via web/search APIs, GitHub, and product directories.
- FR4: System extracts structured competitor data (name, description, features, pricing signal, positioning) from raw web content.
- FR5: System compares extracted competitor data against the user's idea (feature overlap, differentiation).
- FR6: System performs gap analysis — features/segments no competitor covers well.
- FR7: System recommends differentiating features, ranked by impact/effort.
- FR8: System computes an "Innovation Score" for the idea relative to the landscape.
- FR9: System generates a structured, exportable research report.
- FR10: User authentication and account management.
- FR11: Search/query history persisted per user.
- FR12: Saved projects (an idea + its research artifacts, revisitable).

**Secondary (post-MVP)**
- FR13: Re-run/refresh research on a saved project (delta detection).
- FR14: Competitor tracking over time (change alerts).
- FR15: Collaborative projects (multi-user, team accounts).
- FR16: Export to PDF/Notion/Slides.
- FR17: MCP tool exposure of the research pipeline for agentic consumption.

---

## 3. Non-Functional Requirements

| Category | Requirement | Why it matters |
|---|---|---|
| Latency | Idea → first partial results in <5s; full report in <60–90s | Research is inherently multi-step; users tolerate a *progressive* wait, not a blind one |
| Scalability | Stateless compute layer, horizontally scalable | Hackathon judging + potential post-hackathon traffic spikes |
| Reliability | Graceful degradation if a source/LLM call fails | One dead search provider shouldn't kill the whole report |
| Cost control | Bounded LLM token spend per research run | LLM calls are the dominant cost driver; must be capped and cached |
| Extensibility | New data sources pluggable without core rewrite | Competitor discovery sources will grow over time |
| Auditability | Every AI-derived claim traceable to a source URL | Trust — founders won't act on unattributed claims |
| Portability | Business logic decoupled from transport (HTTP vs MCP) | Explicit hackathon requirement for future MCP exposure |
| Data freshness | Cached research has visible "as of" timestamps | Competitive landscapes shift; stale data must be labeled, not hidden |

---

## 4. User Personas

**1. Solo Founder (Priya)** — Pre-seed, technical, validating an idea before building. Wants speed and brutal honesty about whether the space is crowded.

**2. Hackathon/Student Builder (Arjun)** — Building a project for a hackathon or class, needs to justify novelty to judges. Wants a clean report he can screenshot/cite.

**3. Product Manager at a Startup (Meera)** — Evaluating a new feature line inside an existing company. Wants structured competitor feature matrices, not prose.

**4. VC Analyst / Accelerator Mentor (Rahul)** — Screening many ideas quickly. Wants the Innovation Score and gap summary as a fast triage signal, not deep detail.

---

## 5. User Journey

1. **Landing** → user signs up/logs in.
2. **Idea Submission** → user types idea in natural language (optionally adds constraints: industry, geography, B2B/B2C).
3. **Clarification (optional)** → system may ask 1–2 clarifying questions if the idea is ambiguous (improves discovery precision).
4. **Live Research Progress** → UI streams stage-by-stage progress: "Understanding idea → Searching competitors → Extracting features → Comparing → Scoring → Generating report." This is critical UX: a 60–90s wait feels broken without visible progress.
5. **Report View** → structured dashboard: competitor list, feature comparison matrix, gap map, recommended differentiators, Innovation Score with justification.
6. **Save Project** → report + inputs persisted; appears in dashboard history.
7. **Revisit/Re-run** → user reopens a saved project, optionally refreshes research.
8. **Export/Share** → user downloads or shares the report.

---

## 6. High-Level Architecture

The system is layered so that **no layer directly depends on how it's invoked**:

```
Client (Web UI)
   │  HTTP/REST + SSE (streaming progress)
   ▼
API Layer (transport-only: auth, validation, request shaping)
   ▼
Orchestration Layer (Research Pipeline Orchestrator)
   ▼
Service Layer (pure business logic — idea parsing, discovery, extraction,
   comparison, gap analysis, scoring, report generation)
   ▼
Integration Layer (LLM provider, Search APIs, GitHub API, Web scraping/fetch)
   ▼
Data Layer (Relational DB, Cache, Object storage for raw artifacts)
```

**Why this shape:** The Service Layer is intentionally the "brain" and is transport-agnostic — it has no knowledge of HTTP, sessions, or request/response objects. This is the single most important decision for the MCP-compatibility requirement (see Section 23): an MCP tool call and an HTTP controller call will both simply invoke the same service functions with plain arguments and get plain structured returns.

---

## 7. System Architecture Diagram (Text)

```
                              ┌─────────────────────────┐
                              │        Web Client        │
                              │  (React/Next.js SPA)     │
                              └────────────┬─────────────┘
                                           │ REST + SSE/WebSocket
                              ┌────────────▼─────────────┐
                              │        API Gateway        │
                              │  Auth │ Rate Limit │       │
                              │  Validation │ Routing      │
                              └────────────┬─────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
          ┌─────────▼─────────┐ ┌──────────▼──────────┐ ┌─────────▼─────────┐
          │   Auth Service     │ │  Research            │ │  Project/History   │
          │  (users, sessions) │ │  Orchestrator         │ │  Service            │
          └─────────┬─────────┘ │  (pipeline state       │ └─────────┬─────────┘
                    │            │   machine)             │           │
                    │            └──────────┬────────────┘           │
                    │                       │                        │
                    │        ┌──────────────┼──────────────┐         │
                    │        │              │              │         │
              ┌─────▼───┐ ┌─▼──────────┐ ┌─▼───────────┐ ┌▼──────────────┐
              │ Idea     │ │ Discovery  │ │ Extraction  │ │ Comparison &   │
              │ Understanding│ Service │ │ Service     │ │ Scoring Service│
              │ Service  │ │ (search    │ │ (structured │ │ (gap analysis, │
              │ (LLM)    │ │ providers, │ │ data from   │ │ innovation     │
              │          │ │ GitHub API)│ │ raw pages,  │ │ score)         │
              │          │ │            │ │ LLM-assisted│ │                │
              └─────┬────┘ └─────┬──────┘ └──────┬──────┘ └────────┬───────┘
                    │            │               │                 │
                    └────────────┴───────┬───────┴─────────────────┘
                                          │
                              ┌───────────▼────────────┐
                              │   Report Generation      │
                              │   Service                │
                              └───────────┬────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
┌───────▼────────┐               ┌────────▼────────┐              ┌─────────▼────────┐
│  Relational DB   │               │  Cache Layer     │              │  Object Storage    │
│  (Postgres)      │               │  (Redis)         │              │  (raw HTML/JSON     │
│  users, projects, │               │  search results, │              │  snapshots, reports)│
│  reports, history │               │  LLM responses    │              │                    │
└──────────────────┘               └──────────────────┘              └────────────────────┘

        External Integrations (called from Discovery/Extraction/Idea services):
        LLM Provider API │ Web Search API │ GitHub API │ Web Fetch/Scrape Service
```

---

## 8. Backend Module Breakdown

**8.1 API Gateway Layer**
- Responsibility: authentication enforcement, request validation, rate limiting, routing to services, SSE/streaming connection management.
- Why isolated: keeps transport concerns (headers, status codes, sessions) out of business logic entirely — required for the future MCP boundary.

**8.2 Auth Service**
- User registration/login, session/token issuance, password handling (or OAuth), account profile.

**8.3 Research Orchestrator**
- A **pipeline state machine** that sequences: Idea Understanding → Discovery → Extraction → Comparison → Scoring → Report Generation.
- Tracks per-run state (stage, partial results, errors) so progress can be streamed to the client and so a failed stage can be retried without restarting the whole pipeline.
- Why a distinct module and not just inline code: this is the piece that becomes the natural "MCP tool orchestrator" later — it's the single entry point that already accepts a plain idea input and plain config, and returns/streams structured stage outputs.

**8.4 Idea Understanding Service**
- Takes raw idea text, produces structured intent: category, problem statement, target user, core value proposition, candidate search keywords/entities.
- Why separated: discovery quality is entirely dependent on keyword/entity quality; isolating this lets it be tuned/tested independently.

**8.5 Discovery Service**
- Queries web search API(s), GitHub, and product directories using the structured keywords.
- Deduplicates and ranks candidate competitors before they're passed downstream.
- Why separated: source APIs will change/expand (add Crunchbase, Product Hunt, etc.) — this module owns the adapter pattern for sources so new ones don't touch other services.

**8.6 Extraction Service**
- Fetches raw content for each candidate (via web fetch), and uses the LLM to extract a structured competitor profile (name, description, features, pricing signal, target segment, notable strengths/weaknesses) with source-URL attribution per fact.
- Why separated: this is the most failure-prone stage (pages fail to load, content is noisy) — isolating it lets failures be handled/retried per-competitor without affecting others.

**8.7 Comparison & Scoring Service**
- Builds a feature comparison matrix (user idea vs. each competitor), identifies market gaps, ranks recommended differentiators by estimated impact/effort, and computes the Innovation Score using a transparent, documented rubric (not an opaque single LLM call — see Section 16).

**8.8 Report Generation Service**
- Assembles the structured outputs of all prior stages into a final report object (and rendering into exportable formats later).

**8.9 Project/History Service**
- CRUD for saved projects, run history, linking a project to its most recent and past report versions.

**8.10 Notification/Progress Service**
- Publishes pipeline stage-change events to the client via SSE/WebSocket.

---

## 9. Frontend Module Breakdown

- **Auth Module** — signup/login/session UI.
- **Idea Intake Module** — idea input form, optional clarifying-question flow.
- **Live Progress Module** — stage tracker UI consuming SSE/WebSocket events.
- **Report Dashboard Module** — competitor cards, feature comparison matrix (table/grid), gap-map visualization, Innovation Score display with rubric breakdown.
- **Project History Module** — list/search of saved projects, re-open, re-run.
- **Export/Share Module** — generate shareable/exportable report view.
- **Shared UI Kit** — design system components (cards, tables, badges, progress indicators) used across modules.

Frontend state is organized around **server state (fetched/cached via a data-fetching layer) vs. UI state (local)** — kept distinct so report data isn't accidentally duplicated or desynced across components.

---

## 10. Database Design (Entities & Relationships)

**Core Entities**

- **User**: id, email, name, auth credentials/provider, created_at.
- **Project**: id, user_id (FK), title, original_idea_text, structured_idea (idea understanding output), status, created_at, updated_at.
- **ResearchRun**: id, project_id (FK), triggered_at, status (pending/running/completed/failed), stage_log (state machine history), completed_at.
  - *Why a run is separate from a project:* a project can be re-researched over time (FR13); each research is an immutable run, while the project is the durable container. This also cleanly supports "compare this run to the last run" later.
- **Competitor**: id, research_run_id (FK), name, source_url, description, category, discovered_via (source adapter name).
- **CompetitorFeature**: id, competitor_id (FK), feature_name, feature_description, source_url (attribution), confidence.
- **ComparisonResult**: id, research_run_id (FK), competitor_id (FK), overlap_summary, differentiation_notes.
- **GapFinding**: id, research_run_id (FK), gap_description, supporting_rationale, related_competitor_ids.
- **Recommendation**: id, research_run_id (FK), recommended_feature, impact_score, effort_score, rationale.
- **InnovationScore**: id, research_run_id (FK), overall_score, rubric_breakdown (JSON — sub-scores per dimension), explanation.
- **Report**: id, research_run_id (FK), rendered_summary, export formats/links, generated_at.
- **RawArtifact** (object storage reference, metadata in DB): id, research_run_id (FK), competitor_id (FK, nullable), storage_url, content_type, fetched_at.
  - *Why store raw content:* enables re-extraction without re-fetching (cost control) and provides an audit trail for every AI-derived claim.

**Relationships**
- User 1—* Project
- Project 1—* ResearchRun
- ResearchRun 1—* Competitor, GapFinding, Recommendation, ComparisonResult, 1—1 InnovationScore, 1—1 Report
- Competitor 1—* CompetitorFeature
- ResearchRun 1—* RawArtifact

**Design rationale:** Normalizing around `ResearchRun` (rather than storing one blob per project) is what makes history, re-runs, delta-tracking, and audit trails possible without schema changes later — this is the highest-leverage schema decision in the system.

---

## 11. Recommended Technology Stack (with rationale)

| Layer | Recommendation | Rationale |
|---|---|---|
| Frontend | Next.js (React) + TypeScript | SSR/streaming support for progressive report rendering; TypeScript shares types with backend if backend is also TS/Node — reduces integration bugs under hackathon time pressure |
| API layer | Node.js (TypeScript) + a lightweight framework (Express/Fastify) | **Same language as NitroStack TypeScript SDK** — this is the single highest-leverage stack decision for Section 23: services written in TS can be wrapped as MCP tools with a thin adapter, no rewrite |
| Orchestrator | In-process state machine (not a separate infra component) for MVP | A dedicated workflow engine (Temporal, etc.) is correct at scale but is over-engineering for a 24–48hr hackathon; the state machine is *designed* so it could be swapped in later without changing service signatures |
| LLM Provider | Claude (Anthropic API) | Strong structured-extraction and long-context reasoning, native tool-use for structured JSON outputs needed at Idea Understanding, Extraction, and Scoring stages |
| Web Search | A search API provider (e.g., Bing Web Search API / Serper / Tavily-style aggregator) | Avoids building/maintaining a crawler under time pressure; these APIs are purpose-built for "get me ranked, current web results" |
| Code/Repo Discovery | GitHub REST/Search API | Purpose-built for open-source competitor/alternative discovery — directly serves FR3 |
| Relational DB | PostgreSQL | Strong relational integrity for the entity graph in Section 10; JSONB columns handle semi-structured LLM outputs (rubric breakdowns, structured idea) without a schema migration per new field |
| Cache | Redis | Caches search results and LLM extraction outputs keyed by normalized input — directly controls LLM/API cost and latency on repeated or similar queries |
| Object Storage | S3-compatible storage | Stores raw fetched HTML/text artifacts for audit/re-extraction (Section 10 rationale) cheaply, outside the relational DB |
| Auth | Managed auth provider (e.g., Auth.js/Clerk-style) for MVP speed, or self-managed JWT sessions | Hackathon time constraint favors managed auth; JWT approach is a safe fallback if a managed provider isn't allowed |
| Streaming transport | Server-Sent Events (SSE) | Simpler than WebSockets for one-directional progress updates; sufficient for the "live research progress" UX requirement |
| Hosting | Containerized services on a PaaS (e.g., Render/Railway/Fly.io) for hackathon; portable to Kubernetes later | Stateless service design (Section 19) means the hosting target can change without architecture change |

---

## 12. Folder Structure

```
/competitive-research-assistant
│
├── /apps
│   ├── /web                    # Next.js frontend
│   │   ├── /components
│   │   ├── /modules             # feature modules (Section 9)
│   │   ├── /lib                 # API client, data fetching
│   │   └── /pages or /app
│   │
│   └── /api                    # Backend HTTP entrypoint (thin transport layer)
│       ├── /routes              # REST route definitions → call services only
│       ├── /middleware          # auth, validation, rate limiting
│       └── /streaming           # SSE progress publishers
│
├── /services                   # Transport-agnostic business logic (THE core layer)
│   ├── /idea-understanding
│   ├── /discovery
│   ├── /extraction
│   ├── /comparison-scoring
│   ├── /report-generation
│   ├── /project-history
│   └── /orchestrator            # pipeline state machine, composes the above
│
├── /integrations                # External API adapters
│   ├── /llm-provider
│   ├── /search-provider
│   ├── /github-provider
│   └── /web-fetch
│
├── /data
│   ├── /db                      # ORM models/migrations (Postgres)
│   ├── /cache                   # Redis client + cache-key strategy
│   └── /storage                 # Object storage client
│
├── /shared
│   ├── /types                   # Shared TypeScript types (idea, competitor, report, etc.)
│   └── /config                  # Environment/config loading
│
└── /future-mcp                  # (empty in Phase 1) — placeholder boundary for
                                    MCP tool adapters that will wrap /services in Phase 2
```

**Why `/services` is structurally separate from `/apps/api`:** this is the physical enforcement of the transport/logic separation described in Section 6. Nothing in `/services` may import from `/apps/api` or know about HTTP — this constraint is what makes Section 23 (MCP integration) additive rather than a refactor.

---

## 13. Service Boundaries

Each service is defined by a **plain input → plain output contract**, independent of how it's invoked:

- **Idea Understanding Service**: `raw idea text (+ optional constraints) → structured idea object`
- **Discovery Service**: `structured idea object → ranked list of candidate competitor references`
- **Extraction Service**: `competitor reference → structured competitor profile (with source attribution)`
- **Comparison & Scoring Service**: `structured idea + list of competitor profiles → comparison matrix + gap findings + recommendations + innovation score`
- **Report Generation Service**: `all prior stage outputs → assembled report object`
- **Project/History Service**: `user id + project data → persisted project/run records`

**Why this matters architecturally:** because every boundary is a pure data-in/data-out contract with no hidden dependency on request context, each service can be:
1. Unit-tested in isolation (critical under hackathon time pressure — you can't afford to debug through the whole HTTP stack),
2. Independently cached (Section 19),
3. Later exposed as an MCP tool by wrapping the same function signature — the input schema becomes the MCP tool's input schema almost directly.

---

## 14. Authentication & Authorization Strategy

- **Authentication:** Token-based (JWT or managed-provider session tokens) issued at login, validated at the API Gateway layer only — services never see raw credentials, only a resolved `user_id`/`user context` object.
- **Authorization:** Resource-level ownership checks (a user may only access their own Projects/ResearchRuns) enforced in the Project/History Service, not just at the gateway — defense in depth, since a future MCP tool caller will also need this same check enforced at the service layer, not just HTTP middleware.
- **Why enforce at both layers:** the gateway check is a fast-fail optimization; the service-layer check is the actual security boundary and must exist independently of transport, because Section 23's MCP tools will bypass the HTTP gateway entirely.
- **Secrets:** All external API keys (LLM, search, GitHub) live only in the Integrations layer's environment config — never passed through from the client, never logged.

---

## 15. Data Flow

1. Client submits idea → API Gateway validates + authenticates → creates a `Project` + `ResearchRun` record (status: pending).
2. Orchestrator invokes **Idea Understanding Service** → structured idea persisted on the run.
3. Orchestrator invokes **Discovery Service** with structured idea → candidate competitor list returned; progress event emitted.
4. Orchestrator fans out to **Extraction Service** per candidate (bounded concurrency) → structured competitor profiles persisted (`Competitor`, `CompetitorFeature`) with raw content cached in Object Storage; progress event emitted per completion.
5. Orchestrator invokes **Comparison & Scoring Service** with structured idea + all competitor profiles → `ComparisonResult`, `GapFinding`, `Recommendation`, `InnovationScore` persisted.
6. Orchestrator invokes **Report Generation Service** → `Report` persisted, run marked completed; final progress event emitted.
7. Client receives completed report via the same SSE channel or a final fetch call; renders Report Dashboard.
8. On "Save," the Project record (already created in step 1) is simply retained and surfaced in Project History — no separate save action needed since persistence happens at run time, not at report-view time.

**Why persist at every stage rather than only at the end:** if extraction fails for 2 of 8 competitors, the other 6 profiles and the eventual partial report are still usable and visible — this is a resilience decision, not just a data-modeling one.

---

## 16. AI Workflow

The AI layer is used at **three distinct, narrowly-scoped points** rather than one large "do everything" prompt — this is a deliberate reliability and cost decision:

1. **Idea Understanding (LLM call #1):** Input = raw idea text. Output = structured JSON (category, problem, target user, value prop, search keywords/entities). Using structured output (tool-use/JSON mode) here — not free text — because the Discovery Service consumes this programmatically.

2. **Competitor Extraction (LLM call #2, per competitor):** Input = raw fetched page content + a fixed extraction schema. Output = structured competitor profile with a `source_url` field on every extracted fact. Attribution-per-fact is a non-negotiable design constraint — it's what makes the report trustworthy and auditable (NFR: Auditability).

3. **Comparison, Gap Analysis & Scoring (LLM call #3):** Input = structured idea + all structured competitor profiles (not raw pages — keeps this call's context small and cheap). Output = comparison matrix, gap findings, ranked recommendations, and Innovation Score sub-scores against a **fixed, documented rubric** (e.g., market saturation, differentiation strength, feasibility, timing) rather than a single unexplained number — because an opaque score is not actionable or defensible to a user.

**Why not one mega-prompt for the whole pipeline:** a single large LLM call doing discovery+extraction+scoring is harder to cache, harder to debug when it's wrong, more expensive to retry (you retry everything, not just the failed stage), and produces a less structured, less attributable output. Splitting by pipeline stage lets each call be small, cheap, cacheable, and independently testable — directly supporting the cost-control and reliability NFRs.

**Caching strategy:** Idea Understanding and Extraction outputs are cached (Redis, keyed by normalized input hash) so re-running a project, or two users researching similar ideas, doesn't re-spend LLM budget.

---

## 17. External Integrations

| Integration | Purpose | Notes |
|---|---|---|
| LLM Provider (Claude API) | Idea parsing, extraction, comparison/scoring | Structured output/tool-use mode preferred over free text for programmatic consumption |
| Web Search API | Competitor/product discovery beyond GitHub | Should be swappable behind the Discovery Service's adapter interface (Section 8.5) |
| GitHub API | Open-source alternative/project discovery | Directly serves the "GitHub projects, open-source alternatives" requirement |
| Web Fetch/Content Extraction | Retrieve raw page content for Extraction Service | Should handle failure gracefully (timeouts, blocked pages) without failing the whole run |
| (Optional, post-MVP) Crunchbase / Product Hunt APIs | Richer startup/funding signal | Adapter-pattern in Discovery Service makes adding these non-invasive |

---

## 18. Security Considerations

- **Input sanitization** on the idea text before it reaches any LLM prompt (prompt-injection surface: a malicious idea submission shouldn't be able to hijack extraction/scoring prompts for other users' data — mitigated further by the fact each run's context is scoped to that run only).
- **Output handling:** LLM outputs are treated as untrusted data when rendered in the frontend (no raw HTML injection from extracted competitor descriptions).
- **Secrets management:** All third-party API keys stored server-side only, never exposed to the client bundle.
- **Rate limiting** at the API Gateway to prevent a single user from exhausting LLM/search budget (also a cost-control measure).
- **Ownership checks** on every Project/ResearchRun access (Section 14).
- **Source-fetch safety:** the Web Fetch integration should respect robots.txt/reasonable fetch limits and avoid fetching/rendering untrusted active content.

---

## 19. Scalability Strategy

- **Stateless services:** every service in `/services` is a pure function of its input plus the DB/cache — no in-memory session state — so any service can be horizontally scaled behind a load balancer.
- **Bounded concurrency fan-out:** the Extraction stage processes competitors concurrently but capped (e.g., 5–8 at a time) to avoid overwhelming external APIs and to keep cost predictable.
- **Cache-first for expensive calls:** Discovery and Extraction results are cached by normalized query/content hash — the same competitor page fetched for two different users' research runs is only extracted once.
- **Read/write split readiness:** the schema (Section 10) is normalized enough that read-heavy endpoints (report viewing, history listing) can later be served from read replicas without redesign.
- **Async-first orchestration:** the pipeline is designed as a sequence of discrete, resumable stages (not one long synchronous function) so a future move from in-process orchestration to a queue/worker model (or a workflow engine) changes *how* stages are invoked, not *what* they do.

---

## 20. Logging & Monitoring Strategy

- **Structured logging** (JSON logs) at each pipeline stage boundary: stage name, run ID, duration, success/failure — enables reconstructing exactly where time/cost is spent per research run.
- **Per-stage metrics:** latency and failure rate per service (Idea Understanding, Discovery, Extraction, Comparison/Scoring, Report Generation) — surfaces which stage is the bottleneck or most fragile.
- **LLM cost/token tracking** per run, tagged by stage — essential given LLM calls are the dominant variable cost.
- **Error tracking** (e.g., Sentry-style) capturing failed extractions per-competitor without conflating them with whole-run failures.
- **User-facing status visibility:** the same stage-log used for progress SSE doubles as the debugging trail — one data structure, two consumers (this avoids building separate "progress" and "logging" systems).

---

## 21. Error Handling Strategy

- **Per-stage isolation:** a failure in one competitor's extraction does not fail the whole `ResearchRun` — it's recorded as a partial failure, and the pipeline continues with the remaining competitors.
- **Retry with backoff** for transient external API failures (search, fetch, LLM) at the Integrations layer — retries are scoped to the single failing call, not the whole pipeline.
- **Graceful degradation:** if Discovery returns fewer competitors than expected, or an entire external source is down, the report still generates with a visible disclosure ("Only N sources available for this run") rather than failing outright.
- **User-facing error states:** the frontend distinguishes between "still running," "completed with partial data," and "failed" — never a silent spinner with no resolution.
- **Idempotent re-runs:** re-triggering research on a project creates a new `ResearchRun` rather than mutating a prior one, so a failed run never corrupts previously saved good data.

---

## 22. Performance Considerations

- **Progressive rendering:** report sections populate as each pipeline stage completes (via SSE) rather than waiting for the full pipeline — perceived latency matters more than raw latency for this UX.
- **Bounded LLM context:** Comparison/Scoring consumes structured summaries, not raw page content, keeping that call's latency and cost predictable regardless of how verbose competitor pages are.
- **Cache hit path:** a repeated or similar idea query should return substantially faster on subsequent runs due to Discovery/Extraction caching (Section 16, 19).
- **Concurrency caps** on extraction fan-out balance total pipeline latency against external API rate limits.

---

## 23. Future MCP Integration Strategy

This is the requirement that most shapes the architecture, so it's addressed explicitly:

**The core principle:** MCP tools are, structurally, just another *caller* of the Service Layer — same as the HTTP API is today. Because every service in `/services` already has a plain input/output contract with zero HTTP or session dependency (Section 13), exposing them via the NitroStack TypeScript SDK later means:

1. Writing thin adapter functions in a new `/future-mcp` (or `/mcp-tools`) directory that map an MCP tool's declared input schema directly onto an existing service function's parameters.
2. Reusing the exact same TypeScript types from `/shared/types` as both the MCP tool's input/output schema and the service layer's contract — no duplicate modeling.
3. Reusing the Auth/Authorization service-layer checks (Section 14) as-is, since they were deliberately not embedded only in HTTP middleware.
4. Not touching `/apps/api`, `/services`, `/integrations`, or `/data` at all — the change is purely additive.

**Why this is only possible because of decisions made now:** if business logic had been written directly inside Express route handlers (a common hackathon shortcut), every one of those handlers would need to be unwound and rewritten to be MCP-callable. By paying the small discipline cost now (routes call services, services never import transport code), the MCP migration becomes a new folder and a set of thin wrappers — not a refactor.

**Candidate MCP tools (for future exposure, not built now):** `understand_idea`, `discover_competitors`, `extract_competitor_profile`, `compare_and_score`, `generate_report` — mirroring the service boundaries 1:1, so an external agent could also compose them into custom workflows beyond the built-in orchestrator.

---

## 24. Risks & Trade-offs

| Risk / Trade-off | Impact | Mitigation |
|---|---|---|
| LLM extraction accuracy on noisy/JS-heavy pages | Wrong or missing competitor facts | Source-URL attribution per fact (Section 16) lets users verify/distrust specific claims rather than trusting a black box |
| Search/GitHub API rate limits during judging demo | Live demo failure | Cache-first strategy (Section 19) + a pre-warmed cache for the demo idea as a fallback |
| Cost overrun from uncapped LLM fan-out | Budget risk during and after hackathon | Bounded concurrency + per-run token budget cap + caching (Sections 16, 19) |
| In-process orchestrator won't survive a server restart mid-run | A running research job is lost on deploy/crash | Acceptable for hackathon MVP; state machine design allows swapping in a durable queue/workflow engine later without changing service signatures |
| "Innovation Score" perceived as arbitrary | Undermines trust in the core differentiator | Fixed, documented, multi-dimensional rubric surfaced to the user (Section 16) instead of a single opaque number |
| Scope creep across 25 requirement areas in a 24–48hr window | MVP doesn't ship | Explicit phased plan (Section 25) — most secondary FRs deferred, core pipeline prioritized |

---

## 25. Phased Implementation Plan

**Phase 0 — Setup (Hours 0–3)**
- Repo/folder structure (Section 12), DB schema migration for core entities, auth scaffolding, environment/config for LLM + search + GitHub keys.

**Phase 1 — MVP Core Pipeline (Hours 3–20)**
- Idea Understanding Service (single LLM call, structured output).
- Discovery Service (one search provider + GitHub adapter).
- Extraction Service (sequential or lightly concurrent, structured output with source attribution).
- Comparison & Scoring Service (comparison matrix + gap findings + fixed-rubric Innovation Score).
- Report Generation Service (structured report object).
- Orchestrator wiring all of the above with basic stage-status persistence.
- Minimal frontend: idea intake → progress indicator (polling is acceptable if SSE is time-constrained) → static report dashboard.
- Auth (managed provider or simple JWT) + Project/ResearchRun persistence.

**Phase 2 — Demo Polish (Hours 20–30)**
- SSE-based live progress (upgrade from polling if used).
- Project History view (list/reopen past projects).
- Report Dashboard visual polish (feature matrix, gap map).
- Caching layer (Redis) for Discovery/Extraction to guarantee a fast, reliable live demo.
- Error-state handling in the UI (partial completion, failures).

**Phase 3 — Stretch (Hours 30–48, if time remains)**
- Re-run/refresh on saved projects.
- Export to PDF.
- Multiple search-provider adapters.
- Clarifying-question step in idea intake.

**Phase 4 — Post-Hackathon (not in hackathon scope)**
- Durable workflow engine for orchestration.
- MCP tool adapters (Section 23).
- Competitor change-tracking over time.
- Team/collaborative projects.

**Sequencing rationale:** Phase 1 deliberately builds the entire pipeline end-to-end at minimum depth *before* any UI polish — a thin, complete, demoable pipeline de-risks the hackathon far more than a polished UI in front of a broken or partial pipeline.
