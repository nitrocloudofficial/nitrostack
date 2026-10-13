# 07. Role B — Technical Architecture & Complete Handoff Guide

**Project:** Frontend Intelligence MCP (Gavel)  
**Role:** Role B — MCP Core & Project Analyzer  
**Author:** AI Pair Programmer (Assistant to Role B Lead)  
**Target Audience:** Teammates, Role B Maintainers, Hackathon Judges, and downstream role developers (Role A, Role C, Role D).  
**Repository Branch:** `B` (`https://github.com/Nishant-codess/Gavel.git`)  

---

## Executive Summary

Role B owns the **foundation of the Gavel Frontend Intelligence MCP Server**. 

Before any decision engine can run, any confidence score can be computed, or any widget can be rendered live in the chat, **Role B must inspect the user's real codebase** and translate messy source files into a clean, deterministic, type-safe data structure called `ProjectProfile`.

Role B delivers:
1. **MCP Server Foundation:** NitroStack framework setup, module registration, and main bootstrap runner.
2. **Type Contracts (Schemas):** Definitions of all shared Zod contracts (`ProjectProfile`, `CodeInsights`, `ThemeTokens`, `IntentAnswers`, `Rule`, `ScoredRecommendation`, `RejectedRecommendation`, `DesignSpec`, `BenchmarkResult`).
3. **Project Analyzer Engine:** Deterministic framework detection, dependency discovery, monorepo resolution, bundle estimation, and project type classification.
4. **Theme Extractor Engine:** Automatic extraction of real color palettes (hex / CSS vars), typography, and spacing scales from `tailwind.config.*` and `.css` stylesheets.
5. **Deep Code Reader Engine:** Source-code level scanning of `.tsx`/`.jsx` component files, extracting component counts, design system detection, button variants, accessibility audits, and existing animation usage.
6. **Intent Elicitation & Caching:** Persistent `.gavel-context` cache file manager with freshness validation (< 24 hrs) and user preference elicitation.
7. **Design Spec Generator:** Synthesis engine turning extracted theme tokens and recommended libraries into actionable coding specs (color roles, motion presets, target files, and starter code snippets).
8. **Defensive Hardening Layer:** `GavelError` domain exception system, path assertions, safe 512KB file read caps, and symlink skipping.
9. **Full Test & Integration Suite:** 20/20 passing Vitest tests covering edge cases, bare projects, monorepos, plain CSS, and real open-source production repos.

---

## System Architecture & Data Flow

```
                               ┌──────────────────────────────────────────────┐
                               │             Target Project Directory          │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │    fs-guard (Path Assert)    │
                                       └──────────────┬───────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │   ProjectAnalyzerService     │
                                       └──────┬───────┬───────┬───────┘
                                              │       │       │
                     ┌────────────────────────┘       │       └────────────────────────┐
                     ▼                                ▼                                ▼
       ┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
       │   FileReaderService      │    │  ThemeExtractorService   │    │    CodeReaderService     │
       │ (package.json, monorepo) │    │  (Tailwind, CSS tokens)  │    │  (Regex AST-free scan)   │
       └─────────────┬────────────┘    └────────────┬─────────────┘    └────────────┬─────────────┘
                     │                              │                               │
                     └────────────────────────┐     │     ┌─────────────────────────┘
                                              ▼     ▼     ▼
                                       ┌──────────────────────────────┐
                                       │      ProjectProfile          │
                                       └──────────────┬───────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │      IntentService           │
                                       │    (.gavel-context cache)    │
                                       └──────────────┬───────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │     DesignSpecService        │
                                       │   (Color/Motion Synthesis)   │
                                       └──────────────────────────────┘
```

---

## Detailed Directory & File Ownership

Role B owns the following files and folders:

```
src/
├── main.ts                           <-- MCP server bootstrap & NitroStackServer entry
├── app.module.ts                     <-- Central @Module controller registration
├── utils/
│   └── fs-guard.ts                   <-- Defensive path assertion & safe file reader
├── schemas/                          <-- Shared contracts (B maintains final say)
│   ├── analyzer.schemas.ts
│   ├── rules.schemas.ts
│   ├── recommendation.schemas.ts
│   └── benchmark.schemas.ts
├── services/                         <-- Core service logic
│   ├── file-reader.service.ts
│   ├── project-analyzer.service.ts
│   ├── theme-extractor.service.ts
│   ├── code-reader.service.ts
│   ├── intent.service.ts
│   └── design-spec.service.ts
├── tools/analyzer/                   <-- Exposed MCP Tools
│   ├── analyze-project.tool.ts
│   ├── inspect-dependencies.tool.ts
│   ├── inspect-design-language.tool.ts
│   └── elicit-intent.tool.ts
└── tools/recommendation/
    └── generate-design-spec.tool.ts  <-- Wired to DesignSpecService
```

---

## Detailed Service Specs

### 1. `ProjectAnalyzerService` (`src/services/project-analyzer.service.ts`)
- **Primary Method:** `analyze(projectPath: string): Promise<ProjectProfile>`
- **Responsibilities:**
  1. Calls `assertIsDirectory(projectPath)` to validate entry point.
  2. Inspects `package.json` at root and in monorepo sub-paths (`apps/web`, `apps/frontend`, `apps/app`, `packages/app`).
  3. Merges all installed dependencies and detects framework (`next` > `react` > `unknown`).
  4. Detects existing animation libraries (`framer-motion`, `gsap`, `lenis`, `three`, `magic-ui`, `react-bits`).
  5. Computes baseline estimated bundle size in KB.
  6. Classifies project type heuristic (`portfolio`, `dashboard`, `ecommerce`, `landing`, `unknown`).
  7. Invokes `ThemeExtractorService`, `CodeReaderService`, and `IntentService`.

### 2. `ThemeExtractorService` (`src/services/theme-extractor.service.ts`)
- **Primary Method:** `extractTheme(projectPath: string): Promise<ThemeTokens>`
- **Capabilities:**
  - Evaluates JavaScript and TypeScript Tailwind configurations (`tailwind.config.js`, `tailwind.config.ts`, `tailwind.config.mjs`, `tailwind.config.cjs`).
  - Scans stylesheets (`globals.css`, `app.css`, `index.css`, `styles.css`) for hex colors (`#RRGGBB` / `#RGB`) and CSS custom variables (`--color-*`, `--primary`, `--font-*`).
  - Extracts spacing scales (`[4, 8, 12, 16, 24, 32, 48, 64]`).

### 3. `CodeReaderService` (`src/services/code-reader.service.ts`)
- **Primary Method:** `inspectCodebase(projectPath: string, themeTokens: ThemeTokens): Promise<CodeInsights>`
- **Capabilities:**
  - Recursively walks source trees up to depth 5 while skipping `node_modules`, `.git`, `.next`, `dist`, and symbolic links.
  - Priority file scoring (inspects first 25 `.tsx`/`.jsx`/`.css` files).
  - Detects component file counts, styling approaches (`tailwind`, `css-modules`, `styled-components`, `plain-css`, `mixed`, `unknown`).
  - Checks for design system presence (`ui/` or `design-system/` with 3+ components).
  - Detects button variant patterns and computes color token consistency ratios.
  - Performs accessibility audits (missing `alt` on `<img>`, non-interactive `<div>` with `onClick` missing `role`/`tabIndex`).
  - Scans source files for existing animation library usage and `@keyframes`.

### 4. `IntentService` (`src/services/intent.service.ts`)
- **Primary Methods:**
  - `readCache(projectPath: string): Promise<IntentAnswers | null>`
  - `saveCache(projectPath: string, input: ElicitIntentInput): Promise<IntentAnswers>`
  - `getCacheStatus(projectPath: string): Promise<{ exists, isFresh, ageHours, answers }>`
- **Capabilities:** Reads/writes `.gavel-context` JSON in the project root. Validates schema and checks freshness (< 24 hours).

### 5. `DesignSpecService` (`src/services/design-spec.service.ts`)
- **Primary Method:** `generate(projectPath: string, selectedLibrary?: string): Promise<DesignSpec>`
- **Capabilities:**
  - Maps extracted theme colors to `primary`, `secondary`, `accent`, and `background` roles.
  - Applies per-library motion duration & easing curve presets for all 6 target libraries.
  - Resolves target component files.
  - Generates framework-aware, library-tailored starter code snippets.

### 6. `fs-guard` Utility (`src/utils/fs-guard.ts`)
- `GavelError`: Custom error domain class for structured error reporting.
- `assertIsDirectory`: Throws `GavelError` if path doesn't exist or is a file.
- `safeReadFile`: File reader with a strict **512 KB cap** to prevent buffer overflow or memory spikes on huge minified bundles.

---

## Schema Contracts (Type Reference)

### `ProjectProfile`
```typescript
{
  framework: "react" | "next" | "unknown",
  bundleSizeKb: number,
  lighthouseScore: number,
  projectType: "portfolio" | "dashboard" | "ecommerce" | "landing" | "unknown",
  hasAnimationLibrary: boolean,
  installedLibraries: string[],
  themeTokens: {
    colors: string[],
    fonts: string[],
    spacingScale?: number[]
  },
  codeInsights?: {
    totalComponentFiles: number,
    stylingApproach: "tailwind" | "css-modules" | "styled-components" | "plain-css" | "mixed" | "unknown",
    hasDesignSystem: boolean,
    buttonVariantsDetected: number,
    colorTokenConsistency: number,
    accessibilityIssues: string[],
    existingAnimationUsage: string[],
    routeCount: number,
    avgComponentSizeLines: number
  },
  intent?: {
    audience: "recruiter" | "clients" | "technical" | "general",
    priority: "polish" | "performance" | "balanced",
    visualGoal: "smooth-scroll" | "micro-interactions" | "3d-showcase" | "minimal",
    updatedAt: string
  }
}
```

### `DesignSpec`
```typescript
{
  library: string,
  colors: Record<string, string>,
  motion: {
    durationMs: number,
    easing: string
  },
  targetFiles: string[],
  codeSnippet: string
}
```

---

## Summary of Completed Tasks for Role B

| Task | Description | Git Commit Title |
|---|---|---|
| **Task 1** | Scaffold NitroStack MCP core, build `analyzeProject()`, `inspectDependencies()`, and `ThemeExtractorService`. | `feat(role-b): Task 1 - Build analyzeProject core, inspectDependencies engine, and theme extractor` |
| **Task 2** | Deep source-code reading engine (`CodeReaderService`) for AST-free regex codeInsights extraction. | `feat(role-b): Task 2 - Deep code-reading analyzer with codeInsights extraction` |
| **Task 3** | Defensive hardening (`fs-guard.ts`), `GavelError`, monorepo support, symlink skipping, 512KB read cap. | `feat(role-b): Task 3 - Edge case hardening, defensive fallbacks, and monorepo support` |
| **Task 4** | User intent elicitation engine & `.gavel-context` cache file manager with freshness validation. | `feat(role-b): Task 4 - Intent elicitation engine and .gavel-context cache tool` |
| **Task 5** | Synthesized `generateDesignSpec()` service and MCP tool with semantic color/motion presets & starter code. | `feat(role-b): Task 5 - generateDesignSpec service and tool implementation` |
| **Task 6** | Multi-repo integration suite verifying analyzer & design spec on real open-source production repos. | `feat(role-b): Task 6 - Multi-repo real-world validation integration suite` |

---

## Verification & Test Results

- **Unit & Integration Test Suite (`npm test`):** **20/20 passed** (16 unit tests, 4 real-repo integration tests).
- **TypeScript Typecheck (`npm run typecheck`):** **0 errors**.
- **Live Demo Runner (`npx tsx test/demo-analyzer.ts`):** Executed successfully against fixtures and real repos.
- **Git Repository State:** All 6 tasks committed with professional standard commit messages and pushed to branch `B` on `https://github.com/Nishant-codess/Gavel.git`.

---

## Handoff Notes for Downstream Teammates

- **For Role C (Rule Engine & Groq):** Consume `profile.themeTokens`, `profile.codeInsights`, and `profile.intent` from `ProjectProfile` when writing rule conditions in `rule-engine.ts`.
- **For Role A (UI & Widgets):** Call `generateDesignSpec` tool to receive the `DesignSpec` object. The `colors` and `motion` parameters can be rendered directly into the Design Spec Card widget.
- **For Role D (Benchmarking & Deploy):** Use `profile.bundleSizeKb` and `profile.lighthouseScore` as the `before` baseline metrics when building `BenchmarkResult`.
