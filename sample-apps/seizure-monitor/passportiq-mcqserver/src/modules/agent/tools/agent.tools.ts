/**
 * The agent's MCP surface.
 *
 * Four tools, and the split between them is deliberate:
 *
 *   agent_investigate         run the autonomous loop on one application
 *   agent_triage_queue        sweep and rank the whole queue
 *   agent_recommend_decision  read back the recommendation WITHOUT re-running
 *   get_agent_trace           read back the full reasoning trace
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT HERE, AND WHY THAT IS THE POINT
 * ---------------------------------------------------------------------------
 * There is no `agent_decide`, no `agent_approve`, no autopilot that writes an
 * outcome. `officer_decide` lives in PipelineModule behind PipelineCompleteGuard,
 * which requires a human `officer` identity on the input. The agent's entire
 * authority is the recommendation object it hands over.
 *
 * That is not a limitation to apologise for — it is the product's central claim.
 * An officer is accountable for a passport decision, so the machine's job is to
 * make the file reviewable in two minutes instead of forty, not to decide it.
 *
 * ---------------------------------------------------------------------------
 * NO @Cache ON ANY OF THESE
 * ---------------------------------------------------------------------------
 * `agent_investigate` and `agent_triage_queue` have side effects: they drive real
 * tool calls, which record pipeline stages and emit events. A cache HIT skips the
 * handler entirely, so a cached "investigation" would return a stale trace while
 * recording nothing — and the officer's decision gate would stay locked with no
 * visible cause. The read-only tools below are cheap map lookups, so caching them
 * would add a staleness bug to save nothing.
 */
// NOTE: core exports `Tool` as the Tool CLASS and the DECORATOR as `ToolDecorator`.
// Importing `Tool` directly and using it as `@Tool({...})` fails with
// "Value of type 'typeof Tool' is not callable" — aliasing is the convention used
// by every other tool file in this project.
import { Injectable, ToolDecorator as Tool, Widget, type ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import {
  AgentGoalSchema,
  AgentRunSchema,
  TriageResultSchema,
  type AgentRun,
  type TriageResult,
} from '../../../contracts/index.js';
import { parse } from '../../verification/tools/document.tools.js';
import { AgentMemoryService } from '../services/agent-memory.service.js';
import { AgentRunnerService } from '../services/agent-runner.service.js';
import { TriageService } from '../services/triage.service.js';
import { AGENT_MAX_STEPS } from '../agent-policy.js';

const AgentInvestigateInputSchema = z.object({
  applicationId: z.string().min(1).describe('The application to investigate, e.g. PIQ-2026-2001.'),
  goal: AgentGoalSchema.optional().describe(
    "What the agent should try to achieve. 'assess_application' (default) is a balanced " +
      "review; 'investigate_fraud_signal' chases the fraud hypothesis and will spend extra " +
      'turns on the cluster.'
  ),
  maxSteps: z
    .number()
    .int()
    .positive()
    .max(AGENT_MAX_STEPS)
    .optional()
    .describe(`Turn budget, 1-${AGENT_MAX_STEPS}. Defaults to the full budget.`),
});

const AgentTriageInputSchema = z.object({
  applicationIds: z
    .array(z.string().min(1))
    .optional()
    .describe('Restrict the sweep to these applications. Defaults to the entire queue.'),
  maxApplications: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Cap how many applications to sweep.'),
});

const ApplicationIdInputSchema = z.object({
  applicationId: z.string().min(1),
});

const AgentTraceInputSchema = z.object({
  applicationId: z
    .string()
    .min(1)
    .optional()
    .describe('Return the latest run for this application.'),
  runId: z.string().min(1).optional().describe('Return one specific run by id.'),
});

/** agent_recommend_decision output. Mirrors the handoff plus provenance. */
const AgentRecommendationSchema = z.object({
  applicationId: z.string(),
  runId: z.string(),
  recommendation: z.enum(['approve', 'clarify', 'reject', 'escalate']),
  rationale: z.string(),
  confidence: z.number(),
  officerChecklist: z.array(z.string()),
  requiresSeniorReview: z.boolean(),
  humanDecisionRequired: z.literal(true),
  riskScore: z.number().nullable(),
  stepsTaken: z.number(),
  plannedBy: z.enum(['llm', 'policy']),
  model: z.string().nullable(),
  investigatedAt: z.string(),
});
type AgentRecommendation = z.infer<typeof AgentRecommendationSchema>;

const AgentTraceSchema = z.object({
  found: z.boolean(),
  run: AgentRunSchema.nullable(),
  /** Every run id known for this application, so a UI can offer history. */
  availableRunIds: z.array(z.string()),
});
type AgentTrace = z.infer<typeof AgentTraceSchema>;

@Injectable({ deps: [AgentRunnerService, TriageService, AgentMemoryService] })
export class AgentTools {
  constructor(
    private readonly runner: AgentRunnerService,
    private readonly triage: TriageService,
    private readonly memory: AgentMemoryService
  ) {}

  /**
   * Run the autonomous investigation loop.
   *
   * The returned AgentRun contains the full step-by-step trace: what the agent
   * thought, which tool it chose, what came back, and how confident it was after
   * each turn. Two different applications produce two different step sequences,
   * because nothing pre-declares the sequence.
   */
  @Tool({
    name: 'agent_investigate',
    title: 'Agent: investigate an application autonomously',
    description:
      'Run the autonomous verification agent on one application. The agent decides its own ' +
      'next action each turn based on what it has learned so far — it is not a fixed pipeline. ' +
      'It reacts to its own findings (for example, it only compares photographs when it has ' +
      'already found a reused document image, and it picks the comparison target from those ' +
      'findings), spends extra turns when its confidence is low, and terminates by handing the ' +
      'case to a human officer with a recommendation and a worst-first checklist. The agent ' +
      'CANNOT approve or reject an application — that authority is the officer\'s alone. ' +
      'Returns the complete reasoning trace for audit.',
    inputSchema: AgentInvestigateInputSchema,
    outputSchema: AgentRunSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  })
  @Widget('agent-console')
  async agentInvestigate(rawInput: unknown, ctx: ExecutionContext): Promise<AgentRun> {
    const input = parse(AgentInvestigateInputSchema, rawInput, 'agent_investigate');

    return this.runner.run({
      applicationId: input.applicationId,
      ...(input.goal ? { goal: input.goal } : {}),
      ...(input.maxSteps ? { maxSteps: input.maxSteps } : {}),
      ctx,
    });
  }

  /**
   * Sweep the whole queue and rank it.
   *
   * This is the tool a supervisor runs at 09:00. It investigates every pending
   * application, then correlates across all of them to surface rings that are
   * invisible in any single file.
   */
  @Tool({
    name: 'agent_triage_queue',
    title: 'Agent: triage the whole application queue',
    description:
      'Autonomously investigate every pending application, then correlate the results ACROSS ' +
      'the queue to surface coordinated fraud rings that no single-file review can see. ' +
      'Returns the officer work queue ordered by genuine urgency — senior-review cases first, ' +
      'then by risk score, then by how many other applicants are implicated — plus the list of ' +
      'detected rings. Every row carries the agent run id that produced it, so any ranking can ' +
      'be traced back to the reasoning behind it.',
    inputSchema: AgentTriageInputSchema,
    outputSchema: TriageResultSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  })
  async agentTriageQueue(rawInput: unknown, ctx: ExecutionContext): Promise<TriageResult> {
    const input = parse(AgentTriageInputSchema, rawInput, 'agent_triage_queue');

    return this.triage.sweep({
      ...(input.applicationIds ? { applicationIds: input.applicationIds } : {}),
      ...(input.maxApplications ? { maxApplications: input.maxApplications } : {}),
      ctx,
    });
  }

  /**
   * Read back the agent's recommendation for an application.
   *
   * Reads the LATEST STORED run rather than investigating again, and that choice
   * is load-bearing: an officer clicking "what does the agent think?" must see the
   * reasoning that produced the recommendation on their screen. A fresh run could
   * legitimately reach a different conclusion (the LLM planner is not
   * deterministic), and a recommendation whose stated rationale describes a
   * different run is worse than no recommendation.
   *
   * If nothing has been investigated yet it says so, rather than silently
   * investigating and hiding the latency.
   */
  @Tool({
    name: 'agent_recommend_decision',
    title: 'Agent: recommendation for the officer',
    description:
      "Read back the agent's recommendation for an application from its most recent " +
      'investigation, including the worst-first officer checklist and whether senior review is ' +
      'requested. This is a RECOMMENDATION ONLY: humanDecisionRequired is always true, and the ' +
      'agent has no path to officer_decide. Does not re-investigate — call agent_investigate ' +
      'first if no run exists yet, so that the rationale you read always describes the run that ' +
      'actually produced it.',
    inputSchema: ApplicationIdInputSchema,
    outputSchema: AgentRecommendationSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  })
  async agentRecommendDecision(rawInput: unknown): Promise<AgentRecommendation> {
    const input = parse(ApplicationIdInputSchema, rawInput, 'agent_recommend_decision');
    const run = this.memory.getLatestRunFor(input.applicationId);

    if (!run || !run.handoff) {
      throw new Error(
        `No completed agent investigation exists for ${input.applicationId}. Call ` +
          `agent_investigate first. (Returning a recommendation without a run behind it would ` +
          `give the officer a verdict with no auditable reasoning, which is the one thing this ` +
          `tool must not do.)`
      );
    }

    return {
      applicationId: run.applicationId,
      runId: run.runId,
      recommendation: run.handoff.recommendation,
      rationale: run.handoff.rationale,
      confidence: run.handoff.confidence,
      officerChecklist: run.handoff.officerChecklist,
      requiresSeniorReview: run.handoff.requiresSeniorReview,
      humanDecisionRequired: true,
      riskScore: run.riskScore,
      stepsTaken: run.steps.length,
      plannedBy: run.planner,
      model: run.model,
      investigatedAt: run.finishedAt,
    };
  }

  /**
   * Fetch a reasoning trace.
   *
   * The trace is the artefact that makes the autonomy reviewable rather than
   * merely asserted, so it is a first-class read: failed steps included, and the
   * planner's overridden LLM proposals included, because a trace that only shows
   * the successful path describes a run that did not happen.
   */
  @Tool({
    name: 'get_agent_trace',
    title: "Agent: full reasoning trace",
    description:
      'Fetch the complete step-by-step reasoning trace of an agent run — every thought, the ' +
      'action chosen, the arguments it derived, what it observed back, its confidence at that ' +
      'point, and whether the turn was planned by an LLM or by the deterministic policy. ' +
      'Failed steps and overridden LLM proposals are included on purpose: this is an audit ' +
      'record, not a highlight reel. Pass runId for a specific run, or applicationId for the ' +
      'most recent run on that application.',
    inputSchema: AgentTraceInputSchema,
    outputSchema: AgentTraceSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  })
  async getAgentTrace(rawInput: unknown): Promise<AgentTrace> {
    const input = parse(AgentTraceInputSchema, rawInput, 'get_agent_trace');

    if (!input.runId && !input.applicationId) {
      throw new Error('get_agent_trace requires either runId or applicationId.');
    }

    const run = input.runId
      ? this.memory.getRun(input.runId)
      : this.memory.getLatestRunFor(input.applicationId as string);

    const availableRunIds = input.applicationId
      ? this.memory.getRunsFor(input.applicationId).map((r) => r.runId)
      : this.memory.getAllRuns().map((r) => r.runId);

    return { found: Boolean(run), run: run ?? null, availableRunIds };
  }
}
