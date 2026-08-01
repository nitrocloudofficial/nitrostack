# TokenSlash Server (Member C — Integration Spine)

NitroStack MCP server for TokenSlash. Member C owns the shared type contract, orchestration pipeline, Prompt Rewriter, Meta-Synthesizer, and app wiring.

## Quick start

```bash
cd packages/server
npm install
npm run dev      # MCP server (stdio)
npm test         # Vitest unit tests
```

## MCP tools exposed

| Tool | Owner | Description |
|------|-------|-------------|
| `analyze_prompt` | Member C | **Main entry point** — runs full pipeline |
| `rewrite_prompt` | Member C | Standalone prompt optimization |
| `synthesize_report` | Member C | Merge upstream module outputs into FinalReport |

## Pipeline order

```
Token Estimator ──┐
Complexity Classifier ──┼──► Model Recommender ──► Prompt Rewriter ──► Meta-Synthesizer
History Analyzer ──┘         (parallel first phase)
```

## File ownership

| Path | Owner |
|------|-------|
| `src/shared/types.ts` | **Member C** — shared contract |
| `src/orchestration/*` | **Member C** |
| `src/tools/prompt-rewriter.tool.ts` | **Member C** |
| `src/tools/meta-synthesizer.tool.ts` | **Member C** |
| `src/tools/orchestration.tool.ts` | **Member C** |
| `src/app.module.ts`, `src/main.ts` | **Member C** |
| `src/tools/token-estimator.tool.ts` | Member A (stub placeholder) |
| `src/tools/complexity-classifier.tool.ts` | Member A (stub placeholder) |
| `src/tools/model-recommender.tool.ts` | Member B (stub placeholder) |
| `src/tools/history-analyzer.tool.ts` | Member B (stub placeholder) |

## Testing in NitroStudio

1. Run `npm run dev` in this directory.
2. Connect NitroStudio to the project folder.
3. Call `analyze_prompt` with a sample prompt and `userId: "demo-user"`.
4. Use Ops Canvas to verify parallel then sequential tool execution.

## Shared contract

All module outputs are defined in `src/shared/types.ts`. **Do not rename or remove fields after H0:30** — additive optional fields only.
