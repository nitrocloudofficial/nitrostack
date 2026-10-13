# Nitro — AI Agent Workspace

Nitro is the AI orchestration layer of Invenio. It implements the NitroStack MCP protocol to coordinate multiple specialized AI agents working in concert.

## Phase 1

This directory contains the structural scaffold for all Nitro agents. No MCP logic is implemented yet.

## Architecture

```
nitro/
├── agents/
│   ├── planner/          — Master orchestrator agent
│   ├── research/         — Scientific paper discovery
│   ├── datasets/         — Dataset indexing and linking
│   ├── repositories/     — Code repository discovery
│   ├── knowledge_graph/  — Graph construction and maintenance
│   ├── evidence/         — Evidence extraction and scoring
│   ├── correlation/      — Cross-domain correlation discovery
│   ├── hypothesis/       — Hypothesis generation and validation
│   └── reports/          — Research report generation
└── shared/               — Shared utilities and types for agents
```

## Agent Communication (Phase 2)

All agents communicate via the MCP protocol:

```
User Query
    ↓
Planner Agent (MCP coordinator)
    ↓ delegates tasks
Research Agent  →  Datasets Agent  →  Repositories Agent
    ↓
Knowledge Graph Agent  →  Evidence Agent  →  Correlation Agent
    ↓
Hypothesis Agent  →  Reports Agent
    ↓
Structured Research Report
```

## Documentation

- `docs/AGENTS.md` — Full agent specification and tool schemas
- `docs/MCP_SERVERS.md` — MCP server configuration
- `docs/WORKFLOWS.md` — Agent orchestration workflows
