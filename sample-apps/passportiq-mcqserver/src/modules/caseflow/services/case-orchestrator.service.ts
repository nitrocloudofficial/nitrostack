/**
 * CaseOrchestratorService — the agent that runs the passport office.
 *
 * WHAT MAKES THIS AGENTIC RATHER THAN A CRON JOB
 * ---------------------------------------------
 * A scheduler executes a fixed script. This does four things a script does not:
 *
 *   1. It PERCEIVES — every tick it re-reads the whole case register, the SLA
 *      clocks, the fraud graph and the verification state. Nothing is cached
 *      between ticks, so a case that changed underneath it (an officer decided,
 *      a citizen answered a clarification) is picked up on the next pass.
 *   2. It PRIORITISES — the work order is derived, not fixed: tatkal first, then
 *      SLA pressure, then how far a case has left to travel. Two runs on
 *      different state produce different orders.
 *   3. It CHOOSES ITS OWN ACTIONS — the next step comes from the declarative
 *      transition table, not from an if/else ladder. Add a stage to
 *      CASE_TRANSITIONS and the agent drives it with no code change here.
 *   4. It EXPLAINS ITSELF — every action carries a `rationale` written at the
 *      moment of acting, naming the evidence that triggered it. That text lands
 *      in the case journal and in the console stream, so the automation is
 *      auditable rather than merely fast.
 *
 * AND THE ONE THING IT WILL NOT DO
 * -------------------------------
 * It never crosses a human gate. `autonomousNext()` only ever returns
 * transitions flagged `autonomous: true` in the contract, and `officer_decide`
 * is flagged false. The agent walks a case to `officer_review`, assembles the
 * evidence, writes a recommendation — and stops. That refusal is enforced by the
 * data model, not by a promise in a README.
 *
 * HOW IT ACTS
 * ----------
 * Through ToolExecutorService, by tool name, exactly as an external MCP client
 * would. It has no privileged path into the services: every action the agent
 * takes is an action an officer could take from the console or a judge could
 * take from Claude Desktop, so guards, validation and audit apply identically.
 */
import { Injectable, defaultLogger } from '@nitrostack/core';
import {
  WAITING_ON_HUMAN,
  autonomousNext,
  explainHold,
  isTerminal,
  type CaseStage,
  type CaseTransition,
  type PassportCase,
} from '../../../contracts/index.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { ToolExecutorService } from '../../pipeline/services/tool-executor.service.js';
import { CaseflowEventsService } from './caseflow-events.service.js';
import { CaseflowService } from './caseflow.service.js';

export interface OrchestratorStep {
  arn: string;
  applicationId: string;
  applicantName: string;
  from: CaseStage;
  to: CaseStage | null;
  tool: string;
  ok: boolean;
  /** Why the agent chose this action, at this moment, for this case. */
  rationale: string;
  /** What actually happened, including a refusal or an error. */
  outcome: string;
  at: string;
  durationMs: number;
}

export interface OrchestratorTick {
  tickId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /** Cases the agent looked at, in the order it chose. */
  considered: number;
  advanced: number;
  blockedOnHuman: number;
  slaBreaches: number;
  steps: OrchestratorStep[];
  /** One-paragraph account of the pass, for the console header. */
  narrative: string;
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
  lastTickDurationMs: number | null;
  nextTickEta: string | null;
  currentArn: string | null;
  detail: string;
}

/** How many cases the agent will move in a single pass. */
const MAX_CASES_PER_TICK = 4;
/** How many hops it will take on one case in a single pass. */
const MAX_STEPS_PER_CASE = 3;
/** Ring buffer of ticks retained for the console. */
const TICK_HISTORY = 40;

@Injectable({
  deps: [
    CaseflowService,
    CaseflowEventsService,
    ToolExecutorService,
    PipelineStateService,
    GraphService,
  ],
})
export class CaseOrchestratorService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  private tickSequence = 0;
  private transitionsExecuted = 0;
  private casesClosed = 0;
  private handoffs = 0;
  private slaBreaches = 0;
  private lastTickAt: string | null = null;
  private lastTickDurationMs: number | null = null;
  private currentArn: string | null = null;
  private detail = 'Lifecycle orchestrator has not run yet.';

  private readonly history: OrchestratorTick[] = [];

  private readonly intervalSeconds = Number(
    process.env['PASSPORTIQ_CASEFLOW_INTERVAL'] ?? '20'
  );

  constructor(
    private readonly caseflow: CaseflowService,
    private readonly events: CaseflowEventsService,
    private readonly executor: ToolExecutorService,
    private readonly pipelineState: PipelineStateService,
    private readonly graph: GraphService
  ) {}

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Arm the loop.
   *
   * Env-gated exactly like the investigation autopilot, and for the same reason:
   * a background timer mutating the case register while the acceptance suite
   * asserts stage counts makes failures non-deterministic. Tests run with
   * PASSPORTIQ_CASEFLOW=false and drive `tick()` by hand.
   */
  start(): OrchestratorStatus {
    const flag = process.env['PASSPORTIQ_CASEFLOW'];
    const enabled = flag === undefined ? process.env['NODE_ENV'] === 'production' : flag === 'true';

    if (!enabled) {
      this.stopped = true;
      this.detail =
        'Lifecycle orchestrator idle by configuration (PASSPORTIQ_CASEFLOW). Cases advance on ' +
        'demand via advance_case or caseflow_autopilot(action="tick").';
      return this.status();
    }

    if (this.timer) return this.status();

    this.stopped = false;
    this.detail = 'Armed. Watching every open case.';

    // First pass shortly after boot rather than a full interval later — an empty
    // board for the first 20 seconds of a demo reads as a broken product.
    setTimeout(() => void this.safeTick(), 2_500);
    this.timer = setInterval(() => void this.safeTick(), this.intervalSeconds * 1_000);
    // Do not hold the process open on shutdown.
    this.timer.unref?.();

    defaultLogger.info(
      `✓ Caseflow orchestrator armed — every ${this.intervalSeconds}s, ` +
        `max ${MAX_CASES_PER_TICK} cases/tick, stops at every human gate`
    );
    return this.status();
  }

  stop(reason = 'Stopped by request.'): OrchestratorStatus {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.stopped = true;
    this.detail = reason;
    return this.status();
  }

  status(): OrchestratorStatus {
    return {
      enabled: this.timer !== null,
      mode: this.running ? 'running' : this.stopped ? 'stopped' : 'idle',
      intervalSeconds: this.intervalSeconds,
      ticks: this.tickSequence,
      transitionsExecuted: this.transitionsExecuted,
      casesClosed: this.casesClosed,
      handoffsToOfficer: this.handoffs,
      slaBreaches: this.slaBreaches,
      lastTickAt: this.lastTickAt,
      lastTickDurationMs: this.lastTickDurationMs,
      nextTickEta:
        this.timer && this.lastTickAt
          ? new Date(new Date(this.lastTickAt).getTime() + this.intervalSeconds * 1_000).toISOString()
          : null,
      currentArn: this.currentArn,
      detail: this.detail,
    };
  }

  recentTicks(limit = 10): OrchestratorTick[] {
    return this.history.slice(-limit).reverse();
  }

  private async safeTick(): Promise<void> {
    try {
      await this.tick();
    } catch (error) {
      // A thrown tick must never kill the interval — the office keeps opening
      // tomorrow even if today went wrong.
      this.detail = `Last tick failed: ${(error as Error).message}`;
      defaultLogger.error('Caseflow orchestrator tick failed', error as Error);
    }
  }

  // =========================================================================
  // One pass
  // =========================================================================

  /**
   * Perceive → prioritise → act → explain.
   *
   * Re-entrant-safe: a tick that overruns its interval is skipped rather than
   * queued, because two concurrent passes would race on the same case and could
   * double-execute a transition.
   */
  async tick(): Promise<OrchestratorTick> {
    if (this.running) {
      return this.emptyTick('A pass was already in flight — this one was skipped.');
    }

    this.running = true;
    this.tickSequence += 1;
    const tickId = `TICK-${String(this.tickSequence).padStart(4, '0')}`;
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const steps: OrchestratorStep[] = [];

    try {
      // ---- 1. Perceive: SLA pressure first, because it changes the order.
      const breaches = this.caseflow.newlyBreached();
      for (const { kase, sla } of breaches) {
        this.slaBreaches += 1;
        this.events.slaBreached(kase, sla);
        defaultLogger.warn(
          `SLA breach — ${kase.arn} has been at '${kase.stage}' for ${sla.hoursInStage}h ` +
            `against a ${sla.slaHours}h target.`
        );
      }

      // ---- 2. Prioritise.
      const workable = this.prioritise();
      const blockedOnHuman = this.caseflow
        .getAll()
        .filter((k) => WAITING_ON_HUMAN.includes(k.stage)).length;

      // ---- 3. Act.
      for (const kase of workable.slice(0, MAX_CASES_PER_TICK)) {
        this.currentArn = kase.arn;
        const taken = await this.advance(kase.arn, MAX_STEPS_PER_CASE);
        steps.push(...taken);
      }
      this.currentArn = null;

      const advanced = new Set(steps.filter((s) => s.ok).map((s) => s.arn)).size;
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - t0;

      const tick: OrchestratorTick = {
        tickId,
        startedAt,
        finishedAt,
        durationMs,
        considered: workable.length,
        advanced,
        blockedOnHuman,
        slaBreaches: breaches.length,
        steps,
        narrative: this.narrate(workable.length, steps, blockedOnHuman, breaches.length),
      };

      this.lastTickAt = finishedAt;
      this.lastTickDurationMs = durationMs;
      this.detail = tick.narrative;
      this.history.push(tick);
      if (this.history.length > TICK_HISTORY) this.history.shift();

      return tick;
    } finally {
      this.running = false;
      this.currentArn = null;
    }
  }

  private emptyTick(note: string): OrchestratorTick {
    const at = new Date().toISOString();
    return {
      tickId: `TICK-${String(this.tickSequence).padStart(4, '0')}`,
      startedAt: at,
      finishedAt: at,
      durationMs: 0,
      considered: 0,
      advanced: 0,
      blockedOnHuman: 0,
      slaBreaches: 0,
      steps: [],
      narrative: note,
    };
  }

  /**
   * Work order.
   *
   * Not "oldest first". A passport office that ignores tatkal and SLA is a
   * passport office with a queue out the door, so the ranking is:
   *
   *   1. tatkal cases (the applicant paid for speed);
   *   2. how much of the stage SLA is already consumed (breached first);
   *   3. how far the case still has to travel (short remaining path first, so
   *      near-complete cases close instead of accumulating).
   *
   * Cases waiting on a human are excluded entirely — the agent cannot help them
   * and including them would waste the per-tick budget on no-ops.
   */
  private prioritise(): PassportCase[] {
    return this.caseflow
      .getAll()
      .filter((kase) => !isTerminal(kase.stage))
      .filter((kase) => autonomousNext(kase.stage) !== null)
      .map((kase) => ({ kase, sla: this.caseflow.sla(kase) }))
      .sort((a, b) => {
        if (a.kase.tatkal !== b.kase.tatkal) return a.kase.tatkal ? -1 : 1;
        if (a.sla.breached !== b.sla.breached) return a.sla.breached ? -1 : 1;
        if (b.sla.consumed !== a.sla.consumed) return b.sla.consumed - a.sla.consumed;
        return a.kase.openedAt.localeCompare(b.kase.openedAt);
      })
      .map((entry) => entry.kase);
  }

  /**
   * Walk one case forward, up to `maxSteps` autonomous transitions.
   *
   * Public because `advance_case` exposes it as a tool: an officer (or an LLM
   * client) can ask the agent to push a specific case rather than waiting for the
   * next tick. Same code path either way, so a manual nudge and an autonomous
   * pass leave identical journal entries.
   */
  async advance(handle: string, maxSteps = 1): Promise<OrchestratorStep[]> {
    const steps: OrchestratorStep[] = [];

    for (let i = 0; i < maxSteps; i += 1) {
      const kase = this.caseflow.get(handle);
      const next = autonomousNext(kase.stage);

      if (!next) {
        // Not an error: this is the agent correctly declining to act.
        steps.push({
          arn: kase.arn,
          applicationId: kase.applicationId,
          applicantName: kase.applicantName,
          from: kase.stage,
          to: null,
          tool: '—',
          ok: false,
          rationale: this.whyStop(kase),
          outcome: explainHold(kase.stage),
          at: new Date().toISOString(),
          durationMs: 0,
        });
        if (kase.stage === 'officer_review') this.handoffs += 1;
        break;
      }

      const step = await this.executeTransition(kase, next);
      steps.push(step);
      if (!step.ok) break;

      this.transitionsExecuted += 1;
      if (isTerminal(step.to ?? kase.stage)) {
        this.casesClosed += 1;
        break;
      }
    }

    return steps;
  }

  /**
   * Execute one transition by calling its tool, and record why.
   *
   * The rationale is composed BEFORE the call, from the state that justified the
   * choice. Writing it afterwards from the result would produce a post-hoc
   * story — plausible, and worthless in an audit.
   */
  private async executeTransition(
    kase: PassportCase,
    transition: CaseTransition
  ): Promise<OrchestratorStep> {
    const t0 = Date.now();
    const rationale = this.reason(kase, transition);
    const input = this.inputFor(kase, transition);

    // CaseflowService.transition() mutates the registered case object in place,
    // and `kase` is that very object — not a copy. Reading `kase.stage` after
    // the tool call therefore returns the *new* stage, which made the
    // `moved` comparison always false and reported every successful step as a
    // failure. Snapshot the stage before acting; compare against the snapshot.
    const stageBefore = kase.stage;

    try {
      const result = (await this.executor.call(transition.tool, {
        ...input,
        _agentRationale: rationale,
      })) as { summary?: string; stage?: string } | undefined;

      const after = this.caseflow.get(kase.arn);
      const moved = after.stage !== stageBefore;

      return {
        arn: kase.arn,
        applicationId: kase.applicationId,
        applicantName: kase.applicantName,
        from: stageBefore,
        to: moved ? after.stage : null,
        tool: transition.tool,
        ok: moved,
        rationale,
        outcome: moved
          ? (result?.summary ?? `${transition.label} — now at '${after.stage}'.`)
          : `${transition.tool} returned without moving the case; it is still at ` +
            `'${after.stage}'. Preconditions were not met.`,
        at: new Date().toISOString(),
        durationMs: Date.now() - t0,
      };
    } catch (error) {
      const message = (error as Error).message;
      return {
        arn: kase.arn,
        applicationId: kase.applicationId,
        applicantName: kase.applicantName,
        from: stageBefore,
        to: null,
        tool: transition.tool,
        ok: false,
        rationale,
        // A refused precondition is normal operation, not a crash — the office
        // is waiting on something. Surfaced as-is so the console can show the
        // exact blocker rather than "error".
        outcome: `Blocked: ${message}`,
        at: new Date().toISOString(),
        durationMs: Date.now() - t0,
      };
    }
  }

  /** The reasoning string. Names the evidence, not the intention. */
  private reason(kase: PassportCase, transition: CaseTransition): string {
    const sla = this.caseflow.sla(kase);
    const parts: string[] = [];

    parts.push(
      `${kase.arn} (${kase.applicantName}, ${kase.applicationType}${kase.tatkal ? ', tatkal' : ''}) ` +
        `is at '${kase.stage}'; the only autonomous step available is ${transition.tool}.`
    );

    if (sla.breached) {
      parts.push(
        `It has been there ${sla.hoursInStage}h against a ${sla.slaHours}h target — this case is ` +
          `already late, so it goes first.`
      );
    } else if (sla.consumed > 0.6) {
      parts.push(
        `${Math.round(sla.consumed * 100)}% of the ${sla.slaHours}h stage SLA is consumed; acting ` +
          `now keeps it inside target.`
      );
    } else if (kase.tatkal) {
      parts.push('Tatkal scheme — the applicant paid for the expedited lane, so it is prioritised.');
    }

    // Stage-specific evidence: the thing that makes each rationale non-generic.
    switch (transition.to) {
      case 'verification_running': {
        const missing = kase.pskVisit?.documentsMissing ?? [];
        parts.push(
          missing.length === 0
            ? 'Counters A/B/C are clear and all mandatory documents were granted, so the ' +
              'verification pipeline has everything it needs.'
            : `Counter C is not clear — ${missing.join(', ')} still missing. Running verification ` +
              `anyway would produce a confident answer about an incomplete file.`
        );
        break;
      }
      case 'police_verification': {
        const progress = this.pipelineState.getProgress(kase.applicationId);
        const score = this.pipelineState.getRiskScore(kase.applicationId);
        parts.push(
          `Verification is ${progress.completedStages.length}/${progress.completedStages.length + progress.missingStages.length} ` +
            `stages complete${score === null ? '' : `, risk ${score}/100`}. PV can be raised in ` +
            `parallel with nothing further to compute.`
        );
        break;
      }
      case 'officer_review': {
        const linked = this.graph.getLinkedApplicationIds(kase.applicationId);
        parts.push(
          linked.length > 0
            ? `The PV report closes the machine-checkable work. This applicant shares identifiers ` +
              `with ${linked.length} other application(s) (${linked.join(', ')}), so the file goes ` +
              `to an officer with the cluster attached.`
            : 'The PV report closes the machine-checkable work. Nothing further can be decided ' +
              'without a human, so the file is handed over.'
        );
        break;
      }
      case 'printing':
        parts.push(
          `A named officer recorded a grant on this case, which is the only thing that authorises ` +
            `printing. Allotting a passport number now.`
        );
        break;
      case 'dispatched':
        parts.push('Booklet printed and quality-checked; handing it to Speed Post closes the file.');
        break;
      default:
        break;
    }

    return parts.join(' ');
  }

  private whyStop(kase: PassportCase): string {
    if (kase.stage === 'officer_review') {
      const linked = this.graph.getLinkedApplicationIds(kase.applicationId);
      const score = this.pipelineState.getRiskScore(kase.applicationId);
      return (
        `Everything a machine may decide about ${kase.arn} is decided` +
        (score === null ? '' : ` (risk ${score}/100)`) +
        (linked.length > 0 ? `, including a ${linked.length + 1}-application cluster` : '') +
        `. The grant itself is a statutory human act, so I stop here and hand the file to an officer.`
      );
    }
    if (kase.stage === 'clarification') {
      return `${kase.arn} is waiting on the applicant, not on me. Nothing I can do moves it.`;
    }
    return `${kase.arn} is closed at '${kase.stage}'.`;
  }

  /** Tool input per transition. Kept in one place so the tools stay dumb. */
  private inputFor(kase: PassportCase, transition: CaseTransition): Record<string, unknown> {
    const base = { arn: kase.arn };
    switch (transition.tool) {
      case 'pay_application_fee':
        return { ...base, method: kase.tatkal ? 'upi' : 'netbanking' };
      case 'complete_psk_visit':
        return { ...base, officer: 'PSK counter (kiosk feed)' };
      case 'record_police_verification':
        return { ...base, verdict: this.predictPvVerdict(kase) };
      case 'dispatch_passport':
        return { ...base, courier: 'India Post Speed Post' };
      default:
        return base;
    }
  }

  /**
   * What the district police report says.
   *
   * This is the one place the simulation has to invent a fact, so it is derived
   * rather than random: an applicant who is part of a multi-application cluster
   * gets an `incomplete` report (the constable could not confirm a single
   * residence), which is exactly the kind of friction a real ring produces.
   * Everyone else comes back clear. Deterministic, so the demo is repeatable —
   * and the verdict never *decides* anything, it is only evidence the officer
   * reads.
   */
  private predictPvVerdict(kase: PassportCase): 'clear' | 'incomplete' {
    const linked = this.graph.getLinkedApplicationIds(kase.applicationId);
    return linked.length >= 2 ? 'incomplete' : 'clear';
  }

  /** Tick summary for the console header. */
  private narrate(
    considered: number,
    steps: OrchestratorStep[],
    blockedOnHuman: number,
    breaches: number
  ): string {
    const moved = steps.filter((s) => s.ok);
    const blocked = steps.filter((s) => !s.ok);

    if (considered === 0) {
      return (
        `Nothing to do: every open case is waiting on a person` +
        (blockedOnHuman > 0 ? ` (${blockedOnHuman} at a human gate)` : '') +
        `, or already closed.`
      );
    }

    const parts: string[] = [];
    parts.push(`Reviewed ${considered} open case(s).`);

    if (moved.length > 0) {
      const summary = moved
        .map((s) => `${s.arn} ${s.from}→${s.to}`)
        .slice(0, 6)
        .join(', ');
      parts.push(`Advanced ${moved.length}: ${summary}.`);
    } else {
      parts.push('No case could be advanced this pass.');
    }

    if (blocked.length > 0) {
      parts.push(`${blocked.length} blocked — ${blocked[0]?.outcome ?? 'precondition not met'}`);
    }
    if (blockedOnHuman > 0) {
      parts.push(`${blockedOnHuman} case(s) are parked at a human gate and will stay there.`);
    }
    if (breaches > 0) {
      parts.push(`${breaches} new SLA breach(es) raised.`);
    }

    return parts.join(' ');
  }
}
