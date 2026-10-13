export type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type ActorRole = 'user' | 'admin' | 'service';

export interface AccessLogRecord {
  id: string;                 // "L004821" — evidence references point here
  ts: string;                 // ISO 8601
  method: HttpMethod;
  path: string;
  query: string | null;
  status: number;
  actor: { sub: string | null; role: ActorRole | null };  // null = unauthenticated
  ip: string;
  latencyMs: number;
  respBytes: number;
  ua: string;
}

export interface PathParam { name: string; position: number; }

export interface EndpointTemplate {
  template: string;           // "/api/v1/orders/{orderId}"
  params: PathParam[];
  methods: HttpMethod[];
  requestCount: number;
  statusCounts: Record<string, number>;
  distinctActors: number;
  firstSeen: string;
  lastSeen: string;
  documented: boolean;
}

export type RuleId =
  | 'R1_CROSS_ACTOR'        // core
  | 'R2_ENUMERATION'        // core
  | 'R3_AUTH_GAP'           // core
  | 'R5_SHADOW'             // core
  | 'R7_LOG_INJECTION'      // core
  | 'R4_EXISTENCE_ORACLE'   // stretch — implement only if I say so
  | 'R6_UNGUARDED_WRITE';   // stretch — implement only if I say so

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Finding {
  id: string;                 // stable, derived from rule+template. NOT random.
  rule: RuleId;
  cwe: string;                // "CWE-639"
  cweTitle: string;
  template: string;
  methods: HttpMethod[];
  severity: Severity;
  score: number;              // 0–100
  title: string;
  rationale: string;          // deterministic prose built from metrics
  evidence: string[];         // AccessLogRecord.id values. REQUIRED, non-empty.
  evidenceUri: string;        // "evidence://finding/{id}"
  metrics: Record<string, number>;
  documented: boolean;
}

export interface TopologyNode {
  id: string;                 // accumulated path prefix
  label: string;
  depth: number;
  isEndpoint: boolean;
  isParam: boolean;
  documented: boolean;
  requestCount: number;
  maxSeverity: Severity | null;
}

export interface TopologyEdge { from: string; to: string; weight: number; }

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  stats: {
    observedEndpoints: number;
    documentedEndpoints: number;
    shadowEndpoints: number;
    totalRequests: number;
    distinctActors: number;
    timeRange: { from: string; to: string };
  };
}

export interface AttackSessionEvent {
  recordId: string;
  ts: string;
  method: HttpMethod;
  template: string;
  path: string;               // neutralised — same untrusted-input contract as evidence records; carries the concrete object id in context
  status: number;
  findingIds: string[];
}

export interface AttackSessionGroup {
  template: string;
  method: HttpMethod;
  firstTs: string;
  lastTs: string;
  count: number;
  distinctObjectIds: number;
  sampleObjectId: string | null;  // neutralised
  findingIds: string[];
}

export interface AttackSessionFindingSummary {
  id: string;
  rule: RuleId;
  severity: Severity;
  template: string;
}

export interface AttackSession {
  actorSub: string;
  eventCount: number;
  timeRange: { from: string; to: string };
  durationSeconds: number;
  distinctTemplates: number;
  distinctObjectIds: number;
  findings: AttackSessionFindingSummary[];
  groups: AttackSessionGroup[];
  events: AttackSessionEvent[];
}

// ---- MCP layer contracts ----

export type ToolErrorCode =
  | 'NO_LOGS_INGESTED'
  | 'NO_SPEC_IMPORTED'
  | 'FINDING_NOT_FOUND'
  | 'FIXTURE_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'PAYLOAD_TOO_LARGE'
  | 'REGISTRY_UNAVAILABLE'
  | 'UNSUPPORTED_FORMAT';

export interface SuggestedNext {
  tool: string;
  args: Record<string, unknown>;
  why: string;
}

export type ToolResult<T> =
  | { ok: true; data: T; suggestedNext?: SuggestedNext[] }
  | { ok: false; code: ToolErrorCode; message: string; nextAction: string };
