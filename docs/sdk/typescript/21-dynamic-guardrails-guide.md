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
