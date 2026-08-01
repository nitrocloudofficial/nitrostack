/**
 * AgentRunnerService — the observe → think → act → observe loop.
 *
 * ---------------------------------------------------------------------------
 * THE LOOP
 * ---------------------------------------------------------------------------
 *   while (budget remains):
 *     observation = observe(what the tools have actually recorded)
 *     turn        = planner.plan(observation)          <- ONE action, not a list
 *     if turn.action == handoff_to_officer: break
 *     result      = toolExecutor.call(turn.action, turn.actionInput)
 *     record the step verbatim (including failures)
 *
 * Note what is absent: any array of stage names. The loop does not know how many
 * turns it will take, and it cannot — the number depends on what the tools return.
 * A clean application terminates in fewer turns than a ring subject because its
 * observation satisfies the stopping condition sooner.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY ACTION GOES THROUGH ToolExecutorService
 * ---------------------------------------------------------------------------
 * The agent could import RiskService and call it directly. It deliberately does
 * not. Routing through the tool registry means every autonomous action passes the
 * same guards, the same input validation and the same `ctx.emit` path as a call
 * made by a human through an MCP client. Consequences that matter:
 *
 *   - the agent physically cannot reach a tool that is not registered;
 *   - PipelineStateService records agent-driven stages identically, so the
 *     officer's decision gate opens for agent work exactly as for manual work;
 *   - the dashboard event stream shows agent activity without special-casing.
 *
 * An agent with a private side channel into the services would be faster and
 * untrustworthy.
 *
 * ---------------------------------------------------------------------------
 * FAILURE IS RECORDED, NOT SWALLOWED
 * ---------------------------------------------------------------------------
 * A tool that throws produces a step with status 'failed' and the error message
 * as its observation. The loop continues, and the next observation includes the
 * failure so the planner can route around it. Hiding a failed action would make
 * the trace a description of a run that did not happen.
 */
import { Injectable, emitEvent, type ExecutionContext } from '@nitrostack/core';
import {
  AGENT_RUN_FINISHED_EVENT,
  AGENT_RUN_STARTED_EVENT,
  AGENT_STEP_EVENT,
  AgentRunSchema,
  type AgentGoal,
  type AgentHandoff,
  type AgentRun,
  type AgentStep,
} from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { ToolExecutorService } from '../../pipeline/services/tool-executor.service.js';
import {
  AGENT_CONFIDENCE_FLOOR,
  AGENT_MAX_STEPS,
  REQUIRED_BEFORE_CONCLUSION,
  observe,
  type AgentObservation,
} from '../agent-policy.js';
import { AgentMemoryService } from './agent-memory.service.js';
import { AgentPlannerService } from './agent-planner.service.js';

export interface RunOptions {
  applicationId: string;
  goal?: AgentGoal;
  /** Lower the budget for a queue sweep, where breadth matters more than depth. */
  maxSteps?: number;
  /** Parent context, so agent-driven tool calls stay traceable to the request. */
  ctx?: ExecutionContext;
}

@Injectable({
  deps: [
    ApplicationService,
    PipelineStateService,
    ToolExecutorService,
    AgentPlannerService,
    AgentMemoryService,
  ],
})
export class AgentRunnerService {
  constructor(
    private readonly applications: ApplicationService,
    private readonly state: PipelineStateService,
    private readonly executor: ToolExecutorService,
    private readonly planner: AgentPlannerService,
    private readonly memory: AgentMemoryService
  ) {}

  async run(options: RunOptions): Promise<AgentRun> {
    const goal: AgentGoal = options.goal ?? 'assess_application';
    const maxSteps = Math.max(1, Math.min(options.maxSteps ?? AGENT_MAX_STEPS, AGENT_MAX_STEPS));

    // Throws ApplicationNotFoundError with the known ids — a mistyped id should
    // say what exists, not just fail.
    const application = this.applications.getApplication(options.applicationId);

    const runId = this.memory.nextRunId();
    const startedAt = new Date();
    const steps: AgentStep[] = [];

    this.memory.beginRun(runId, application.applicationId, goal);
    this.emit(options.ctx, AGENT_RUN_STARTED_EVENT, {
      runId,
      applicationId: application.applicationId,
      goal,
      planner: this.planner.plannerKind(),
    });

    let stopReason: AgentRun['stopReason'] = 'max_steps';
    let handoff: AgentHandoff | null = null;
    let observation: AgentObservation = observe(application, this.state, steps);

    while (steps.length < maxSteps) {
      // --- THINK ----------------------------------------------------------
      const turn = await this.planner.plan(observation, goal, steps.length);
      const startedTurn = Date.now();

      // --- TERMINAL: hand to a human -------------------------------------
      if (turn.action === 'handoff_to_officer') {
        handoff = this.buildHandoff(observation, turn.confidence, turn.thought, false);

        steps.push(
          this.step({
            step: steps.length + 1,
            thought: turn.overrideReason
              ? `${turn.thought} [planner note: ${turn.overrideReason}]`
              : turn.thought,
            action: 'handoff_to_officer',
            actionInput: turn.actionInput,
            observation:
              `Handed to officer with recommendation '${handoff.recommendation}' at confidence ` +
              `${handoff.confidence.toFixed(2)}` +
              (handoff.requiresSeniorReview ? ' — SENIOR REVIEW REQUESTED.' : '.') +
              ' The decision itself remains a human action; I have no route to officer_decide.',
            status: 'ok',
            confidence: handoff.confidence,
            plannedBy: turn.plannedBy,
            durationMs: Date.now() - startedTurn,
          })
        );

        stopReason = 'handoff';
        this.publishStep(options.ctx, runId, application.applicationId, steps, steps.length - 1);
        break;
      }

      // --- ACT ------------------------------------------------------------
      let status: AgentStep['status'] = 'ok';
      let observationText: string;

      try {
        const result = await this.executor.call(turn.action, turn.actionInput, options.ctx);
        observationText = this.summarise(turn.action, result);
      } catch (error) {
        status = 'failed';
        observationText =
          `${turn.action} failed: ${error instanceof Error ? error.message : String(error)}. ` +
          `I will factor this gap into my confidence rather than pretend the check passed.`;
      }

      steps.push(
        this.step({
          step: steps.length + 1,
          thought: turn.overrideReason
            ? `${turn.thought} [planner note: ${turn.overrideReason}]`
            : turn.thought,
          action: turn.action,
          actionInput: turn.actionInput,
          observation: observationText,
          status,
          confidence: turn.confidence,
          plannedBy: turn.plannedBy,
          durationMs: Date.now() - startedTurn,
        })
      );

      this.publishStep(options.ctx, runId, application.applicationId, steps, steps.length - 1);

      // --- OBSERVE (rebuilt from what the tools actually recorded) --------
      observation = observe(application, this.state, steps);
    }

    // Budget exhausted without a handoff: still produce one, flagged incomplete.
    if (stopReason === 'max_steps' && handoff === null) {
      handoff = this.buildHandoff(
        observation,
        0.35,
        `I exhausted my ${maxSteps}-step budget without reaching a confident conclusion. This ` +
          `handoff is based on an INCOMPLETE investigation and should be treated as such.`,
        // truncated=true. Without this the checklist could read "no adverse
        // findings" purely because the agent never got far enough to look — the
        // exact confusion of "we did not check" with "it passed" that this system
        // exists to prevent.
        true
      );
    }

    const finishedAt = new Date();
    const candidate: AgentRun = {
      runId,
      applicationId: application.applicationId,
      goal,
      planner: this.planner.plannerKind(),
      model: this.planner.modelId(),
      steps,
      stopReason,
      handoff,
      riskScore: this.state.getRiskScore(application.applicationId),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      totalDurationMs: finishedAt.getTime() - startedAt.getTime(),
    };

    // Validate our OWN output before publishing it. The trace is the artefact
    // that makes the autonomy auditable; an off-contract trace would silently
    // break the console that reviews it.
    const parsed = AgentRunSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `AgentRunnerService produced an off-contract AgentRun for ${application.applicationId}:\n` +
          JSON.stringify(parsed.error.format(), null, 2)
      );
    }

    const run = this.memory.finishRun(parsed.data);
    this.emit(options.ctx, AGENT_RUN_FINISHED_EVENT, {
      runId,
      applicationId: run.applicationId,
      stopReason: run.stopReason,
      recommendation: run.handoff?.recommendation ?? null,
      riskScore: run.riskScore,
      steps: run.steps.length,
      totalDurationMs: run.totalDurationMs,
    });

    return run;
  }

  // -------------------------------------------------------------------------
  // Handoff construction
  // -------------------------------------------------------------------------

  /**
   * Build the terminal handoff.
   *
   * The recommendation is derived from the observation, NOT from the planner's
   * prose. A model may phrase the rationale; it does not get to pick the verdict,
   * because the verdict is the part that has consequences and it must be
   * reproducible from the recorded findings.
   */
  private buildHandoff(
    obs: AgentObservation,
    confidence: number,
    rationale: string,
    /**
     * True when the loop ran out of step budget rather than finishing.
     *
     * This cannot be inferred from `obs`: the observation reads
     * PipelineStateService, which legitimately still holds evidence from an
     * EARLIER run or from a manual pipeline execution. So a truncated run can
     * observe a fully-populated state and would otherwise conclude "no adverse
     * findings" — reporting a confident all-clear it never actually established.
     */
    truncated: boolean
  ): AgentHandoff {
    const missingStages = REQUIRED_BEFORE_CONCLUSION.filter(
      (stage) => !obs.completedStages.includes(stage)
    );

    // Escalation is a hard rule, not a scoring outcome: a network finding
    // implicates people who are not in front of the officer, and no automated
    // system should close that class of case.
    const networkFinding = obs.isCoordinatedPattern || obs.highSeveritySignalCount > 0;
    const belowFloor = confidence < AGENT_CONFIDENCE_FLOOR;
    const incomplete = missingStages.length > 0;

    const recommendation: AgentHandoff['recommendation'] = networkFinding
      ? 'escalate'
      : incomplete || truncated
        ? 'escalate'
        : (obs.riskScore ?? 100) >= 60
          ? 'clarify'
          : obs.highSeverityViolations > 0
            ? 'clarify'
            : obs.violationCount > 0 || (obs.riskScore ?? 0) >= 30
              ? 'clarify'
              : 'approve';

    return {
      recommendation,
      rationale,
      confidence,
      officerChecklist: this.buildChecklist(obs, missingStages, truncated),
      requiresSeniorReview: networkFinding || belowFloor || incomplete || truncated,
      // Stated in the payload so no UI can render this as a decision.
      humanDecisionRequired: true,
    };
  }

  /** Worst-first list of what a human should actually look at. */
  private buildChecklist(
    obs: AgentObservation,
    missingStages: readonly string[],
    truncated: boolean
  ): string[] {
    const items: string[] = [];

    // First, because it changes how everything below it should be read.
    if (truncated) {
      items.push(
        'INVESTIGATION INCOMPLETE — I ran out of step budget before finishing. Any findings ' +
          'below are partial, and the absence of a finding here does NOT mean the check passed. ' +
          'Re-run the investigation with a full budget before relying on this.'
      );
    }

    if (obs.isCoordinatedPattern) {
      items.push(
        `Review the whole cluster of ${obs.clusterSize} applications together, not just this ` +
          `file — the overlap pattern spans ${obs.linkedApplicationIds.join(', ')}.`
      );
    }
    if (obs.photoMatchCandidates.length > 0) {
      items.push(
        `Verify the photograph against ${obs.photoMatchCandidates.join(', ')} in person. My ` +
          `similarity flag is advisory and is NOT a biometric identity match.`
      );
    }
    if (obs.highSeveritySignalCount > 0) {
      items.push(
        `${obs.highSeveritySignalCount} high-severity identifier reuse signal(s) — confirm ` +
          `whether the applicant can account for sharing them.`
      );
    }
    if (obs.missingDocuments.length > 0) {
      items.push(`Obtain the missing required document(s): ${obs.missingDocuments.join(', ')}.`);
    }
    if (obs.identityConsistent === false) {
      items.push('Reconcile the name/date-of-birth mismatch between the submitted documents.');
    }
    if (obs.addressConsistent === false) {
      items.push('Reconcile the address mismatch between the submitted documents.');
    }
    if (obs.highSeverityViolations > 0) {
      items.push(
        `${obs.highSeverityViolations} high-severity rule violation(s) — see the cited clauses ` +
          `in evaluate_rules output.`
      );
    }
    if (missingStages.length > 0) {
      items.push(
        `INVESTIGATION INCOMPLETE — these checks never ran: ${missingStages.join(', ')}. Do not ` +
          `read their absence as a pass.`
      );
    }

    // Only claim a clean file when the investigation actually completed. A
    // truncated run has already pushed its warning above, so `items` is non-empty
    // and this branch correctly cannot fire.
    if (items.length === 0) {
      items.push(
        'No adverse findings. Confirm the applicant photograph matches the person presenting, ' +
          'then this file is straightforward.'
      );
    }

    return items;
  }

  // -------------------------------------------------------------------------
  // Observation summarising
  // -------------------------------------------------------------------------

  /**
   * Turn a tool result into one sentence an officer can read.
   *
   * The raw payloads are the evidence and remain available through
   * get_pipeline_progress; this is the narration layer. Keeping it here rather
   * than inside each tool means the trace reads consistently regardless of which
   * team wrote the tool.
   */
  private summarise(action: string, result: unknown): string {
    const r =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : {};

    const num = (key: string): number | null =>
      typeof r[key] === 'number' ? (r[key] as number) : null;
    const arr = (key: string): unknown[] => (Array.isArray(r[key]) ? (r[key] as unknown[]) : []);

    switch (action) {
      case 'document_validate': {
        const missing = arr('missingDocuments').length;
        const expired = arr('expiredDocuments').length;
        return r['complete'] === true && expired === 0
          ? `Checklist complete — all required documents present and in date.`
          : `Checklist NOT clean: ${missing} missing, ${expired} expired.` +
              (missing > 0 ? ` Missing: ${arr('missingDocuments').join(', ')}.` : '');
      }

      case 'ocr_extract': {
        const confidence = num('confidence');
        return (
          `Read ${String(r['documentType'] ?? 'document')} via ` +
          `${String(r['extractionMode'] ?? 'deterministic')}` +
          (confidence !== null ? ` at confidence ${confidence.toFixed(2)}` : '') +
          `.`
        );
      }

      case 'check_identity_consistency':
      case 'check_address_consistency': {
        const mismatches = arr('mismatches');
        return r['consistent'] === true
          ? `${String(r['scope'] ?? action)} fields agree across all compared documents.`
          : `${mismatches.length} ${String(r['scope'] ?? '')} mismatch(es) found — worst severity ` +
              `${String(r['worstSeverity'] ?? 'unknown')}.`;
      }

      case 'detect_duplicate_signals': {
        const summary =
          r['summary'] && typeof r['summary'] === 'object'
            ? (r['summary'] as Record<string, unknown>)
            : {};
        const count = arr('signals').length;
        return count === 0
          ? `No identifier reuse anywhere in the queue — this applicant looks isolated.`
          : `${count} reuse signal(s), highest severity ${String(summary['highestSeverity'] ?? '?')}, ` +
              `across ${String(summary['linkedApplicationCount'] ?? '?')} other application(s).`;
      }

      case 'build_risk_graph': {
        const cluster =
          r['clusterSummary'] && typeof r['clusterSummary'] === 'object'
            ? (r['clusterSummary'] as Record<string, unknown>)
            : {};
        const size = num('clusterSize') ?? 1;
        return size <= 1
          ? `Graph built: no connections. The applicant is a single isolated node.`
          : `Graph built: cluster of ${size}, density ` +
              `${typeof cluster['density'] === 'number' ? (cluster['density'] as number).toFixed(2) : '?'}` +
              `, coordinated=${String(cluster['isCoordinatedPattern'] ?? false)}. ` +
              `${String(cluster['headline'] ?? '')}`;
      }

      case 'visual_similarity_flag':
        return (
          `Photograph comparison against ${String(r['comparedToApplicationId'] ?? 'counterpart')}: ` +
          `${String(r['flag'] ?? 'unclear')} (${String(r['mode'] ?? 'deterministic')}). ` +
          `ADVISORY ONLY — not a biometric match.`
        );

      case 'evaluate_rules': {
        const violations = arr('violations').length;
        const skipped = arr('skippedRuleIds');
        return (
          (violations === 0
            ? `Rulebook applied: no violations.`
            : `Rulebook applied: ${violations} violation(s), worst severity ` +
              `${String(r['worstSeverity'] ?? '?')}.`) +
          (skipped.length > 0
            ? ` ${skipped.length} rule(s) could not be checked (upstream stage missing) — that is ` +
              `not a pass.`
            : '')
        );
      }

      case 'score_risk': {
        const score = num('score');
        const confidence = num('confidence');
        return (
          `Risk score ${score ?? '?'}/100 (${String(r['band'] ?? '?')})` +
          (confidence !== null ? ` at confidence ${confidence.toFixed(2)}` : '') +
          ` across ${arr('factors').length} weighted factor(s).`
        );
      }

      case 'explain_risk':
        return (
          `Explanation generated (${String(r['narrationMode'] ?? 'deterministic')}); ` +
          `recommended action '${String(r['recommendedAction'] ?? '?')}' with ` +
          `${arr('evidence').length} evidence item(s).`
        );

      default:
        return `${action} completed.`;
    }
  }

  // -------------------------------------------------------------------------
  // Plumbing
  // -------------------------------------------------------------------------

  private step(fields: Omit<AgentStep, 'at'>): AgentStep {
    return { ...fields, at: new Date().toISOString() };
  }

  private publishStep(
    ctx: ExecutionContext | undefined,
    runId: string,
    applicationId: string,
    steps: readonly AgentStep[],
    index: number
  ): void {
    const step = steps[index];
    if (!step) return;

    this.memory.appendStep(runId, step);
    this.emit(ctx, AGENT_STEP_EVENT, { runId, applicationId, step });
  }

  /**
   * Publish on the same bus as the pipeline stage events.
   *
   * Mirrors PipelineEventsService.publish() exactly — prefer the bridged
   * `ctx.emit` so emission stays scoped to the originating tool call, and fall
   * back to core's `emitEvent` export when there is no context (a service call or
   * a test). Agent events and stage events therefore arrive through one
   * mechanism, and the dashboard needs exactly one subscription model.
   *
   * This deliberately does NOT reach into PipelineEventsService.publish(), which
   * is private: the two paths are three lines each, and coupling to another
   * class's private member to save them would break silently the first time that
   * class is refactored.
   */
  private emit(ctx: ExecutionContext | undefined, event: string, payload: unknown): void {
    const emitter = (ctx as { emit?: (event: string, payload: unknown) => void } | undefined)?.emit;

    if (typeof emitter === 'function') {
      emitter.call(ctx, event, payload);
      return;
    }

    emitEvent(event, payload);
  }
}
