/**
 * Browser transport for the officer console.
 *
 * PROVENANCE
 * ----------
 * The `ApiError` / `request` / `api.get|post|put|patch|delete` layer and the typed
 * `EventBus` below are ported from the team's frontend work:
 *
 *   - `src/services/api.ts`     — Manas (Nitrostack-Passport-manas_frontend)
 *   - `src/services/events.ts`  — Manas (Nitrostack-Passport-manas_frontend)
 *
 * Their contract is preserved verbatim in shape (same class name, same error
 * fields, same helper signatures, same `events.on/off/emit` semantics) so their
 * dashboard code drops onto this without edits. Two things had to be added for the
 * shipped build:
 *
 *   1. NO BUNDLER ENV. `nitrostack-cli build` runs a bare esbuild pass; there is no
 *      Vite, so `import.meta.env.VITE_API_BASE_URL` does not exist and referencing
 *      it throws at module load. Base URL is resolved from `window.__PIQ_API_BASE__`
 *      (injected by the server-rendered console shell) falling back to '/api'.
 *   2. SERVER-SENT EVENTS. Their `EventBus` is in-process only. `subscribeStream`
 *      adds the wire half: an `EventSource` on `/api/events` that replays missed
 *      events via `Last-Event-ID` and republishes each frame onto the same bus, so
 *      a component can listen to local and server events through one API.
 *
 * TOTALITY
 * --------
 * Every typed reader here is defensive. The console renders whatever the server
 * gives it, and a hackathon demo must degrade to "this panel is empty" rather than
 * a blank white page.
 */

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __PIQ_API_BASE__?: string;
    __PIQ_OFFICER__?: { name?: string; role?: string };
    __PIQ_BOOTSTRAP__?: unknown;
  }
}

function resolveBase(): string {
  if (typeof window !== 'undefined' && typeof window.__PIQ_API_BASE__ === 'string') {
    return window.__PIQ_API_BASE__;
  }
  return '/api';
}

const API_BASE_URL = resolveBase();

// ---------------------------------------------------------------------------
// Error + request core (Manas, src/services/api.ts — preserved)
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
};

const buildUrl = (path: string): string => {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${endpoint}`;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return undefined;
  return contentType.includes('application/json') ? response.json() : response.text();
};

export const request = async <T>(
  path: string,
  { body, headers, token, ...options }: RequestOptions = {},
): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: unknown }).message)
          : response.statusText || 'Request failed';

    throw new ApiError(message, response.status, data);
  }

  return data as T;
};

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Typed event bus (Manas, src/services/events.ts — extended with wire events)
// ---------------------------------------------------------------------------

type EventHandler<T> = (payload: T) => void;

export interface StreamFrame {
  id?: string | number;
  event: string;
  at?: string;
  payload?: Record<string, unknown>;
}

export type AppEvents = {
  /** Toast surface. */
  notification: { message: string; type: 'success' | 'error' | 'info' | 'warning' };
  /** An application's read model changed and should be refetched. */
  applicantUpdated: { applicantId: string };
  /** A risk score landed. */
  riskUpdated: { applicantId: string; score: number };
  /** An agent run advanced. */
  investigationUpdated: { investigationId: string };
  /** Any server frame, verbatim — added for the SSE bridge. */
  stream: StreamFrame;
  /** SSE connection state, so the topbar dot can be honest. */
  connection: { state: 'connecting' | 'open' | 'closed'; attempt?: number };
};

class EventBus {
  private listeners: { [K in keyof AppEvents]?: Set<EventHandler<AppEvents[K]>> } = {};

  on<K extends keyof AppEvents>(event: K, handler: EventHandler<AppEvents[K]>): () => void {
    const handlers = this.listeners[event] ?? new Set<EventHandler<AppEvents[K]>>();
    handlers.add(handler);
    this.listeners[event] = handlers as never;
    return () => this.off(event, handler);
  }

  off<K extends keyof AppEvents>(event: K, handler: EventHandler<AppEvents[K]>): void {
    this.listeners[event]?.delete(handler);
  }

  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
    this.listeners[event]?.forEach((handler) => {
      // One bad subscriber must not stop the rest of the console updating.
      try {
        handler(payload);
      } catch {
        /* swallowed deliberately */
      }
    });
  }
}

export const events = new EventBus();

// ---------------------------------------------------------------------------
// Console read model types (mirror ConsoleStateService)
// ---------------------------------------------------------------------------

export interface QueueRow {
  applicationId: string;
  applicantName: string;
  applicationType: string;
  status: string;
  submittedAt: string;
  riskScore: number | null;
  riskBand: 'low' | 'medium' | 'high' | 'unknown';
  stagesCompleted: number;
  stagesTotal: number;
  pipelineComplete: boolean;
  clusterSize: number;
  linkedApplicationIds: string[];
  signalCount: number;
  decision: string | null;
  decidedAt: string | null;
  agentRuns: number;
  lastAgentRunId: string | null;
  headline: string;
}

export interface OverviewTotals {
  applications: number;
  pending: number;
  decided: number;
  pipelinesComplete: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  unscored: number;
  linked: number;
  rings: number;
  largestRing: number;
  agentRuns: number;
  escalations: number;
  auditEntries: number;
}

/**
 * A detected cluster, exactly as ConsoleStateService.getOverview() emits it.
 *
 * There is no `ringId` on the wire — a cluster is identified by its membership.
 * The console synthesises a stable display label from the members instead of
 * inventing an id the server would not recognise on a follow-up request.
 */
export interface RingRow {
  applicationIds: string[];
  size: number;
  sharedSignalKinds: string[];
  headline: string;
}

export interface Overview {
  generatedAt: string;
  totals: OverviewTotals;
  queue: QueueRow[];
  rings: RingRow[];
}

/** One stage row from `progress.stages` — includes the stage's stored result. */
export interface StageRow {
  stage: string;
  completed: boolean;
  required: boolean;
  at: string | null;
  result?: unknown;
}

export interface ApplicationProgress {
  completed: string[];
  missing: string[];
  percent: number;
  pipelineComplete: boolean;
  requiredBeforeDecision: string[];
  stages: StageRow[];
}

/** One government rule that fired. Mirrors RuleViolationSchema. */
export interface RuleViolation {
  ruleId: string;
  ruleName?: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  citation?: string;
  weight?: number;
  evidence?: string[];
}

export interface RulesResult {
  applicationId: string;
  violations: RuleViolation[];
  passed: boolean;
  evaluatedRuleIds: string[];
  skippedRuleIds: string[];
  firedRules: RuleViolation[];
  worstSeverity: string | null;
}

/** explain_risk output. `recommendedAction` — NOT `recommendation`. */
export interface ExplanationResult {
  applicationId: string;
  score: number | null;
  band: string | null;
  applicantName?: string;
  explanation: string | null;
  evidence: string[];
  recommendedAction: string | null;
  recommendationRationale: string | null;
  clarificationQuestions: string[];
  narrationMode?: string;
  model?: string | null;
}

/** detect_duplicate_signals output. */
export interface DuplicateSignal {
  type: string;
  value?: string;
  severity?: string;
  matchedApplicationIds?: string[];
  detail?: string;
  description?: string;
}

export interface DuplicateSignalsResult {
  applicationId: string;
  signals: DuplicateSignal[];
  reusedPhone: boolean;
  reusedAddress: boolean;
  reusedDocumentImage: boolean;
  linkedApplicantIds: string[];
  summary: string;
}

/** officer_decide record. Fields are `officer` and `note` — not officerId/justification. */
export interface DecisionRecord {
  recordId: string;
  applicationId: string;
  applicantName: string;
  decision: 'approve' | 'clarify' | 'reject' | string;
  note?: string;
  officer: string;
  decidedAt: string;
  status: string;
  stagesCompleted: string[];
  riskScoreAtDecision: number | null;
  linkedApplicationIds: string[];
}

export interface ApplicationSummary {
  applicationId: string;
  applicantName: string;
  applicationType: string;
  dateOfBirth?: string;
  passportNumber?: string;
  phone?: string | null;
  email?: string | null;
  address?: string;
  documentCount?: number;
  submittedAt?: string;
  status?: string;
}

export interface DocumentRow {
  documentId: string;
  type: string;
  imageHash: string;
  issuedOn: string | null;
  expiresOn: string | null;
  statedName: string | null;
}

export interface GraphPayload {
  applicationId?: string;
  nodes?: unknown[];
  edges?: unknown[];
  clusterSize?: number;
  clusterSummary?: Record<string, unknown> | null;
}

/** The raw `/api/applications/:id` body. Every field may be absent or null. */
export interface ApplicationView {
  summary: ApplicationSummary | null;
  documents: DocumentRow[];
  progress: ApplicationProgress | null;
  risk: { score: number | null; band: string };
  duplicateSignals: DuplicateSignalsResult | null;
  graph: GraphPayload | null;
  explanation: ExplanationResult | null;
  rules: RulesResult | null;
  agent: { runs: AgentRunSummary[]; latest: AgentRunRow | null };
  decision: DecisionRecord | null;
}

/**
 * Autopilot status, mirroring AutopilotStatusSchema on the server.
 *
 * `/api/autopilot` wraps this in `{ status, lastSweep }` — see `console_.autopilot`,
 * which unwraps it so no component has to know that.
 */
export interface AutopilotStatus {
  enabled: boolean;
  mode: 'idle' | 'sweeping' | 'stopped' | string;
  intervalSeconds: number;
  sweepsCompleted: number;
  applicationsInvestigated: number;
  escalations: number;
  ringsDetected: number;
  lastSweepStartedAt: string | null;
  lastSweepFinishedAt: string | null;
  lastSweepDurationMs: number | null;
  nextSweepEta: string | null;
  currentApplicationId: string | null;
  detail: string;
}

export interface AutopilotSweepSummary {
  sweepId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  applicationsInvestigated: number;
  escalated: string[];
  ringsDetected: number;
  topPriority: {
    applicationId: string;
    applicantName: string;
    riskScore: number | null;
    recommendation: string;
    headline: string;
  } | null;
}

export interface AutopilotEnvelope {
  status: AutopilotStatus;
  lastSweep: AutopilotSweepSummary | null;
}

/** The three decisions officer_decide accepts. Anything else is rejected by Zod. */
export type DecisionVerb = 'approve' | 'clarify' | 'reject';

/** One stage as the pipeline tool reports it. `skipped` is not a failure. */
export interface PipelineStageOutcome {
  stage: string;
  status: 'completed' | 'skipped' | 'failed' | string;
  durationMs: number;
  detail?: string;
  error?: string;
}

/**
 * `run_verification_pipeline` output.
 *
 * CAREFUL: this `progress` is NOT the same shape as `ApplicationProgress`.
 * The pipeline tool returns the service's internal record — `completedStages` /
 * `missingStages` / `isComplete` / `percentComplete` — whereas the read-model
 * projection at `/api/applications/:id` renames them to `completed` / `missing` /
 * `pipelineComplete` / `percent`. Two names for one idea is exactly the sort of
 * thing that silently disables a decision gate, so both are typed distinctly and
 * the console re-reads the projection after a run rather than trusting this one.
 */
export interface PipelineRunResult {
  applicationId: string;
  applicant: ApplicationSummary;
  stages: PipelineStageOutcome[];
  progress: {
    applicationId: string;
    completedStages: string[];
    missingStages: string[];
    isComplete: boolean;
    percentComplete: number;
  };
  /** True when every required stage has completed — the officer gate is open. */
  decisionReady: boolean;
  totalDurationMs: number;
}

/** What the machine is allowed to *suggest*. Note `escalate` — which is not a DecisionVerb. */
export type Recommendation = 'approve' | 'clarify' | 'reject' | 'escalate';

export interface ConsoleHealth {
  ok: boolean;
  service: string;
  toolsRegistered: number;
  executorReady: boolean;
  autopilot: AutopilotStatus;
  sseSubscribers: number;
  latestEventId: number;
}

/** `/api/audit` returns decision records — the audit trail IS the decision log. */
export type AuditEntry = DecisionRecord;

/** One turn of the agent loop, mirroring AgentStepSchema. */
export interface AgentStep {
  step: number;
  thought: string;
  action: string;
  actionInput: Record<string, unknown>;
  observation: string;
  status: 'ok' | 'failed' | 'skipped';
  confidence: number;
  plannedBy: 'llm' | 'policy';
  durationMs: number;
  at: string;
}

/**
 * The terminal handoff. `humanDecisionRequired` is a literal `true` on the wire —
 * the machine states in its own payload that it cannot decide.
 */
export interface AgentHandoff {
  recommendation: Recommendation;
  rationale: string;
  confidence: number;
  officerChecklist: string[];
  requiresSeniorReview: boolean;
  humanDecisionRequired: true;
}

/** A full agent trace from `/api/agent/runs`. */
export interface AgentRunRow {
  runId: string;
  applicationId: string;
  goal: string;
  planner: 'llm' | 'policy';
  model: string | null;
  steps: AgentStep[];
  stopReason: 'goal_satisfied' | 'handoff' | 'max_steps' | 'blocked' | 'error' | string;
  handoff: AgentHandoff | null;
  riskScore: number | null;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
}

/**
 * The compacted per-application run summary embedded in `/api/applications/:id`.
 * `steps` is a COUNT here, not an array — the detail view does not ship every trace.
 */
export interface AgentRunSummary {
  runId: string;
  goal: string;
  planner: string;
  model: string | null;
  steps: number;
  stopReason: string;
  riskScore: number | null;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  recommendation: Recommendation | null;
  requiresSeniorReview: boolean | null;
}

export interface AgentStats {
  totalRuns: number;
  activeRuns: number;
  totalSteps: number;
  escalated: number;
  handedOff: number;
  llmPlanned: number;
}

/** One row of the autonomous queue sweep. Mirrors TriageRowSchema. */
export interface TriageRow {
  applicationId: string;
  applicantName: string;
  applicationType: string;
  riskScore: number | null;
  band: 'low' | 'medium' | 'high' | null;
  recommendation: Recommendation;
  priority: number;
  headline: string;
  clusterSize: number;
  requiresSeniorReview: boolean;
  runId: string;
}

export interface TriageResult {
  queue: TriageRow[];
  processed: number;
  escalated: string[];
  detectedRings: Array<{
    applicationIds: string[];
    size: number;
    sharedSignals: string[];
    headline: string;
  }>;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Typed console endpoints
// ---------------------------------------------------------------------------

export const console_ = {
  health: () => api.get<ConsoleHealth>('/console/health'),
  overview: () => api.get<Overview>('/overview'),

  /** Server returns `{ tools: string[], ready: boolean }` — plain names, not objects. */
  tools: () => api.get<{ tools: string[]; ready: boolean }>('/tools'),

  application: (id: string) => api.get<ApplicationView>(`/applications/${encodeURIComponent(id)}`),

  audit: (id?: string) =>
    api.get<{ applicationId: string | null; total: number; entries: AuditEntry[] }>(
      id ? `/audit?applicationId=${encodeURIComponent(id)}` : '/audit',
    ),

  agentRuns: (limit = 40) => api.get<{ total: number; runs: AgentRunRow[] }>(`/agent/runs?limit=${limit}`),
  agentStats: () => api.get<AgentStats>('/agent/stats'),

  /**
   * Event ids are monotonic integers, not opaque strings — `since` is numeric so
   * the replay window can be computed (`latestId - N`) rather than guessed.
   */
  eventHistory: (since?: number, limit = 120) =>
    api.get<{ latestId: number; events: StreamFrame[] }>(
      `/events/history?limit=${limit}${since !== undefined ? `&since=${since}` : ''}`,
    ),

  /**
   * `/api/autopilot` answers with `{ status, lastSweep }`. Unwrapping here keeps
   * every caller from having to remember the envelope (the previous bug: the
   * panel read `.mode` off the envelope and therefore rendered "idle" forever).
   */
  autopilot: async (): Promise<AutopilotEnvelope> => {
    const body = await api.get<Partial<AutopilotEnvelope>>('/autopilot');
    return { status: body.status as AutopilotStatus, lastSweep: body.lastSweep ?? null };
  },

  autopilotSweep: () =>
    api.post<{ started: boolean; summary: AutopilotSweepSummary | null; status: AutopilotStatus }>(
      '/autopilot/sweep',
    ),
  autopilotStart: () => api.post<{ status: AutopilotStatus }>('/autopilot/start'),
  autopilotStop: (reason?: string) =>
    api.post<{ status: AutopilotStatus }>('/autopilot/stop', reason ? { reason } : undefined),

  runPipeline: (id: string) =>
    api.post<{ tool: string; result: PipelineRunResult }>(
      `/applications/${encodeURIComponent(id)}/pipeline`,
    ),

  runAgent: (id: string, goal?: string) =>
    api.post<{ tool: string; result: AgentRunRow }>(
      `/applications/${encodeURIComponent(id)}/agent`,
      goal ? { goal } : undefined,
    ),

  /**
   * `officer_decide` accepts exactly `{ applicationId, decision, note? }`.
   * The officer identity is resolved server-side from `ctx.auth.subject` — a
   * client-supplied `officerId` would be both rejected by Zod and a forgery
   * vector, so it is deliberately absent here.
   */
  decide: (id: string, body: { decision: DecisionVerb; note?: string }) =>
    api.post<{ tool: string; result: DecisionRecord }>(
      `/applications/${encodeURIComponent(id)}/decision`,
      body,
    ),

  /** Like every other tool-backed write, the result is wrapped in `{ tool, result }`. */
  triage: (limit?: number) =>
    api.post<{ tool: string; result: TriageResult }>('/triage', limit ? { limit } : undefined),

  callTool: <T = unknown>(name: string, input?: Record<string, unknown>) =>
    api.post<{ tool: string; result: T }>(`/tools/${encodeURIComponent(name)}`, input ?? {}),

  // ---- Caseflow: the passport lifecycle ------------------------------------

  caseflowBoard: () => api.get<CaseflowBoard>('/caseflow/board'),

  caseFile: (arn: string) => api.get<CaseFile>(`/caseflow/cases/${encodeURIComponent(arn)}`),

  caseflowOrchestrator: () =>
    api.get<{ status: OrchestratorStatus; ticks: OrchestratorTick[] }>('/caseflow/orchestrator'),

  /**
   * File a new application. Returns the ARN the citizen would be given.
   *
   * This is `submit_passport_application` — the same tool an LLM client calls,
   * so an application filed from this form is immediately visible to the fraud
   * graph and to every other tool.
   */
  submitApplication: (input: Record<string, unknown>) =>
    api.post<{ tool: string; result: SubmitApplicationResult }>('/caseflow/applications', input),

  advanceCase: (arn: string, maxSteps = 1) =>
    api.post<{ tool: string; result: AdvanceResult }>(
      `/caseflow/cases/${encodeURIComponent(arn)}/advance`,
      { maxSteps },
    ),

  /** Run one named lifecycle step. The UI reads the tool name off `nextStep`. */
  caseStep: (arn: string, tool: string, input?: Record<string, unknown>) =>
    api.post<{ tool: string; result: Record<string, unknown> }>(
      `/caseflow/cases/${encodeURIComponent(arn)}/step/${encodeURIComponent(tool)}`,
      input ?? {},
    ),

  caseflowTick: () =>
    api.post<{ tool: string; result: { message: string; tick: OrchestratorTickResult | null } }>(
      '/caseflow/orchestrator/tick',
    ),
  caseflowStart: () =>
    api.post<{ tool: string; result: { status: OrchestratorStatus; message: string } }>(
      '/caseflow/orchestrator/start',
    ),
  caseflowStop: () =>
    api.post<{ tool: string; result: { status: OrchestratorStatus; message: string } }>(
      '/caseflow/orchestrator/stop',
    ),
};

// ---------------------------------------------------------------------------
// Caseflow types
//
// Mirrors src/contracts/caseflow.contract.ts. Duplicated rather than imported
// because src/widgets is a separate npm project that esbuild bundles standalone
// and cannot reach into src/contracts — the same constraint that forces
// AGENT_ACTIONS to be restated in page.tsx.
// ---------------------------------------------------------------------------

export type CaseStage =
  | 'submitted'
  | 'fee_paid'
  | 'appointment_booked'
  | 'psk_visit_complete'
  | 'verification_running'
  | 'police_verification'
  | 'officer_review'
  | 'clarification'
  | 'granted'
  | 'printing'
  | 'dispatched'
  | 'delivered'
  | 'rejected'
  | 'withdrawn';

export interface CaseSla {
  slaHours: number;
  hoursInStage: number;
  breached: boolean;
  consumed: number;
  dueAt: string | null;
}

export interface BoardCard {
  arn: string;
  applicationId: string;
  applicantName: string;
  applicationType: string;
  tatkal: boolean;
  stageEnteredAt: string;
  progress: number;
  sla: CaseSla;
  nextAutonomousStep: string | null;
  hold: string | null;
}

export interface BoardColumn {
  stage: CaseStage;
  label: string;
  waitingOnHuman: boolean;
  terminal: boolean;
  cases: BoardCard[];
}

export interface OrchestratorStatus {
  enabled: boolean;
  mode: 'idle' | 'running' | 'stopped';
  intervalSeconds: number;
  ticks: number;
  transitionsExecuted: number;
  casesClosed: number;
  handoffsToOfficer: number;
  slaBreaches: number;
  lastTickAt: string | null;
  nextTickEta: string | null;
  currentArn: string | null;
  detail: string;
}

export interface OrchestratorStep {
  arn: string;
  applicationId: string;
  applicantName: string;
  from: CaseStage;
  to: CaseStage | null;
  tool: string;
  ok: boolean;
  rationale: string;
  outcome: string;
  at: string;
  durationMs: number;
}

export interface OrchestratorTick {
  tickId: string;
  startedAt: string;
  durationMs: number;
  considered: number;
  advanced: number;
  blockedOnHuman: number;
  slaBreaches: number;
  steps: OrchestratorStep[];
  narrative: string;
}

export interface OrchestratorTickResult {
  tickId: string;
  casesConsidered: number;
  casesAdvanced: number;
  blockedOnHuman: number;
  slaBreaches: number;
  steps: Array<Omit<OrchestratorStep, 'applicationId' | 'at' | 'durationMs'>>;
}

export interface CaseflowBoard {
  generatedAt: string;
  totals: { cases: number; waitingOnHuman: number; breached: number; closed: number };
  columns: BoardColumn[];
  orchestrator: OrchestratorStatus;
}

export interface CaseJournalEntry {
  seq: number;
  at: string;
  stage: CaseStage;
  fromStage: CaseStage | null;
  actor: string;
  by: string;
  tool: string;
  summary: string;
  rationale: string;
  detail: Record<string, unknown>;
}

export interface CaseFile {
  arn: string;
  applicationId: string;
  applicantName: string;
  applicationType: string;
  tatkal: boolean;
  stage: CaseStage;
  stageEnteredAt: string;
  openedAt: string;
  closedAt: string | null;
  officerDecision: 'approve' | 'clarify' | 'reject' | null;
  sla: CaseSla;
  normalizedAddress: string;
  fee: { amount: number; receiptNo: string; paidAt: string; method: string } | null;
  appointment: { pskCode: string; pskName: string; slot: string; tokenNo: string } | null;
  pskVisit: {
    completedAt: string;
    counterA: boolean;
    counterB: boolean;
    counterC: boolean;
    biometrics: { photo: boolean; fingerprints: number; signature: boolean };
    documentsGranted: string[];
    documentsMissing: string[];
  } | null;
  policeVerification: {
    requestedAt: string;
    district: string;
    station: string;
    referenceNo: string;
    verdict: string | null;
    reportedAt: string | null;
    remarks: string | null;
  } | null;
  clarification: {
    requestedAt: string;
    question: string;
    respondedAt: string | null;
    response: string | null;
  } | null;
  booklet: {
    passportNumber: string;
    printedAt: string;
    pages: number;
    validUntil: string;
    printQueue: string;
  } | null;
  dispatch: {
    dispatchedAt: string;
    courier: string;
    trackingNo: string;
    deliveredAt: string | null;
  } | null;
  journal: CaseJournalEntry[];
}

export interface SubmitApplicationResult {
  arn: string;
  applicationId: string;
  stage: CaseStage;
  feeDue?: { amount: number; currency: string };
  documentChecklist?: { required: string[]; supplied: string[]; missing: string[] };
  nextStep?: string;
  message?: string;
}

export interface AdvanceResult {
  arn: string;
  applicantName: string;
  fromStage: CaseStage;
  toStage: CaseStage;
  toStageLabel: string;
  progressPercent: number;
  stepsExecuted: number;
  stepsFailed: number;
  steps: Array<{
    from: CaseStage;
    to: CaseStage | null;
    tool: string;
    ok: boolean;
    rationale: string;
    outcome: string;
  }>;
  stopped: string;
  handedToOfficer: boolean;
  nextAutonomousStep: string | null;
}

/** Lifecycle order, for rendering the board and the journey timeline. */
export const CASE_STAGE_ORDER: readonly CaseStage[] = [
  'submitted',
  'fee_paid',
  'appointment_booked',
  'psk_visit_complete',
  'verification_running',
  'police_verification',
  'officer_review',
  'clarification',
  'granted',
  'printing',
  'dispatched',
  'delivered',
  'rejected',
  'withdrawn',
];

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
  submitted: 'Application filed',
  fee_paid: 'Fee paid',
  appointment_booked: 'Appointment booked',
  psk_visit_complete: 'PSK visit complete',
  verification_running: 'Verification running',
  police_verification: 'Police verification',
  officer_review: 'Awaiting officer',
  clarification: 'Clarification pending',
  granted: 'Granted',
  printing: 'Printing',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

// ---------------------------------------------------------------------------
// SSE bridge
// ---------------------------------------------------------------------------

export interface StreamHandle {
  close(): void;
}

/**
 * Subscribe to the server event stream and republish every frame on the shared
 * bus, plus a few derived domain events so existing teammate components that
 * listen for `riskUpdated` / `applicantUpdated` keep working unchanged.
 *
 * Reconnection: `EventSource` retries on its own, but it does not resend
 * `Last-Event-ID` if the *page* re-subscribes. We track the last id and rebuild
 * the source with it in the query string, so a dropped connection replays the
 * gap instead of silently losing events mid-demo.
 */
export function subscribeStream(onFrame?: (frame: StreamFrame) => void): StreamHandle {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return { close: () => undefined };
  }

  let lastId: string | null = null;
  let closed = false;
  let source: EventSource | null = null;
  let attempt = 0;
  let retryTimer: number | null = null;

  const publish = (frame: StreamFrame): void => {
    events.emit('stream', frame);
    onFrame?.(frame);

    const p = frame.payload ?? {};
    const appId = typeof p.applicationId === 'string' ? p.applicationId : undefined;

    if (appId) {
      events.emit('applicantUpdated', { applicantId: appId });
      if (frame.event === 'risk.scored' && typeof p.riskScore === 'number') {
        events.emit('riskUpdated', { applicantId: appId, score: p.riskScore });
      }
    }
    if (frame.event.startsWith('agent.')) {
      const runId = typeof p.runId === 'string' ? p.runId : (appId ?? 'unknown');
      events.emit('investigationUpdated', { investigationId: runId });
    }
    if (frame.event === 'agent.escalated' && appId) {
      events.emit('notification', { message: `Agent escalated ${appId}`, type: 'warning' });
    }
  };

  const connect = (): void => {
    if (closed) return;
    events.emit('connection', { state: 'connecting', attempt });

    const url = lastId
      ? `${buildUrl('/events')}?lastEventId=${encodeURIComponent(lastId)}`
      : buildUrl('/events');

    source = new EventSource(url);

    source.onopen = () => {
      attempt = 0;
      events.emit('connection', { state: 'open' });
    };

    source.onmessage = (msg: MessageEvent<string>) => {
      if (msg.lastEventId) lastId = msg.lastEventId;
      let frame: StreamFrame;
      try {
        const parsed = JSON.parse(msg.data) as Partial<StreamFrame> & { type?: string };
        frame = {
          id: parsed.id ?? msg.lastEventId,
          event: parsed.event ?? parsed.type ?? 'event',
          at: parsed.at ?? new Date().toISOString(),
          payload: (parsed.payload ?? {}) as Record<string, unknown>,
        };
      } catch {
        return; // a malformed frame is not worth tearing the stream down for
      }
      publish(frame);
    };

    source.onerror = () => {
      events.emit('connection', { state: 'closed', attempt });
      source?.close();
      source = null;
      if (closed) return;
      attempt += 1;
      // EventSource's own backoff is opaque; ours is visible and capped.
      const delay = Math.min(15000, 1000 * 2 ** Math.min(attempt, 4));
      retryTimer = window.setTimeout(connect, delay);
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      source?.close();
      events.emit('connection', { state: 'closed' });
    },
  };
}

// ---------------------------------------------------------------------------
// Adapters: live console shapes -> teammate component prop shapes
// ---------------------------------------------------------------------------

/** Manas's `ApplicantRecord` (components/ApplicantTable.tsx) from a live queue row. */
export function toApplicantRecord(row: QueueRow): {
  id: string;
  name: string;
  country: string;
  type: string;
  submitted: string;
  risk: 'Low' | 'Medium' | 'High';
  status: 'Verified' | 'In Review' | 'Clarification' | 'Queued';
  owner: string;
} {
  const risk = row.riskBand === 'high' ? 'High' : row.riskBand === 'medium' ? 'Medium' : 'Low';
  // The wire verb is 'clarify' (OfficerDecisionSchema). An earlier revision tested
  // for 'request_clarification', which never matched, so clarified cases silently
  // rendered as "In Review".
  const status: 'Verified' | 'In Review' | 'Clarification' | 'Queued' =
    row.decision === 'approve'
      ? 'Verified'
      : row.decision === 'clarify'
        ? 'Clarification'
        : row.pipelineComplete
          ? 'In Review'
          : 'Queued';

  return {
    id: row.applicationId,
    name: row.applicantName,
    country: 'India',
    type: row.applicationType,
    submitted: row.submittedAt,
    risk,
    status,
    owner: row.agentRuns > 0 ? 'AI Agent' : 'Queue',
  };
}

/** Manas's `PipelineStep` (components/PipelineTimeline.tsx) from stage records. */
export function toPipelineSteps(
  completed: Array<{ stage: string; completedAt?: string }>,
  missing: string[],
): Array<{ id: string; title: string; description: string; status: 'complete' | 'active' | 'pending'; timestamp?: string }> {
  const done = completed.map((s) => ({
    id: s.stage,
    title: humaniseStage(s.stage),
    description: `Stage completed and written to the audit trail.`,
    status: 'complete' as const,
    timestamp: s.completedAt,
  }));

  const pending = missing.map((stage, i) => ({
    id: stage,
    title: humaniseStage(stage),
    description: 'Not yet run for this application.',
    status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending',
  }));

  return [...done, ...pending];
}

export function humaniseStage(stage: string): string {
  return stage
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Copilot chat + officer session (login) — mirrors /api/chat and /api/auth/*
// ---------------------------------------------------------------------------

export interface ChatAction {
  tool: string;
  ok: boolean;
  summary: string;
}

export interface ChatTurn {
  id: string;
  role: 'officer' | 'copilot';
  text: string;
  at: string;
  officer?: string;
  actions?: ChatAction[];
  suggestions?: string[];
  applicationId?: string;
  mode?: 'llm' | 'deterministic';
}

export interface OfficerSession {
  token: string;
  officer: { name: string; badgeId: string; role: string; signedInAt?: string };
  signedInAt?: string;
}

export const copilot = {
  send: (message: string, sessionId: string, officer?: string) =>
    api.post<{ sessionId: string; turn: ChatTurn; latestTurnId: string }>('/chat', {
      message,
      sessionId,
      ...(officer ? { officer } : {}),
    }),
  history: (sessionId: string) =>
    api.get<{ sessionId: string | null; turns: ChatTurn[] }>(
      `/chat/history?sessionId=${encodeURIComponent(sessionId)}`,
    ),
};

const SESSION_KEY = 'piq.session';

/**
 * The officer session, read from localStorage. Written by /login; the console
 * treats its absence as "not signed in" and redirects. Identity for
 * accountability, not authentication — see login.page.ts server-side.
 */
export function readOfficerSession(): OfficerSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfficerSession;
    return parsed && parsed.officer && parsed.officer.name ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOfficerSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
