# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Software engineers and tech leads reviewing API contract changes before production release. They need to assess breaking changes, review consumer impact evidence, and make go/no-go release decisions under time pressure.

## Product Purpose

APIGuard is an MCP-native API contract impact assessment and release-decision server. It analyzes API changes against downstream consumers, determines severity, provides evidence-based impact assessments, and gates releases with approve/block decisions. Success means preventing breaking changes from reaching production without human review.

## Positioning

NitroStack-powered widget runtime delivers impact assessments directly into developer workflows via MCP tool outputs. Deterministic fallback classification ensures reliability when LLM classification is unavailable. The widget integrates with NitroStack Studio for live assessment data.

## Operating Context

Engineers receive assessment widgets via NitroStack tool outputs during code review or release pipelines. The widget displays contract changes, consumer evidence, and severity ratings. Decisions are recorded with idempotency keys for audit trails. Preview mode enables local development without live SDK connections.

## Capabilities and Constraints

- Displays API contract change assessments with severity classification (HIGH/MEDIUM/LOW)
- Shows breaking vs non-breaking changes with rationale
- Presents consumer impact evidence with confidence ratings
- Records release decisions (APPROVE/BLOCK) with reasons
- Supports preview mode for offline development
- Falls back to typed-chat when tool calls fail
- Must render inside NitroStack widget runtime (React)
- Uses `@nitrostack/widgets` SDK for tool output and follow-up messages
- All styling currently inline — no design system established

## Brand Commitments

- Uses Inter font family (ui-sans-serif, system-ui)
- Color scheme respects system preference (light/dark via prefers-color-scheme)
- Transparent background for widget embedding

## Evidence on Hand

- Working widget implementation at `src/widgets/app/api-impact-summary/page.tsx`
- Preview data with realistic assessment structure
- NitroStack widget SDK integration patterns

## Product Principles

1. Evidence before opinion — every assessment shows its work
2. Fail-safe defaults — deterministic classification when LLM unavailable
3. Audit trail — all decisions recorded with idempotency
4. Workflow integration — render where engineers already work
5. Preview parity — local development matches production behavior

## Accessibility & Inclusion

- Must meet WCAG 2.1 AA contrast requirements
- Keyboard navigable for decision actions
- Screen reader compatible for severity and status indicators
