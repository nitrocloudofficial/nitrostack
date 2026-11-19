# Dynamic Guardrails (Core Preview)

Guardrails evaluate a tool policy before the handler runs. Configure them on `@McpApp({ guardrails })` or `createServer({ guardrails })`, then mark each tool with `@Guardrail({ policy, facts })` or `@Guardrail.Public()`. Programmatic `new Tool()` accepts the same `guardrail` declaration. The API is opt in; `requireDeclaration: true` rejects undeclared tools during registration.

```ts
import { InMemoryPolicyProvider, JsonPolicyEvaluator, Guardrail } from '@nitrostack/core/guardrails';

const provider = new InMemoryPolicyProvider();
provider.publish({
  schemaVersion: 1, id: 'booking', tenantId: 'tenant-1', version: 1,
  defaultEffect: 'deny',
  rules: [{ id: 'qualified', effect: 'allow', all: [
    { field: 'lead.qualified', op: 'eq', value: true },
  ] }],
});

// On a @Tool method:
@Guardrail({ policy: 'booking', facts: ['lead.qualified'] })
```

The `guardrails` config requires `mode: 'enforce'`, a `provider`, an `identityResolver`, and a `contextResolver`; `evaluator` and `audit` are optional. The identity resolver must independently verify credentials and return `{ principalId, tenantId, scopes, source }`. Do not use `ctx.auth`, `ctx.verifiedSubject`, request metadata, or tool arguments as proof of identity. The context resolver receives the parsed tool input and verified identity, then returns authoritative facts such as `{ 'lead.qualified': true }`.

Guarded tools currently require a Zod object input schema. Unknown top-level fields are rejected. Missing policies, invalid facts, provider failures, and non-allow decisions fail closed. `@Cache` is rejected on guarded decorated tools until a verified tenant and principal cache key is supported. `InMemoryPolicyProvider.publish()` updates rules without restarting the server; use a durable provider for production. `require_information` and `require_approval` currently return safe error results. The MRTR and durable approval flows in the plan remain future work.

## Try CloudOps Guardian

Scaffold the feature-branch CLI with `nitrostack init guardian --preset cloudops-guardian`. The template README gives the packed-branch installation commands and HTTP MCP client settings. Connect the dashboard as the ML Research demo administrator. Request eight GPUs in Mumbai, raise the immediate quota from 2 to 8, and retry the same request. Compare the policy revisions and execution events in the audit log. Singapore remains blocked for this team.

Agents can use Code Mode to search for infrastructure tools, inspect their schemas and execute them with the connected identity. The dashboard remains directly visible.

The template wraps guarded SDK tool execution in a local transaction so it can persist pending requests, record human review and re-evaluate approved operations. [Template README](../../../typescript/packages/cli/templates/typescript-dynamic-guardrails/README.md) · [CloudOps Guardian requirements](../../templates/cloudops-guardian-prd.md)
