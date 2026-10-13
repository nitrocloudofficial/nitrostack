# CLAUDE.md — DomainExpansion.ai

## What this is
A NitroStack MCP application that reconstructs an enterprise's real API attack
surface from access logs, diffs it against a published OpenAPI contract to find
shadow endpoints, and reports broken-object-level-authorization risk with the
triggering log records attached as citable evidence.

10-hour hackathon build. Optimise for **working, explainable, demoable** over
complete. When in doubt, ship less and make it correct.

## How this project is judged (use this to break ties)
- 25% Technical quality — correct use of MCP Tools, Resources AND Prompts;
      well-structured code; error handling; security considerations
- 25% Innovation — novel use of MCP primitives; impactful combinations of
      tools and data sources
- 20% Real-world impact
- 15% Demo quality and clarity of the deployed link
- 10% Working NitroCloud deployment + at least one external data source
-  5% Community posts

Implication: **investing in the MCP surface beats adding more detection rules.**
If you're choosing between a sixth detection heuristic and a better resource
layer, choose the resource layer. Tell me if you think I've got that wrong.

## Non-negotiable constraints
- Node.js 20.x. TypeScript strict. ESM. Native `fetch` — do not add axios.
- The only permitted MCP SDK is `@nitrostack/core` / `nitrostack-cli`. Never add
  `@modelcontextprotocol/sdk` or any other MCP package. If a task appears to
  need one, stop and ask me.
- Never create a `.env` file. Never write a secret, key, or token into any file.
  The project must run with zero environment variables.
- No database. No runtime persistence beyond an in-memory store and the
  on-disk fixture cache.

## Layer boundaries — load-bearing, do not violate
```
src/engine/        pure. no I/O, no network, no NitroStack, no React.
                   plain functions over plain data. unit-testable with no
                   server running.
src/integrations/  the ONLY place network calls are allowed. cache-first.
src/modules/       NitroStack MCP layer. thin adapter: validate -> call
                   engine -> shape output. ZERO detection logic here, ever.
src/widgets/       React presentation only. no logic.
fixtures/          seeded logs, specs, ground-truth manifest, network cache
tests/             vitest. ground-truth assertions live here.
scripts/           fixture generator, cache warmer
```

## Determinism
Identical input must always produce an identical finding set in a stable order.
In `src/engine/**`: no `Math.random()`, no `Date.now()`, no `new Date()` without
an argument, no reliance on Map/Set iteration order. Sort explicitly before
returning. No LLM calls inside the engine — reasoning happens in the agent
layer above it. A security tool that hallucinates findings is worse than none.

## Evidence contract
Every `Finding` carries `evidence: string[]` — IDs of the actual log records
that triggered it. A finding with empty evidence is a bug; there is a test that
enforces this.

## Untrusted-input contract
Log records contain attacker-controlled strings (path, query, user-agent). Any
log-derived string that can reach tool output or an LLM MUST pass through
`neutralise()` from `src/engine/sanitise.ts` first. Never interpolate a raw log
field into a prompt, a description, or a tool response.

## Error contract
No tool ever throws to the caller. Every tool returns either
`{ ok: true, data, suggestedNext? }` or
`{ ok: false, code, message, nextAction }` where `nextAction` tells the agent
what to do to recover. Codes are a closed union in `src/engine/types.ts`.

## Style
Named exports only. Explicit return types on every exported function. No `any`
— use `unknown` and narrow. Prefer pure functions over classes. Comment the
*why* of an algorithm, never the *what* of a line.

## Working agreement
- Before a new stage, state your plan in 5 lines or fewer and wait for my go.
- Small commits, real messages. `main` stays deployable.
- After each stage, run the verification command I give you and paste the ACTUAL
  output. Never claim a gate passed without showing it.
- Write the test first whenever I've given you exact expected values.
- If a ground-truth test fails, tell me the real computed numbers. Do NOT tune
  a threshold to force a pass — that produces a detector that only works on our
  own demo data.
- If a spec of mine is ambiguous or wrong, say so instead of guessing.
- Keep explanations short. I'm on a clock.
