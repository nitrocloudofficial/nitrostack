# NitroStack Architecture

## Overview

NitroStack is a **modular ecosystem** for building production-ready MCP (Model Context Protocol) servers. The architecture is designed with clear separation of concerns, allowing each component to be developed, tested, and deployed independently.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NitroStack Ecosystem                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                                   │
│  │  @nitrostack/   │  │  @nitrostack/   │                                   │
│  │      cli        │  │     widgets     │                                   │
│  │                 │  │                 │                                   │
│  │  • init         │  │  • React hooks  │                                   │
│  │  • dev          │  │  • SDK utils    │                                   │
│  │  • build        │  │  • Types        │                                   │
│  │  • generate     │  │  • Metadata     │                                   │
│  └────────┬────────┘  └────────┬────────┘                                   │
│           │                    │                                            │
│           └────────────────────┼──────────────┐                             │
│                                │              │                             │
│                    ┌───────────▼───────────┐  │                             │
│                    │   @nitrostack/core    │  │                             │
│                    │     (Framework)       │  │                             │
│                    │                       │  │                             │
│                    │  • Server             │  │                             │
│                    │  • Decorators         │  │                             │
│                    │  • Module System      │  │                             │
│                    │  • Auth (JWT/OAuth)   │  │                             │
│                    │  • Guards/Pipes       │  │                             │
│                    └───────────┬───────────┘  │                             │
│                                │              │                             │
│                    ┌───────────▼───────────┐  │                             │
│                    │  @modelcontextprotocol│  │                             │
│                    │         /sdk          │  │                             │
│                    │  (Official MCP SDK)   │  │                             │
│                    └───────────────────────┘  │                             │
│                                               │                             │
└───────────────────────────────────────────────┴─────────────────────────────┘
```

---

## Workspace Structure

NitroStack follows a monorepo structure to ensure consistency across the ecosystem.
This file documents the `typescript/` workspace specifically:

```
typescript/
├── packages/
│   ├── core/      # @nitrostack/core - Main framework engine
│   ├── cli/       # @nitrostack/cli - Development tooling & generators
│   └── widgets/   # @nitrostack/widgets - Visual SDK for tool UIs
└── package.json   # Workspace orchestration
```

> [!NOTE]
> Canonical project-level docs and governance files live in the repository root.
> See `../README.md` and `../CONTRIBUTING.md` for contributor onboarding.

---

## Package Details

### 1. `@nitrostack/core`
**npm:** `@nitrostack/core`
**Purpose:** Enterprise-grade framework for building MCP servers with NestJS-inspired patterns.

```
packages/core/
├── src/
│   ├── core/           # Server, decorators, module system, DI
│   ├── auth/           # JWT, OAuth 2.1, API Key modules
│   └── testing/        # Test utilities
└── dist/               # Compiled ESM output
```

### 2. `@nitrostack/cli`
**npm:** `@nitrostack/cli`
**Binary:** `nitrostack-cli`
**Purpose:** Scaffolding, development, and production management.

```
packages/cli/
├── src/
│   ├── commands/       # init, dev, build, start, generate
│   └── templates/      # Project starter templates
└── dist/               # Bundled CLI binary
```

### 3. `@nitrostack/widgets`
**npm:** `@nitrostack/widgets`
**Purpose:** React SDK for building interactive UI widgets that appear directly in AI chat interfaces.

---

## Request Processing Pipeline

NitroStack uses a robust middleware and guard system similar to NestJS:

```
Client Request ──► Transport ──► Middleware ──► Guards ──► Pipes ──► Interceptors ──► [Tool Logic] ──► Response
```

---

## Deployment Modes

1. **Standard MCP**: Run via `stdio` for integration with Claude Desktop or other MCP-compliant clients.
2. **Enterprise Cloud**: Deploy as an HTTP/SSE service with full OAuth 2.1 and JWT security.

---

*NitroStack: Build powerful MCP servers with enterprise patterns and developer ergonomics.*
