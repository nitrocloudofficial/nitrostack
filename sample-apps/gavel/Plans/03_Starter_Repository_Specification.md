# 3. Starter Repository Specification

**Project:** Frontend Intelligence MCP — NitroStack × SRMIST Hackathon
**Purpose:** Defines *what everyone clones before coding*. This is the common foundation — built by Role B in the first 2–4 hours — that every other role builds on top of. Nobody writes real logic until this exists and is pushed to `dev`.

---

## 3.1 Initial Folder Structure

Run `npx @nitrostack/cli init` first, then shape it to match this structure. Adjust folder names only if the generator differs — keep the ownership split regardless.

```
frontend-intelligence-mcp/
├── src/
│   ├── tools/
│   │   ├── analyzer/
│   │   │   ├── analyze-project.tool.ts
│   │   │   ├── inspect-dependencies.tool.ts
│   │   │   └── inspect-design-language.tool.ts
│   │   ├── recommendation/
│   │   │   ├── compare-libraries.tool.ts
│   │   │   ├── recommend-libraries.tool.ts
│   │   │   ├── estimate-bundle-impact.tool.ts
│   │   │   ├── generate-design-spec.tool.ts
│   │   │   ├── rule-engine.ts
│   │   │   ├── scoring-engine.ts
│   │   │   └── rules/
│   │   │       ├── framer-motion.rule.json
│   │   │       ├── gsap.rule.json
│   │   │       ├── lenis.rule.json
│   │   │       ├── magic-ui.rule.json
│   │   │       ├── react-bits.rule.json
│   │   │       └── threejs.rule.json
│   │   └── benchmark/
│   │       ├── run-lighthouse.tool.ts
│   │       └── compare-metrics.tool.ts
│   │
│   ├── resources/
│   │   └── knowledge-base.resource.ts
│   │
│   ├── services/
│   │   ├── file-reader.service.ts
│   │   ├── theme-extractor.service.ts
│   │   ├── groq.service.ts
│   │   └── lighthouse-runner.service.ts
│   │
│   ├── data/
│   │   └── library-knowledge-base.json
│   │
│   ├── schemas/
│   │   ├── analyzer.schemas.ts
│   │   ├── rules.schemas.ts
│   │   ├── recommendation.schemas.ts
│   │   └── benchmark.schemas.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── widgets/
│   ├── recommendation-card/
│   ├── design-spec-card/
│   └── benchmark-chart/
│
├── test/
│
├── demo/
│   ├── screenshots/
│   ├── backup-demo-video.mp4
│   └── pitch-deck/
│
├── .env.example
├── .gitignore
├── nitrostack.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3.2 Empty Modules (Stub Files)

Every `.tool.ts` file starts as a **typed stub** so every role can build against a compiling contract from hour 2, even before real logic exists. Example pattern (repeat per tool):

```ts
// src/tools/analyzer/analyze-project.tool.ts
import { Tool } from "@nitrostack/core";
import { z } from "zod";
import { ProjectProfileSchema, AnalyzeProjectInputSchema } from "../../schemas/analyzer.schemas";

@Tool({
  name: "analyzeProject",
  description: "Reads a project's package.json, config, and folder structure to build a ProjectProfile.",
  input: AnalyzeProjectInputSchema,
  output: ProjectProfileSchema,
})
export class AnalyzeProjectTool {
  async execute(input: z.infer<typeof AnalyzeProjectInputSchema>) {
    // TODO(Role B): implement real analysis
    throw new Error("Not implemented yet");
  }
}
```

Do this for all 9 tool files. This gives every role something that **compiles and returns a typed error** rather than nothing at all — which means Role A can wire a widget against it, and Role C can call it in a test harness, before the real logic lands.

---

## 3.3 Types / Interfaces (Shared Contracts)

These live in `src/schemas/` and are the single source of truth every role builds against. Lock these by hour 4 — see Integration Checkpoints in the Team Execution Plan.

```ts
// src/schemas/analyzer.schemas.ts
import { z } from "zod";

export const ProjectProfileSchema = z.object({
  framework: z.enum(["react", "next", "unknown"]),
  bundleSizeKb: z.number(),
  lighthouseScore: z.number().min(0).max(100),
  projectType: z.enum(["portfolio", "dashboard", "ecommerce", "landing", "unknown"]),
  hasAnimationLibrary: z.boolean(),
  themeTokens: z.object({
    colors: z.array(z.string()),
    fonts: z.array(z.string()),
    spacingScale: z.array(z.number()).optional(),
  }),
});
export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;

export const AnalyzeProjectInputSchema = z.object({
  path: z.string(),
});
```

```ts
// src/schemas/rules.schemas.ts
import { z } from "zod";

export const ConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  conditions: z.array(ConditionSchema),
  recommendation: z.object({
    library: z.string(),
    title: z.string(),
    implementationHint: z.string(),
  }),
  priority: z.enum(["low", "medium", "high"]),
  reasoningTemplate: z.string(),
  rejectionReason: z.string(),
});
export type Rule = z.infer<typeof RuleSchema>;
```

```ts
// src/schemas/recommendation.schemas.ts
import { z } from "zod";

export const ScoredRecommendationSchema = z.object({
  library: z.string(),
  title: z.string(),
  confidence: z.number().min(0).max(100),
  matchStrength: z.number(),
  compatibility: z.number(),
  conflictPenalty: z.number(),
  reasoning: z.string(), // Groq-phrased
});

export const RejectedRecommendationSchema = z.object({
  library: z.string(),
  reason: z.string(),
});

export const DesignSpecSchema = z.object({
  colors: z.record(z.string()),
  motion: z.object({
    durationMs: z.number(),
    easing: z.string(),
  }),
  targetFiles: z.array(z.string()),
});
```

```ts
// src/schemas/benchmark.schemas.ts
import { z } from "zod";

export const BenchmarkResultSchema = z.object({
  before: z.object({ lighthouseScore: z.number(), bundleSizeKb: z.number() }),
  after: z.object({ lighthouseScore: z.number(), bundleSizeKb: z.number() }),
  delta: z.object({ lighthouseScore: z.number(), bundleSizeKb: z.number() }),
});
```

**Rule:** any change to these files goes through Role B (see §1.3 Module Ownership) and gets flagged in the team channel — these are the contracts everyone else's code is typed against.

---

## 3.4 Config Files

**`.env.example`** (committed — never commit the real `.env`):
```
GROQ_API_KEY=your_groq_api_key_here
NITROSTACK_PORT=3000
LIGHTHOUSE_API_KEY=optional_if_using_hosted_lighthouse
```

**`.gitignore`**:
```
node_modules/
dist/
.env
.DS_Store
*.log
demo/backup-demo-video.mp4   # large file — see note below
```
*(Note: if the backup video needs to be in the repo for submission, use Git LFS or a linked external storage URL instead of committing a large binary directly.)*

**`nitrostack.config.ts`** — minimal starting config (adjust to actual NitroStack CLI output):
```ts
export default {
  name: "frontend-intelligence-mcp",
  transport: "stdio", // or "sse" depending on deployment target
  widgets: {
    dir: "./widgets",
  },
};
```

**`tsconfig.json`** — standard strict TypeScript config (generated by `nitrostack init`, keep `strict: true` so the schema types actually catch mistakes early).

**`package.json` scripts** — see §3.5.

---

## 3.5 Scripts

```json
{
  "scripts": {
    "dev": "nitrostack dev",
    "build": "nitrostack build",
    "start": "node dist/main.js",
    "test": "vitest run",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  }
}
```

Every role runs `npm run typecheck` before opening a PR — this is the cheapest way to catch a broken shared schema before it reaches `dev`.

---

## 3.6 README (Starter Template)

The README ships from commit 1 in skeleton form, and gets filled in as the project builds — not written from scratch at hour 47.

```markdown
# Frontend Intelligence MCP

An MCP server that acts as an AI Frontend Architect — analyzes a real project,
decides which UI library and design tokens fit it, hands a validated spec to
the IDE's coding agent, and proves the decision with a before/after Lighthouse benchmark.

## Architecture
[diagram + explanation — filled in by Role B once scaffold is stable]

## Tools
| Tool | Owner | Description |
|---|---|---|
| analyzeProject | Role B | ... |
| recommendLibraries | Role C | ... |
| generateDesignSpec | Role C | ... |
| runLighthouse | Role D | ... |

## Setup
1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and add your Groq API key
4. `npm run dev`

## Team
| Role | Name | Owns |
|---|---|---|
| A | | Widgets & demo |
| B | | MCP core & analyzer |
| C | | Rule engine, scoring, Groq |
| D | | Benchmarking & deploy |

## Demo
[link to live deployment] · [link to backup video]
```

---

## 3.7 Base Scaffold Steps

1. Role B runs `npx @nitrostack/cli init frontend-intelligence-mcp`.
2. Reshape the generated tree to match §3.1.
3. Create all empty tool stubs (§3.2) so the project compiles with `Not implemented yet` errors, not missing files.
4. Add all schema files (§3.3) with real Zod types — this is the part that must be right before anyone else starts.
5. Add config files (§3.4) and scripts (§3.5).
6. Add the skeleton README (§3.6).
7. Push to `main` directly for this one commit only (before branch protection is turned on), then enable branch protection immediately after.

---

## 3.8 First Commit

The first commit is a single, atomic "scaffold" commit — not a series of half-finished pushes. It should contain, and only contain:

- [ ] Full folder structure from §3.1 (empty folders can use `.gitkeep`)
- [ ] All tool stub files, compiling with `Not implemented yet`
- [ ] All 4 schema files with complete, agreed-upon types
- [ ] `.env.example`, `.gitignore`, `nitrostack.config.ts`, `tsconfig.json`, `package.json`
- [ ] Skeleton `README.md`
- [ ] Empty `rules/*.rule.json` files for all 6 libraries (even as `{}` placeholders)

Commit message: `chore: initial project scaffold`

Once this lands on `main`, branch protection goes on, `dev` is branched off, and every role opens their `feature/*` branch from `dev` — this is the moment the team actually starts building in parallel.
