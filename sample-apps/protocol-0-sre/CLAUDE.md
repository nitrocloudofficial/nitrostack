# CLAUDE.md — Protocol-0 (Autonomous SRE Copilot, MCP Server)

## What this project is

Protocol-0 is an MCP server built on the **Nitrostack** platform (SDK + CLI). It exposes an autonomous Site Reliability Engineering (SRE) and Incident Response workflow as MCP Tools, Resources, and Prompts. The MCP client (NitroChat / Claude) is the agent; this server is the capability layer.

## THE GOLDEN PATH (the only scope)

start_monitoring → detect_anomaly → trigger_incident_commander → pull_infrastructure_metrics ⚿ → compute_heuristics → assess_business_impact → generate_remediation_plan → execute_action ⚿ → log_audit_event
⚿ = zero-trust-gated: MUST return {error:"ZERO_TRUST_VIOLATION", hint:"..."} without a valid cryptographic payload match. This gate is the project's signature feature.

## Non-negotiable rules for Claude Code

1. NEVER invent Nitrostack SDK/CLI APIs from memory. The ONLY sources of truth are:
   CLI `--help`, and `.d.ts` in `node_modules/@nitrostack/*`.
   - Decorators: `@Tool`/`@ToolDecorator`, `@Resource`, `@Prompt`, `@Widget`,
     `@Module`, `@McpApp`, `@HealthCheck`, `@UseGuards`, `@UseFilters`, `@Injectable`.
   - **ExecutionContext carries NO tool input** (`requestId, toolName, logger,
metadata, auth, task`). A Guard cannot read a `zero_trust_token` tool arg →
     THE ZERO TRUST GATE IS ENFORCED INLINE as the first line of each gated handler,
     not as a Guard. Guards stay for header/auth checks only.
2. Test-first for the zero trust gate. `tests/zero-trust.test.ts` must exist and pass
   before any gated tool is written. Runner: **vitest** (scaffold ships none).
3. All external data is deterministic mocks in `mocks/*.json`. Never call real Datadog/AWS APIs. Never use real PII anywhere.
4. Canonical tool name is `simulate_disaster` (NOT disaster_sim).
5. Mock outcome mapping (canonical): Incident CPU > 90% = CRITICAL, CPU > 75% = WARNING.
6. Every new library/dataset/API goes into THIRD_PARTY.md in the SAME commit.
7. Keep it boring: plain TypeScript on the Nitrostack scaffold, in-memory stores. No databases, no ORMs, no extra frameworks.
8. Decisioning is rules + a pre-baked scorecard + reason codes. NEVER trained ML. Pure deterministic logic in `src/lib/scorecard.ts`.
9. Redact PII in every audit payload before storage.
10. After the `freeze` tag, only fix bugs that break the golden path. No refactors.

## Commands

- build: `npm run build`
- start: `npm start`
- test: `npx vitest run`
- regress: `npx tsx scripts/regress.ts`

## Layout

src/lib/tools/ domain-specific MCP tools (6 files, 18 tools)
src/lib/ scorecard.ts, rules.ts
src/lib/resources/ 5 MCP resources
src/lib/prompts/ 5 MCP prompt templates
mocks/ datadog_seed.json, github_seed.json, jira_seed.json
tests/ zero-trust.test.ts FIRST, then goldenpath.test.ts
scripts/ regress.ts, seed-demo.ts
docs/ DEPLOY_LOG.md, SPEC.md

## Definition of done — every tool

- [ ] Input/output schema matches strictly
- [ ] 1–3 sentence natural-language description
- [ ] Gated tools: Zero-Trust check is the FIRST statement in the handler
- [ ] Writes a redacted audit event via audit trail
- [ ] Deterministic against the mock seeds
- [ ] Unit test passing; golden-path test still green
