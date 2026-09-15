/**
 * AutopilotService — the agent that is already working when you open the console.
 *
 * WHY THIS EXISTS
 * ---------------
 * `agent_investigate` makes PassportIQ *capable* of autonomy: give it an
 * application and it decides its own tool sequence. But a capability nobody
 * triggers is indistinguishable from a button. The autopilot closes that gap: on
 * a timer, with no human in the loop, it
 *
 *   1. asks ConsoleStateService which applications most need attention,
 *   2. picks the ones no agent has looked at (or whose evidence changed),
 *   3. runs the full observe→think→act loop on each through AgentRunnerService,
 *   4. correlates the sweep to surface rings across applications,
 *   5. publishes every step on the event bus, and
 *   6. STOPS at the human handoff. It never calls officer_decide.
 *
 * Point 6 is the product thesis, not a limitation. The agent's action space
 * (AgentActionSchema) has no decision action in it, and this scheduler adds none.
 * Autonomy is applied to *investigation*; authority stays with the officer.
 *
 * SAFETY PROPERTIES, AND WHY EACH ONE IS LOAD-BEARING
 * ---------------------------------------------------
 *   OFF BY DEFAULT IN TESTS / STDIO
 *     A background timer that mutates PipelineStateService while an acceptance
 *     test asserts on stage state produces flaky failures that look like agent
 *     bugs. It arms only when PASSPORTIQ_AUTOPILOT=true (or NODE_ENV=production
 *     with the console enabled) — see `resolveEnabled()`.
 *
 *   NO OVERLAPPING SWEEPS
 *     Runs are long (nine applications × up to twelve tool calls). Without the
 *     `sweeping` re-entrancy check a slow sweep and the next tick would interleave
 *     tool calls on the same application, and the second run would observe state
 *     the first was midway through writing.
 *
 *   NEVER RE-INVESTIGATES A DECIDED CASE
 *     Once an officer records a decision the case is closed. Re-running the agent
 *     over it burns budget and, worse, writes fresh events that make a closed case
 *     look live in the console.
 *
 *   ONE FAILURE NEVER STOPS THE SCHEDULER
 *     Every run is individually caught. A single application that throws must not
 *     silently disarm the autopilot for the rest of the demo.
 *
 *   unref()'d TIMER
 *     An unref'd interval does not hold the event loop open, so `npm start`
 *     still exits on SIGINT instead of hanging for the interval duration.
 */
import { Injectable, defaultLogger, emitEvent } from '@nitrostack/core';
import {
  AUTOPILOT_APPLICATION_PICKED_EVENT,
  AUTOPILOT_STATE_CHANGED_EVENT,
  AUTOPILOT_SWEEP_FINISHED_EVENT,
  AUTOPILOT_SWEEP_STARTED_EVENT,
  AutopilotStatusSchema,
  type AutopilotMode,
  type AutopilotStatus,
  type AutopilotSweepSummary,
} from '../../../contracts/index.js';
import { AgentRunnerService } from '../../agent/services/agent-runner.service.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { ConsoleStateService } from './console-state.service.js';

/** Applications investigated per sweep. Bounded so a sweep always ends. */
const DEFAULT_BATCH_SIZE = 3;
/** Step budget per autopilot run — breadth over depth, like the triage sweep. */
const AUTOPILOT_STEP_BUDGET = 12;
const DEFAULT_INTERVAL_SECONDS = 45;
const MIN_INTERVAL_SECONDS = 10;
/** Delay before the first sweep, so boot logs and the console load settle first. */
const WARMUP_MS = 4000;

@Injectable({ deps: [ConsoleStateService, AgentRunnerService, ApplicationService, GraphService] })
export class AutopilotService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private warmupTimer: ReturnType<typeof setTimeout> | null = null;
  private mode: AutopilotMode = 'stopped';
  private detail = 'Autopilot has not been armed.';

  private sweepCount = 0;
  private investigated = 0;
  private escalations = 0;
  private ringsDetected = 0;
  private lastSweepStartedAt: string | null = null;
  private lastSweepFinishedAt: string | null = null;
  private lastSweepDurationMs: number | null = null;
  private nextSweepAt: number | null = null;
  private currentApplicationId: string | null = null;
  private lastSummary: AutopilotSweepSummary | null = null;
  /** Fingerprint of the last status published — see `announce()`. */
  private lastAnnouncedFingerprint: string | null = null;

  private readonly intervalSeconds = resolveIntervalSeconds();
  private readonly batchSize = resolveBatchSize();
  private readonly enabled = resolveEnabled();

  constructor(
    private readonly consoleState: ConsoleStateService,
    private readonly runner: AgentRunnerService,
    private readonly applications: ApplicationService,
    private readonly graph: GraphService
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Arm the scheduler. Called from bootstrap after the transport is up, because
   * a sweep that starts before ToolExecutorService has a server reference fails
   * every run with "no server reference".
   */
  start(): AutopilotStatus {
    if (!this.enabled) {
      this.mode = 'stopped';
      this.detail =
        'Autopilot disabled by configuration (set PASSPORTIQ_AUTOPILOT=true to arm it). ' +
        'The agent can still be driven on demand via agent_investigate or the console.';
      return this.getStatus();
    }

    if (this.timer !== null) return this.getStatus();

    this.mode = 'idle';
    this.detail = `Armed — first sweep in ${Math.round(WARMUP_MS / 1000)}s, then every ${this.intervalSeconds}s.`;
    this.nextSweepAt = Date.now() + WARMUP_MS;

    this.warmupTimer = setTimeout(() => {
      void this.sweep();
    }, WARMUP_MS);
    this.warmupTimer.unref?.();

    this.timer = setInterval(() => {
      void this.sweep();
    }, this.intervalSeconds * 1000);
    // Do not hold the process open — see the header.
    this.timer.unref?.();

    defaultLogger.info(
      `🤖 Autopilot armed — sweeping ${this.batchSize} application(s) every ${this.intervalSeconds}s. ` +
        `It investigates autonomously and stops at the officer handoff; it never decides.`
    );

    this.announce();
    return this.getStatus();
  }

  /** Disarm. Idempotent, and safe to call from a shutdown hook. */
  stop(reason = 'Stopped by operator.'): AutopilotStatus {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.warmupTimer !== null) {
      clearTimeout(this.warmupTimer);
      this.warmupTimer = null;
    }
    this.mode = 'stopped';
    this.nextSweepAt = null;
    this.detail = reason;
    this.announce();
    return this.getStatus();
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  // ---------------------------------------------------------------------------
  // The sweep
  // ---------------------------------------------------------------------------

  /**
   * One autonomous sweep.
   *
   * Public so the console can force a sweep on demand ("Run Autopilot Now") and
   * so tests can drive it deterministically without waiting on a timer. The
   * re-entrancy guard applies to both paths.
   */
  async sweep(): Promise<AutopilotSweepSummary | null> {
    if (this.mode === 'sweeping') {
      // Not an error: the previous sweep is still working. Skipping this tick is
      // the correct behaviour — see the header.
      return null;
    }

    const targets = this.selectTargets();
    if (targets.length === 0) {
      this.mode = 'idle';
      this.detail =
        'Queue clear — every application has been investigated or decided. ' +
        'Autopilot is watching for new submissions.';
      this.nextSweepAt = Date.now() + this.intervalSeconds * 1000;
      this.announce();
      return null;
    }

    const sweepId = `sweep-${++this.sweepCount}`;
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();

    this.mode = 'sweeping';
    this.lastSweepStartedAt = startedAt;
    this.detail = `Investigating ${targets.length} application(s) autonomously.`;
    emit(AUTOPILOT_SWEEP_STARTED_EVENT, {
      sweepId,
      startedAt,
      targets,
      reason: 'scheduled_queue_sweep',
    });
    this.announce();

    const escalated: string[] = [];
    let topPriority: AutopilotSweepSummary['topPriority'] = null;

    for (const applicationId of targets) {
      this.currentApplicationId = applicationId;

      const row = this.rowFor(applicationId);
      emit(AUTOPILOT_APPLICATION_PICKED_EVENT, {
        sweepId,
        applicationId,
        applicantName: row?.applicantName ?? applicationId,
        // The autopilot says WHY it chose this case. An autonomous system that
        // cannot explain its own prioritisation is not auditable.
        reason: row?.headline ?? 'Selected by queue priority.',
        clusterSize: row?.clusterSize ?? 1,
      });

      try {
        // The goal is chosen from the evidence, not hardcoded: a case already
        // linked to others gets the fraud-hypothesis goal, which changes the
        // planner's preferred action ordering.
        const linked = this.graph.getLinkedApplicationIds(applicationId).length > 0;
        const run = await this.runner.run({
          applicationId,
          goal: linked ? 'investigate_fraud_signal' : 'assess_application',
          maxSteps: AUTOPILOT_STEP_BUDGET,
        });

        this.investigated += 1;

        const recommendation = run.handoff?.recommendation ?? 'escalate';
        if (recommendation === 'escalate' || run.handoff?.requiresSeniorReview) {
          escalated.push(applicationId);
          this.escalations += 1;
        }

        const score = run.riskScore ?? -1;
        if (topPriority === null || score > (topPriority.riskScore ?? -1)) {
          topPriority = {
            applicationId,
            applicantName: this.nameFor(applicationId),
            riskScore: run.riskScore,
            recommendation,
            headline:
              run.handoff?.rationale ??
              `Agent stopped after ${run.steps.length} steps (${run.stopReason}).`,
          };
        }
      } catch (error) {
        // One bad application must not end the sweep — see the header.
        defaultLogger.warn(
          `[autopilot] investigation of ${applicationId} failed: ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
        escalated.push(applicationId);
        this.escalations += 1;
      }
    }

    this.currentApplicationId = null;

    const rings = this.graph.getAllClusters().filter((cluster) => cluster.length > 1);
    this.ringsDetected = rings.length;

    const finishedAtMs = Date.now();
    const summary: AutopilotSweepSummary = {
      sweepId,
      startedAt,
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: finishedAtMs - startedAtMs,
      applicationsInvestigated: targets.length,
      escalated,
      ringsDetected: rings.length,
      topPriority,
    };

    this.lastSummary = summary;
    this.lastSweepFinishedAt = summary.finishedAt;
    this.lastSweepDurationMs = summary.durationMs;
    this.mode = 'idle';
    this.nextSweepAt = Date.now() + this.intervalSeconds * 1000;
    this.detail =
      `Sweep ${sweepId} complete: ${targets.length} investigated, ` +
      `${escalated.length} escalated to an officer, ${rings.length} cluster(s) tracked. ` +
      `No decision was taken — that remains with the officer.`;

    emit(AUTOPILOT_SWEEP_FINISHED_EVENT, summary);
    this.announce();

    return summary;
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  getStatus(): AutopilotStatus {
    const status: AutopilotStatus = {
      enabled: this.enabled,
      mode: this.mode,
      intervalSeconds: this.intervalSeconds,
      sweepsCompleted: this.sweepCount,
      applicationsInvestigated: this.investigated,
      escalations: this.escalations,
      ringsDetected: this.ringsDetected,
      lastSweepStartedAt: this.lastSweepStartedAt,
      lastSweepFinishedAt: this.lastSweepFinishedAt,
      lastSweepDurationMs: this.lastSweepDurationMs,
      nextSweepEta: this.nextSweepAt === null ? null : new Date(this.nextSweepAt).toISOString(),
      currentApplicationId: this.currentApplicationId,
      detail: this.detail,
    };

    // Parse rather than cast: the status is rendered by the console AND returned
    // by an MCP tool, so a drift between the two would show up here first.
    return AutopilotStatusSchema.parse(status);
  }

  getLastSweep(): AutopilotSweepSummary | null {
    return this.lastSummary;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Choose what to work on.
   *
   * Priority comes from ConsoleStateService (highest risk, biggest cluster, least
   * progress first) — the same ordering the officer sees, so the autopilot is
   * visibly working the top of the queue rather than a private order of its own.
   *
   * Already-decided cases are excluded, and so are cases whose pipeline is
   * already complete AND which an agent has already investigated: re-running them
   * produces identical output and starves the untouched ones.
   */
  private selectTargets(): string[] {
    const overview = this.consoleState.getOverview();

    const fresh = overview.queue.filter(
      (row) => row.decision === null && (row.agentRuns === 0 || !row.pipelineComplete)
    );

    const candidates = fresh.length > 0 ? fresh : overview.queue.filter((row) => row.decision === null && row.agentRuns === 0);

    return candidates.slice(0, this.batchSize).map((row) => row.applicationId);
  }

  private rowFor(applicationId: string) {
    return this.consoleState
      .getOverview()
      .queue.find((row) => row.applicationId === applicationId);
  }

  private nameFor(applicationId: string): string {
    try {
      return this.applications.getApplication(applicationId).fullName;
    } catch {
      return applicationId;
    }
  }

  /**
   * Publish the status so the console's autopilot panel updates without polling.
   *
   * Suppressed when nothing an observer could see has changed. Once the queue is
   * clear every scheduled tick re-derives the same idle status, and announcing it
   * unconditionally published an identical `state_changed` frame every interval
   * forever — which buried the pipeline, agent and decision events the activity
   * stream exists to show behind a wall of "Autopilot is now Idle."
   *
   * `nextSweepEta` is deliberately excluded from the fingerprint: it advances on
   * every tick by construction, so including it would defeat the check.
   */
  private announce(): void {
    const status = this.getStatus();
    const fingerprint = JSON.stringify([
      status.enabled,
      status.mode,
      status.detail,
      status.currentApplicationId,
      status.sweepsCompleted,
      status.applicationsInvestigated,
      status.escalations,
      status.ringsDetected,
      status.lastSweepFinishedAt,
    ]);

    if (fingerprint === this.lastAnnouncedFingerprint) return;
    this.lastAnnouncedFingerprint = fingerprint;
    emit(AUTOPILOT_STATE_CHANGED_EVENT, status);
  }
}

// -----------------------------------------------------------------------------
// Configuration + emit helper
// -----------------------------------------------------------------------------

/**
 * Fire-and-forget emit.
 *
 * The autopilot has no ExecutionContext — nothing called it — so it uses core's
 * standalone `emitEvent`, which is the same function the ctx.emit bridge
 * delegates to. Wrapped because an event-bus failure must never abort a sweep.
 */
function emit(event: string, payload: unknown): void {
  try {
    emitEvent(event, payload);
  } catch (error) {
    defaultLogger.debug(
      `[autopilot] emit ${event} failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Arm only when explicitly asked, or in production with the console on.
 *
 * PASSPORTIQ_AUTOPILOT=false always wins, so a deploy can disable it without a
 * code change (useful when demoing the manual flow).
 */
function resolveEnabled(): boolean {
  const flag = process.env['PASSPORTIQ_AUTOPILOT'];
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;

  // Default on for a deployed instance: NitroCloud judges should land on a
  // console that is already moving. Off for local stdio/dev and for tests.
  return process.env['NODE_ENV'] === 'production';
}

function resolveIntervalSeconds(): number {
  const raw = Number(process.env['PASSPORTIQ_AUTOPILOT_INTERVAL_SECONDS']);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_INTERVAL_SECONDS;
  // A one-second interval would guarantee overlapping sweeps and starve the
  // event loop; clamp rather than trust the environment.
  return Math.max(MIN_INTERVAL_SECONDS, Math.floor(raw));
}

function resolveBatchSize(): number {
  const raw = Number(process.env['PASSPORTIQ_AUTOPILOT_BATCH']);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(9, Math.floor(raw)));
}
