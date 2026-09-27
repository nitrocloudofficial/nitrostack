# Protocol-0 System Specifications (SPEC)

## 1. Data Models (TypeScript Interfaces)

### Incident State Model

The core state object passed through the StateGraph.

```typescript
export interface IncidentState {
  incidentId: string;
  title: string;
  category: "Deployment Failure" | "Database Overload" | "Security Breach";
  severity: "critical" | "high" | "medium" | "low";
  status: "investigating" | "analyzed" | "mitigating" | "resolved";
  affectedSystems: string[];
  affectedDepartments: string[];
  rootCause: string;
  confidenceScore: number;
  recommendations: RemediationAction[];
}
```

## 2. External Mocks Integration

To simulate a massive enterprise stack without requiring live credentials, Protocol-0 utilizes deterministic JSON seeds:

- `mocks/datadog_seed.json`: Simulates live telemetry, CPU spikes, and memory leaks.
- `mocks/github_seed.json`: Simulates recent deployment commits, PR approvals, and DORA metrics.
- `mocks/jira_seed.json`: Simulates on-call pager alerts and active engineering tickets.

## 3. MCP Tool Schemas (Zod)

Every tool enforces strict input validation. Below is the schema for the Zero-Trust execution gate.

### `approveRecommendation` (Action Agent)

**Description:** Approve and execute a specific remediation plan. REQUIRES A ZERO-TRUST CRYPTOGRAPHIC TOKEN.

**JSON Schema:**

```json
{
  "properties": {
    "recommendationId": {
      "type": "string",
      "description": "The exact ID of the recommendation to execute"
    },
    "approve": {
      "type": "boolean",
      "default": true
    },
    "zero_trust_token": {
      "type": "string",
      "description": "Cryptographic HMAC validation token"
    }
  },
  "required": ["recommendationId", "zero_trust_token"],
  "additionalProperties": false,
  "type": "object"
}
```

## 4. Resource Endpoints

The server exposes the following MCP Resources for passive state ingestion:

- `protocol-0://telemetry/live`: Live CPU/Memory metrics.
- `protocol-0://infrastructure/deployments`: Last 24h deployment state.
- `protocol-0://incidents/active`: Real-time queue of ongoing incidents.
