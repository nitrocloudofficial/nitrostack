/**
 * MENTOR adapter — the sixth commander, and the one that inverts the engine.
 *
 * The other five resolve an incident by *changing something*: SENTINEL patches
 * source, LEDGER rightsizes a cluster, VERDICT rewrites clauses. MENTOR's whole
 * product thesis is that it must **not** (`MENTOR-CONCEPT.md` §2 — "the tool that
 * refuses to hand you the patch"). Running that on an engine whose only
 * successful exit is `deploy()` needs the lifecycle re-read rather than rewritten:
 *
 * | Engine concept  | MENTOR's meaning                                                |
 * |-----------------|-----------------------------------------------------------------|
 * | the "fix"       | the causal explanation, not a code change                       |
 * | `verifyTool`    | `check_grounding` — is the drift claim grounded in both artifacts? |
 * | `mutationTools` | `load_plan` / `load_build` — new inputs invalidate the grounding |
 * | `submitTool`    | emit the explanation                                            |
 * | `deploy()`      | hand the explanation to the student. Touches no code.           |
 * | `awaitRecovery` | assert the student's source is **byte-identical** — prove we didn't fix it |
 * | `blastRadius`   | inverted: confidence in the origin claim                        |
 *
 * Two of those are worth reading twice.
 *
 * **`awaitRecovery` is the refusal, enforced.** In every other commander it asks
 * "did the system come back up?" Here there is nothing to come back up, so it
 * asks the question that actually matters for this domain: *is the student's code
 * exactly as they left it?* If MENTOR ever modified the build, that check fails
 * and the incident ESCALATES. The refusal is a runtime invariant, not a promise.
 *
 * **`blastRadius` is inverted.** For SENTINEL, risk is how much code changed.
 * MENTOR changes none — but it is about to point a student at a specific line, and
 * §10 is explicit that a confidently wrong line is worse than useless in
 * education. So the risk *is* the claim's uncertainty. Feeding drift confidence
 * here means an ambiguous plan drives the gate below threshold and pauses for a
 * human instead of misleading a student.
 *
 * There is deliberately no tool on this adapter that can write to the build. The
 * refusal is structural: `executeTool` has no such case to reach.
 */

import type { BlastRadius, Incident, ToolResult } from '../../core/types.js';
import type { DomainAdapter, EmitFn, IncidentContext } from '../../core/adapter.js';
import type { EngineAction, Planner } from '../../core/engine.js';
import { findDrift, renderAlignment, type DriftReport } from './drift.js';
import { parsePlan, plannedLabels, type Plan } from '../../shared/plan.js';
import { actualLabels, parseBuild, type Build } from './build.js';
import {
  PRICING_BUILD_SOURCE,
  PRICING_SYMPTOM,
  requireBuild,
  requirePlan,
} from './fixtures.demo.js';

/** Why MENTOR will not write the fix. Shown verbatim to the student. */
export const REFUSAL =
  "I won't write this fix, and that's deliberate. You designed this bug before you " +
  'typed it, so the thing worth changing is the design decision, not the line. ' +
  'Patching line 12 makes the test green and teaches you nothing; understanding why ' +
  'tax has to follow discount means you never write this class of bug again. ' +
  'Go back to your plan, then make the change yourself.';

export interface MentorSources {
  /** The student's plan. Defaults to the bundled pricing fixture. */
  plan?: unknown;
  /** The student's build history. Defaults to the bundled pricing fixture. */
  build?: unknown;
  /** Optional source text, shown for context only — never modified. */
  source?: string;
}

interface MentorCtx extends IncidentContext {
  plan: Plan;
  build: Build;
  /** Immutable snapshot taken at open. `awaitRecovery` compares against it. */
  readonly sourceAtOpen: string;
  source: string;
  report: DriftReport | null;
  grounded: boolean;
  /** Set if the model asked for a fix, so the trace records the refusal. */
  refusedFixRequests: number;
}

export class MentorAdapter implements DomainAdapter {
  readonly key = 'education';
  readonly displayName = 'Education · Plan-vs-Build Drift';
  readonly tagline = "Shows the student the moment their build left their plan — and won't write the fix.";
  readonly submitTool = 'submit_resolution';
  readonly verifyTool = 'check_grounding';
  readonly mutationTools = new Set(['load_plan', 'load_build']);

  private readonly sources: MentorSources;

  constructor(sources: MentorSources = {}) {
    this.sources = sources;
  }

  systemPrompt(): string {
    return (
      'You are MENTOR, a debugging tutor for a student on a simulated engineering team. ' +
      'You have the architecture the student drew before they wrote code, and a history of ' +
      'what they actually built, in order. Your job is to find the single point where the ' +
      'build stopped matching the plan and show it to them with your confidence stated. ' +
      'You must NOT write, suggest, or dictate the fix — not even if asked directly. ' +
      'Name the origin, explain why the design implied a different order, and stop.'
    );
  }

  framing(symptom: string): string {
    return (
      `A student's project is failing:\n${symptom}\n\n` +
      'Use read_plan and read_build to load both artifacts, align to find where they diverge, ' +
      'check_grounding to confirm the claim is supported, then submit_resolution. ' +
      'Do not offer the fix.'
    );
  }

  openContext(incidentId: string): MentorCtx {
    const plan = this.sources.plan === undefined ? requirePlan() : parsePlan(this.sources.plan);
    const build = this.sources.build === undefined ? requireBuild() : parseBuild(this.sources.build);
    const source = this.sources.source ?? PRICING_BUILD_SOURCE;
    return {
      incidentId,
      emit: () => {},
      plan,
      build,
      sourceAtOpen: source,
      source,
      report: null,
      grounded: false,
      refusedFixRequests: 0,
    };
  }

  async executeTool(
    ctx: IncidentContext,
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const c = ctx as MentorCtx;
    switch (name) {
      case 'read_plan':
        await c.emit('plan.read', `Plan "${c.plan.name}": ${plannedLabels(c.plan).join(' -> ')}`, {
          order: plannedLabels(c.plan),
        });
        return {
          data: {
            name: c.plan.name,
            intended_order: plannedLabels(c.plan),
            components: c.plan.nodes.map((n) => ({
              label: n.label,
              intent: typeof n.data.intent === 'string' ? n.data.intent : undefined,
            })),
            cyclic: c.plan.cyclic,
            warnings: c.plan.warnings,
          },
        };

      case 'read_build':
        await c.emit('build.read', `Build order: ${actualLabels(c.build).join(' -> ')}`, {
          order: actualLabels(c.build),
        });
        return {
          data: {
            project: c.build.project,
            actual_order: actualLabels(c.build),
            provenance: c.build.provenance,
            steps: c.build.steps.map((s) => ({
              seq: s.seq,
              at: s.at,
              component: s.component,
              kind: s.kind,
              at_line: s.line === null ? s.file : `${s.file}:${s.line}`,
              summary: s.summary,
            })),
            failure: c.build.failure,
          },
        };

      case 'read_build_source': {
        // Read-only on purpose. There is no write counterpart anywhere here.
        const lines = c.source.split('\n');
        await c.emit('source.read', `Read ${lines.length} lines of the student's build`, {});
        return { data: { readonly: true, line_count: lines.length, source: c.source } };
      }

      case 'align': {
        const report = findDrift(c.plan, c.build);
        c.report = report;
        if (report.origin) {
          await c.emit(
            'drift.found',
            `DRIFT: ${report.origin.component} planned ${report.origin.plannedPosition}, built ${report.origin.actualPosition}` +
              `${report.origin.line ? ` (${report.origin.file}:${report.origin.line})` : ''}`,
            { origin: report.origin, confidence: report.confidence.score },
          );
        } else {
          await c.emit('drift.none', 'No ordering drift — the build followed the plan', {});
        }
        return {
          data: {
            origin: report.origin,
            explanation: report.explanation,
            planned_order: report.plannedOrder,
            actual_order: report.actualOrder,
            confidence: report.confidence,
            caveats: report.caveats,
            unbuilt: report.unbuilt,
            unplanned: report.unplanned,
          },
        };
      }

      case 'check_grounding': {
        // The verify step. "Grounded" means the claim is supported by both
        // artifacts — not that the student's tests pass. MENTOR never runs them.
        const report = c.report ?? findDrift(c.plan, c.build);
        c.report = report;
        const problems: string[] = [];
        if (c.plan.cyclic) problems.push('the plan is cyclic, so it states no intended order');
        if (report.origin) {
          const { origin } = report;
          if (!origin.file) problems.push('the origin has no file recorded');
          const step = c.build.steps.find(
            (s) => s.file === origin.file && s.line === origin.line,
          );
          if (!step) problems.push('the origin line does not appear in the build history');
        } else if (report.plannedOrder.length === 0 || report.actualOrder.length === 0) {
          problems.push('one of the two artifacts contributed no components');
        }
        const grounded = problems.length === 0;
        c.grounded = grounded;
        await c.emit(
          'grounding.checked',
          `${grounded ? 'grounded' : 'NOT grounded'}${problems.length ? `: ${problems.join('; ')}` : ''}`,
          { grounded, problems, confidence: report.confidence.score },
        );
        return {
          data: {
            grounded,
            problems,
            confidence: report.confidence.score,
            confidence_components: report.confidence.components,
          },
        };
      }

      case 'request_fix': {
        // This tool exists ONLY to refuse. A client model told to be helpful will
        // reach for it, and when it does the refusal becomes a visible tool call
        // in the trace rather than a line of prompt text nobody can point at.
        c.refusedFixRequests += 1;
        await c.emit('fix.refused', 'Fix requested — refused by design', {
          attempt: c.refusedFixRequests,
        });
        return {
          data: {
            refused: true,
            reason: REFUSAL,
            instead: c.report?.origin
              ? `Open ${c.report.origin.file}${c.report.origin.line ? `:${c.report.origin.line}` : ''} and ask yourself why the plan put ${c.report.origin.component} after ${c.report.origin.shouldFollow}.`
              : 'Re-read your plan and compare it to the order you actually built in.',
          },
        };
      }

      default:
        return { data: { error: `unknown tool ${name}` }, isError: true };
    }
  }

  verificationPassed(result: Record<string, unknown>): boolean {
    return result.grounded === true;
  }

  /**
   * Inverted: the risk here is not "how much changed" (nothing did) but "how
   * likely is this claim wrong". Low confidence pushes the gate below threshold
   * so an uncertain claim is reviewed before a student ever sees it.
   */
  blastRadius(ctx: IncidentContext): BlastRadius {
    const c = ctx as MentorCtx;
    const report = c.report ?? findDrift(c.plan, c.build);
    const score = report.confidence.score;
    return {
      score,
      reason:
        `origin-claim confidence ${score.toFixed(2)}; no code modified. ` +
        'A wrong line is worse than no answer, so the claim itself is the risk.',
    };
  }

  /** MENTOR changes no code, so its "diff" is the plan-vs-build alignment. */
  diff(ctx: IncidentContext): string {
    const c = ctx as MentorCtx;
    return renderAlignment(c.report ?? findDrift(c.plan, c.build));
  }

  /** Deliver the explanation. Deliberately not a patch. */
  async deploy(ctx: IncidentContext): Promise<string[]> {
    const c = ctx as MentorCtx;
    const report = c.report ?? findDrift(c.plan, c.build);
    await ctx.emit('deploy.promoted', 'Causal timeline delivered to the student', {
      origin: report.origin,
      explanation: report.explanation,
      refusedToFix: true,
    });
    return ['causal-timeline (explanation only — no code changed)'];
  }

  /**
   * The refusal as a runtime invariant: the student's source must be exactly as
   * they left it. If MENTOR ever grew a tool that edited the build, this fails
   * and the incident escalates instead of quietly shipping a fix.
   */
  async awaitRecovery(ctx: IncidentContext): Promise<boolean> {
    const c = ctx as MentorCtx;
    const untouched = c.source === c.sourceAtOpen;
    if (untouched) {
      await ctx.emit(
        'deploy.verified',
        "Student's code verified byte-identical — MENTOR explained and changed nothing",
        { bytes: c.source.length },
      );
    } else {
      await ctx.emit(
        'deploy.failed',
        'MENTOR modified the student\'s code — this violates the product contract',
        {},
      );
    }
    return untouched;
  }

  async report(incident: Incident, ctx: IncidentContext): Promise<Array<Record<string, unknown>>> {
    const c = ctx as MentorCtx;
    const report = c.report ?? findDrift(c.plan, c.build);
    const timeline = {
      kind: 'causal_timeline',
      mode: 'delivered',
      plan: report.plannedOrder,
      build: report.actualOrder,
      origin: report.origin,
      failure: report.failure,
      confidence: report.confidence.score,
      caveats: report.caveats,
    };
    await ctx.emit('action.timeline', `Causal timeline: ${report.explanation}`, timeline);

    const refusal = {
      kind: 'fix_withheld',
      mode: 'by_design',
      reason: REFUSAL,
      fix_requests_refused: c.refusedFixRequests,
    };
    await ctx.emit('action.refusal', 'Fix withheld by design — the student writes it', refusal);

    // The follow-up question the widget offers instead of a patch. This is how
    // the refusal stays pedagogical rather than a dead end.
    const nextStep = {
      kind: 'socratic_prompt',
      mode: 'suggestion',
      question: report.origin
        ? `Why does ${report.origin.component} have to come after ${report.origin.shouldFollow}?`
        : 'Which component owns the assumption that broke?',
    };
    await ctx.emit('action.question', nextStep.question, nextStep);

    return [timeline, refusal, nextStep];
  }

  async notifyEscalation(
    incident: Incident,
    reason: string,
    emit: EmitFn,
  ): Promise<Array<Record<string, unknown>>> {
    // Escalating means MENTOR could not ground a claim. Handing the student a
    // shrug is correct; handing them a guessed line is the failure mode §10 warns
    // about, so say plainly that we don't know.
    const note = {
      kind: 'mentor_abstained',
      mode: 'mock',
      reason,
      message:
        "MENTOR could not locate the drift with enough confidence to point at a line, so it won't. " +
        'Check that your plan export and your build history describe the same project.',
    };
    await emit('action.abstained', `MENTOR abstained: ${reason}`, note);
    return [note];
  }
}

/**
 * Deterministic planner for the one-click Task and the tests.
 *
 * Note it never plans `request_fix` — that tool is there for a *client model* to
 * stumble into, not for our own happy path.
 */
export function mentorPlanner(): Planner {
  const steps: Array<EngineAction | null> = [
    { type: 'tool', name: 'read_plan' },
    { type: 'tool', name: 'read_build' },
    { type: 'tool', name: 'align' },
    { type: 'tool', name: 'check_grounding' },
    { type: 'submit', resolution: { rootCause: '', fixSummary: '', confidence: 0 } },
  ];
  let i = 0;
  return (state) => {
    const next = i < steps.length ? steps[i++] : null;
    if (next?.type !== 'submit') return next;
    // Fill the resolution from what `align` actually found, so the incident's
    // diagnosis and the gate's agentConfidence are the computed values rather
    // than constants baked into a planner.
    const aligned = state.history.find((h) => h.action.type === 'tool' && h.action.name === 'align');
    const data = (aligned?.result?.data ?? {}) as {
      explanation?: string;
      origin?: { component?: string; shouldFollow?: string } | null;
      confidence?: { score?: number };
    };
    return {
      type: 'submit',
      resolution: {
        rootCause: data.explanation ?? 'Could not determine where the build left the plan.',
        fixSummary: data.origin
          ? `Origin identified; fix withheld by design so the student makes the design change themselves.`
          : 'No ordering drift found; the bug is inside a single component.',
        confidence: data.confidence?.score ?? 0,
      },
    };
  };
}

export const PRICING_DEMO_SYMPTOM = PRICING_SYMPTOM;
