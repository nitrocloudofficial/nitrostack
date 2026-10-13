# Invenio — REST API Reference

## Overview

All API endpoints are prefixed with /api/v1/. The API follows REST conventions and returns JSON.

**Base URL (development):** http://localhost:8000/api/v1

**Interactive Docs:** http://localhost:8000/api/docs (Swagger UI)

**OpenAPI Schema:** http://localhost:8000/api/openapi.json

## 3. Correlation Engine (Phase 3)

### `GET /api/v1/correlation/graph`
Discovers hidden relationships, gaps, and opportunities from a research query.

**Query Parameters:**
- `query` (string, required): The research topic.
- `limit` (int, optional): Papers to pull into engine. Default `30`.

**Response (`200 OK`):**
```json
{
  "nodes": [
    {
      "id": "openalex:W123",
      "label": "Attention Is All You Need",
      "group": "paper",
      "properties": { "year": 2017, "citations": 120000 }
    }
  ],
  "edges": [
    {
      "id": "edge_w123_w456",
      "source": "openalex:W123",
      "target": "openalex:W456",
      "relationship": "related_to",
      "weight": 0.85,
      "evidence": [
        {
          "id": "ev_1",
          "description": "High topic overlap (85%): transformers, self-attention",
          "confidence": 0.9,
          "supporting_paper_ids": ["openalex:W123", "openalex:W456"]
        }
      ]
    }
  ],
  "gaps": [
    {
      "id": "gap_structural_0",
      "title": "Disconnected Research Domains",
      "description": "Cluster A is entirely disconnected from Cluster B.",
      "reason": "Lack of cross-citations between these fields.",
      "confidence": 0.85,
      "relevant_node_ids": ["openalex:W123", "arxiv:2104.0001"]
    }
  ],
  "opportunities": [
    {
      "id": "opp_bridge_0",
      "title": "Bridge: Vision Models and NLP",
      "summary": "Opportunity to apply methods from one cluster to the other.",
      "reasoning": "Cluster A is entirely disconnected from Cluster B.",
      "connected_domains": ["computer vision", "transformers"],
      "supporting_paper_ids": ["openalex:W123"],
      "potential_applications": ["Cross-domain methodology transfer"],
      "confidence": 0.85,
      "evidence": [...]
    }
  ]
}
```

## 4. Workflow Engine (Phase 4)

### `POST /api/v1/workflow/run`
Starts an asynchronous research pipeline.

**Request Body:**
```json
{
  "query": "quantum error correction"
}
```

**Response (`200 OK`):**
```json
{
  "run_id": "uuid"
}
```

### `GET /api/v1/workflow/status/{run_id}`
Retrieves real-time node statuses and execution logs.

**Response (`200 OK`):**
```json
{
  "run": {
    "id": "uuid",
    "query": "quantum error correction",
    "status": "running",
    "start_time": "2026-07-31T...",
    "end_time": null,
    "nodes": [
      {
        "id": "node_search",
        "type": "research_search",
        "label": "Research Search",
        "status": "completed",
        "execution_ms": 1050,
        "confidence": 0.95
      }
    ],
    "logs": [
      {
        "id": "log_uuid",
        "timestamp": "2026-07-31T...",
        "level": "success",
        "message": "Discovered 30 papers...",
        "node_id": "node_search"
      }
    ]
  }
}
```

## 5. Workspace Engine (Phase 5)

### `POST /api/v1/workspace/generate`
Generates a structured workspace from a completed workflow run.

**Request Body:**
```json
{
  "run_id": "uuid"
}
```

**Response (`200 OK`):**
```json
{
  "workspace_id": "uuid"
}
```

### `GET /api/v1/workspace/{workspace_id}`
Retrieves a generated workspace with all report sections.

**Response (`200 OK`):**
```json
{
  "workspace": {
    "id": "uuid",
    "run_id": "uuid",
    "query": "quantum error correction",
    "sections": [
      {
        "id": "uuid",
        "title": "Executive Summary",
        "content": "This report synthesizes...",
        "type": "summary",
        "insights": []
      }
    ]
  }
}
```

### `POST /api/v1/workspace/export`
Exports a workspace to a specified format.

**Request Body:**
```json
{
  "workspace_id": "uuid",
  "format": "markdown" // or "html", "bibtex"
}
```

**Response (`200 OK`):**
```json
{
  "content": "# Research Report...\n\n..."
}
```

---

## Authentication (Phase 3)

All protected endpoints require a Bearer token:

\\\
Authorization: Bearer <jwt_token>
\\\

---

## Endpoints (Phase 2)

### Research

| Method | Path | Description |
|---|---|---|
| GET | /research/papers | List papers with filters |
| GET | /research/papers/{id} | Get paper detail |
| GET | /research/search | Semantic search |
| POST | /research/papers/import | Import from DOI |

### Datasets

| Method | Path | Description |
|---|---|---|
| GET | /datasets | List datasets |
| GET | /datasets/{id} | Get dataset detail |
| GET | /datasets/search | Search datasets |

### Repositories

| Method | Path | Description |
|---|---|---|
| GET | /repositories | List repositories |
| GET | /repositories/{id} | Get repository detail |
| GET | /repositories/search | Search repositories |

### Knowledge Graph

| Method | Path | Description |
|---|---|---|
| GET | /graph/entities | List entities |
| GET | /graph/entities/{id}/neighbors | Get entity neighbors |
| GET | /graph/path | Find path between entities |
| GET | /graph/subgraph | Get subgraph |

### Evidence

| Method | Path | Description |
|---|---|---|
| GET | /evidence | List evidence items |
| GET | /evidence/{id} | Get evidence detail |
| GET | /evidence/chains | Get evidence chains |

### Reports

| Method | Path | Description |
|---|---|---|
| GET | /reports | List reports |
| GET | /reports/{id} | Get report detail |
| POST | /reports | Create new report |
| PUT | /reports/{id} | Update report |
| DELETE | /reports/{id} | Delete report |

---

## Standard Response Format

### Success

\\\json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 150
  }
}
\\\

### Error

\\\json
{
  "detail": "Error message",
  "status_code": 404,
  "timestamp": "2024-01-01T00:00:00Z"
}
\\\

---

## Phase 1 Status

Phase 1 implements only the /health endpoint. All domain endpoints are planned for Phase 2.
