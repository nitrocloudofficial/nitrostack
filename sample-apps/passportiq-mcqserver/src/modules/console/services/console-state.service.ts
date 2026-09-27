/**
 * ConsoleStateService — one read model for the officer console.
 *
 * WHY THIS EXISTS RATHER THAN THE BROWSER CALLING SIX TOOLS
 * --------------------------------------------------------
 * The console's first paint needs the queue, each application's stage progress,
 * its risk band, its cluster size and whether a decision was already recorded.
 * Assembled from tools, that is six round trips per row and nine rows — 54 calls
 * before anything renders, each one re-running guards and schema parses that
 * produce data the console then throws away.
 *
 * This service reads the SAME singletons those tools read (ApplicationService,
 * PipelineStateService, GraphService, AgentMemoryService, AuditLogService) and
 * projects them into exactly the shape the UI draws. It is a projection, never a
 * second source of truth:
 *
 *   - it NEVER mutates anything;
 *   - it NEVER computes a verdict — risk scores come from PipelineStateService,
 *     which only ever receives them from the real score_risk stage;
 *   - anything that changes state (running the pipeline, running the agent,
 *     recording a decision) goes through ToolExecutorService instead, so guards
 *     and audit logging still apply.
 *
 * That split is what keeps the console honest: the read path is fast and
 * denormalised, the write path is the same guarded MCP tool path an LLM client
 * would take.
 */
import { Injectable } from '@nitrostack/core';
import {
  PIPELINE_STAGES,
  REQUIRED_STAGES_BEFORE_DECISION,
  type DecisionRecord,
} from '../../../contracts/index.js';
import { AgentMemoryService } from '../../agent/services/agent-memory.service.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { AuditLogService } from '../../pipeline/services/audit-log.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';

export type RiskBand = 'low' | 'medium' | 'high' | 'unknown';

/** One row of the console queue. Everything the list view draws, nothing more. */
export interface ConsoleQueueRow {
  applicationId: string;
  applicantName: string;
  applicationType: string;
  status: string;
  submittedAt: string;
  riskScore: number | null;
  riskBand: RiskBand;
  stagesCompleted: number;
  stagesTotal: number;
  pipelineComplete: boolean;
  /** Subject + everyone sharing an identifier with them. 1 means isolated. */
  clusterSize: number;
  linkedApplicationIds: string[];
  /** Reused phone / address / document-image hits found by the signal index. */
  signalCount: number;
  decision: string | null;
  decidedAt: string | null;
  agentRuns: number;
  lastAgentRunId: string | null;
  /** Officer-readable one-liner: the reason this row sits where it does. */
  headline: string;
}

export interface ConsoleOverview {
  generatedAt: string;
  totals: {
    applications: number;
    pending: number;
    decided: number;
    pipelinesComplete: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    unscored: number;
    /** Applications sharing at least one identifier with another application. */
    linked: number;
    /** Distinct multi-application clusters — candidate fraud rings. */
    rings: number;
    largestRing: number;
    agentRuns: number;
    escalations: number;
    auditEntries: number;
  };
  queue: ConsoleQueueRow[];
  rings: Array<{
    applicationIds: string[];
    size: number;
    sharedSignalKinds: string[];
    headline: string;
  }>;
}

/** Everything the detail view needs for one application, in one response. */
export interface ConsoleApplicationView {
  summary: ReturnType<ApplicationService['getSummary']>;
  documents: Array<{
    documentId: string;
    type: string;
    imageHash: string;
    issuedOn: string | null;
    expiresOn: string | null;
    statedName: string | null;
  }>;
  progress: {
    completed: string[];
    missing: string[];
    percent: number;
    pipelineComplete: boolean;
    requiredBeforeDecision: string[];
    stages: Array<{
      stage: string;
      completed: boolean;
      required: boolean;
      at: string | null;
      result: unknown;
    }>;
  };
  risk: { score: number | null; band: RiskBand };
  duplicateSignals: unknown;
  graph: unknown;
  explanation: unknown;
  rules: unknown;
  agent: {
    runs: Array<{
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
      recommendation: string | null;
      requiresSeniorReview: boolean | null;
    }>;
    latest: unknown;
  };
  decision: DecisionRecord | null;
}

@Injectable({
  deps: [
    ApplicationService,
    PipelineStateService,
    GraphService,
    AgentMemoryService,
    AuditLogService,
  ],
})
export class ConsoleStateService {
  constructor(
    private readonly applications: ApplicationService,
    private readonly state: PipelineStateService,
    private readonly graph: GraphService,
    private readonly agentMemory: AgentMemoryService,
    private readonly audit: AuditLogService
  ) {}

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  /**
   * The console's first paint, and the autopilot's view of "what needs work".
   *
   * Rows are ordered the way an officer should actually work the queue:
   * highest risk first, then largest cluster, then least-progressed. A pending
   * high-risk ring member therefore sorts above an already-approved low-risk
   * renewal without the UI needing any sort logic of its own.
   */
  getOverview(): ConsoleOverview {
    const rows = this.applications.getIds().map((id) => this.buildQueueRow(id));
    rows.sort(compareQueueRows);

    const clusters = this.graph.getAllClusters().filter((cluster) => cluster.length > 1);
    const rings = clusters.map((applicationIds) => {
      // The cluster's shared-signal kinds come from the subject's own signal set;
      // any member of the cluster reports the same kinds by construction.
      const [first] = applicationIds;
      const signals = first ? this.graph.findReusedSignals(first) : null;
      const kinds = signals ? unique(signals.signals.map((signal) => signal.type)) : [];

      return {
        applicationIds,
        size: applicationIds.length,
        sharedSignalKinds: kinds,
        headline:
          `${applicationIds.length} applications share ` +
          `${kinds.length > 0 ? kinds.join(', ') : 'identifying data'} — ` +
          `coordinated-submission pattern`,
      };
    });
    rings.sort((a, b) => b.size - a.size);

    const bandCount = (band: RiskBand): number =>
      rows.filter((row) => row.riskBand === band).length;

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        applications: rows.length,
        pending: rows.filter((row) => row.decision === null).length,
        decided: rows.filter((row) => row.decision !== null).length,
        pipelinesComplete: rows.filter((row) => row.pipelineComplete).length,
        highRisk: bandCount('high'),
        mediumRisk: bandCount('medium'),
        lowRisk: bandCount('low'),
        unscored: bandCount('unknown'),
        linked: rows.filter((row) => row.clusterSize > 1).length,
        rings: rings.length,
        largestRing: rings[0]?.size ?? 0,
        agentRuns: this.agentMemory.getAllRuns().length,
        escalations: this.agentMemory
          .getAllRuns()
          .filter((run) => run.handoff?.recommendation === 'escalate').length,
        auditEntries: this.audit.size(),
      },
      queue: rows,
      rings,
    };
  }

  /** Ids ordered by urgency — the autopilot sweeps in exactly this order. */
  getPriorityOrder(): string[] {
    return this.getOverview().queue.map((row) => row.applicationId);
  }

  // ---------------------------------------------------------------------------
  // Detail
  // ---------------------------------------------------------------------------

  /**
   * Full detail for one application.
   *
   * Stage results are served from PipelineStateService rather than re-executed.
   * Re-running a stage to render a page would (a) double every audit event and
   * (b) let a page refresh change what the officer is looking at, which is
   * disqualifying for a review tool.
   */
  getApplicationView(applicationId: string): ConsoleApplicationView {
    // Throws ApplicationNotFoundError listing the known ids — the HTTP layer
    // turns that into a 404 with a useful body.
    const summary = this.applications.getSummary(applicationId);
    const progress = this.state.getProgress(applicationId);
    const records = this.state.getStageRecords(applicationId);
    const recordFor = new Map(records.map((record) => [record.stage, record]));

    const riskScore = this.state.getRiskScore(applicationId);
    const runs = this.agentMemory.getRunsFor(applicationId);

    return {
      summary,
      documents: this.applications.getDocuments(applicationId).map((document) => ({
        documentId: document.documentId,
        type: document.type,
        imageHash: document.imageHash,
        issuedOn: document.issuedOn ?? null,
        expiresOn: document.expiresOn ?? null,
        statedName: document.statedName ?? null,
      })),
      progress: {
        completed: progress.completedStages,
        missing: progress.missingStages,
        percent: progress.percentComplete,
        pipelineComplete: progress.isComplete,
        requiredBeforeDecision: [...REQUIRED_STAGES_BEFORE_DECISION],
        stages: PIPELINE_STAGES.map((stage) => {
          const record = recordFor.get(stage);
          return {
            stage,
            completed: record !== undefined,
            required: REQUIRED_STAGES_BEFORE_DECISION.includes(stage),
            at: record?.completedAt ?? null,
            result: this.state.getStageResult(applicationId, stage) ?? null,
          };
        }),
      },
      risk: { score: riskScore, band: bandFor(riskScore) },
      // Signals and the graph are pure functions of the seeded pool, so they are
      // safe (and useful) to compute even before the pipeline has run — the
      // console can show the cluster the moment a case is opened.
      duplicateSignals: safely(() => this.graph.findReusedSignals(applicationId)),
      graph: safely(() => this.graph.buildGraph(applicationId, true)),
      explanation: this.state.getStageResult(applicationId, 'explain_risk') ?? null,
      rules: this.state.getStageResult(applicationId, 'evaluate_rules') ?? null,
      agent: {
        runs: runs.map((run) => ({
          runId: run.runId,
          goal: run.goal,
          planner: run.planner,
          model: run.model,
          steps: run.steps.length,
          stopReason: run.stopReason,
          riskScore: run.riskScore,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          totalDurationMs: run.totalDurationMs,
          recommendation: run.handoff?.recommendation ?? null,
          requiresSeniorReview: run.handoff?.requiresSeniorReview ?? null,
        })),
        latest: this.agentMemory.getLatestRunFor(applicationId) ?? null,
      },
      decision: this.applications.getDecision(applicationId) ?? null,
    };
  }

  /** Audit trail, newest first, for the console's compliance panel. */
  getAuditTrail(applicationId?: string): { entries: DecisionRecord[]; total: number } {
    const trail = applicationId ? this.audit.getTrail(applicationId) : this.audit.getTrail();
    return { entries: [...trail.entries].reverse(), total: trail.total };
  }

  /** Agent traces across every application, newest first. */
  getAgentRuns(limit = 40): unknown[] {
    return this.agentMemory
      .getAllRuns()
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private buildQueueRow(applicationId: string): ConsoleQueueRow {
    const summary = this.applications.getSummary(applicationId);
    const progress = this.state.getProgress(applicationId);
    const riskScore = this.state.getRiskScore(applicationId);
    const linked = this.graph.getLinkedApplicationIds(applicationId);
    const signals = safely(() => this.graph.findReusedSignals(applicationId));
    const decision = this.applications.getDecision(applicationId);
    const runs = this.agentMemory.getRunsFor(applicationId);
    const latestRun = runs[runs.length - 1];

    const signalCount =
      signals && typeof signals === 'object' && Array.isArray((signals as { signals?: unknown[] }).signals)
        ? ((signals as { signals: unknown[] }).signals.length)
        : 0;

    return {
      applicationId,
      applicantName: summary.applicantName,
      applicationType: summary.applicationType,
      status: summary.status,
      submittedAt: summary.submittedAt,
      riskScore,
      riskBand: bandFor(riskScore),
      stagesCompleted: progress.completedStages.length,
      stagesTotal: PIPELINE_STAGES.length,
      pipelineComplete: progress.isComplete,
      clusterSize: linked.length + 1,
      linkedApplicationIds: linked,
      signalCount,
      decision: decision?.decision ?? null,
      decidedAt: decision?.decidedAt ?? null,
      agentRuns: runs.length,
      lastAgentRunId: latestRun?.runId ?? null,
      headline: headlineFor({
        riskScore,
        clusterSize: linked.length + 1,
        signalCount,
        decided: decision !== undefined,
        recommendation: latestRun?.handoff?.recommendation ?? null,
        stagesCompleted: progress.completedStages.length,
      }),
    };
  }
}

// -----------------------------------------------------------------------------
// Pure helpers — exported where the tests assert on them directly.
// -----------------------------------------------------------------------------

/**
 * Band thresholds mirror RiskService's bands. They are duplicated rather than
 * imported because this is a *display* concern: if the risk model's thresholds
 * ever move, the console must keep rendering (with a stale label) instead of
 * failing to compile, and the label is never used to make a decision.
 */
export function bandFor(score: number | null): RiskBand {
  if (score === null) return 'unknown';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/** Highest risk first, then biggest cluster, then least progress, then id. */
function compareQueueRows(a: ConsoleQueueRow, b: ConsoleQueueRow): number {
  // Undecided work outranks anything already signed off.
  const aOpen = a.decision === null ? 0 : 1;
  const bOpen = b.decision === null ? 0 : 1;
  if (aOpen !== bOpen) return aOpen - bOpen;

  const aScore = a.riskScore ?? -1;
  const bScore = b.riskScore ?? -1;
  if (aScore !== bScore) return bScore - aScore;

  if (a.clusterSize !== b.clusterSize) return b.clusterSize - a.clusterSize;
  if (a.signalCount !== b.signalCount) return b.signalCount - a.signalCount;
  if (a.stagesCompleted !== b.stagesCompleted) return a.stagesCompleted - b.stagesCompleted;
  return a.applicationId.localeCompare(b.applicationId);
}

function headlineFor(input: {
  riskScore: number | null;
  clusterSize: number;
  signalCount: number;
  decided: boolean;
  recommendation: string | null;
  stagesCompleted: number;
}): string {
  if (input.decided) {
    return 'Decision recorded by officer — case closed, retained in audit trail.';
  }

  if (input.clusterSize > 2) {
    return (
      `Linked to ${input.clusterSize - 1} other live applications through ` +
      `${input.signalCount} reused identifier${input.signalCount === 1 ? '' : 's'} — ` +
      `treat as a coordinated submission.`
    );
  }

  if (input.clusterSize === 2) {
    return `Shares identifying data with 1 other application — possible duplicate identity.`;
  }

  if (input.recommendation === 'escalate') {
    return 'Agent could not resolve this case on the evidence available — senior review requested.';
  }

  if (input.riskScore === null) {
    return input.stagesCompleted === 0
      ? 'Not yet processed — no verification stage has run.'
      : `Partially processed (${input.stagesCompleted} stages) — no risk score yet.`;
  }

  if (input.riskScore >= 70) return 'High risk score with no cross-application link — document-level findings.';
  if (input.riskScore >= 40) return 'Medium risk — at least one rule fired and needs an officer eye.';
  return 'No adverse findings — clean documents and no shared identifiers.';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Run a read that depends on the seeded pool, returning null instead of throwing.
 *
 * The console renders many panels at once; one panel whose underlying read is
 * unavailable must degrade to "no data" rather than 500 the whole page and hide
 * the eight panels that were fine.
 */
function safely<T>(read: () => T): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}
