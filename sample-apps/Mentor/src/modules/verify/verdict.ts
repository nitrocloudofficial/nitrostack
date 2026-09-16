/**
 * The build verdict — `mentor.verdict/v1`, and MCP‑2's last word on a session.
 *
 * The architecture page puts this immediately after the gates: *"Build verdict — after
 * the last checkpoint passes: was the complete project built successfully — or
 * escalated with the drift report attached."* Two outcomes, and the second is the
 * interesting one. `escalated` is not a failure mode of the tool; it is the case the
 * whole product exists for, and it is the case MCP‑3 makes a flashcard from.
 *
 * ## Three statuses, and the one that is deliberately not a verdict
 *
 * - `complete` — every gate passed, the design covered the slice, tests green.
 * - `escalated` — the build is finished being *worked on* but something is wrong, and
 *   the drift report travels attached. This is what gets filed and taught from.
 * - `in_progress` — a snapshot. Recorded by MCP‑3 so a returning student can resume,
 *   but it issues no card, because a card against an unfinished session would file a
 *   lesson the student has not had yet.
 *
 * ## `given` components are why this needs the spec and not just the plan
 *
 * The drift engine will report a boundary component as planned-but-never-implemented.
 * That is *true* and it is *not a defect* — the student drew somebody else's box as
 * their edge, exactly as instructed. Only the brief knows that, and the brief lives in
 * MCP‑1, so the knowledge travels in the spec's `given` array and is reconciled here.
 * Without it, the single most likely first experience of the tool would be a false
 * accusation, which is the fastest way to lose a student's trust for good.
 */

import { findDrift, type DriftReport } from '../mentor/drift.js';
import { normalizeComponent } from '../../shared/component.js';
import type { Plan } from '../../shared/plan.js';
import {
  VERDICT_SCHEMA,
  type BuildEvent,
  type CheckpointSpec,
  type Verdict,
  type VerdictDrift,
} from '../../shared/contracts.js';
import { buildFromEvents, findStuck, latestTestRun, verifyCheckpoints, type GateResult } from './verify.js';

/** Who issued a verdict. Stamped on the artifact so a stale one is attributable. */
export const ISSUER = 'mentor-sentinel/1.0.0 (MCP-2)';

export interface Assessment {
  readonly verdict: Verdict;
  /** The per-gate detail, with evidence. Too verbose for the artifact, useful in a tool. */
  readonly gates: readonly GateResult[];
  readonly drift: DriftReport | null;
  /** Boundary components correctly drawn and correctly not built. */
  readonly expectedUnbuilt: readonly string[];
  /** Drawn, built, or claimed but not in this role's slice at all. */
  readonly outsideTheSlice: readonly string[];
}

/**
 * Assess a session and produce the verdict.
 *
 * `finalise` distinguishes "tell me where I am" from "I am done, judge me". Both walk
 * exactly the same analysis — the only difference is whether the result is allowed to
 * be `complete`/`escalated` or is reported as a snapshot. Sharing the path means a
 * student's mid-build view can never disagree with their final verdict about the same
 * facts.
 */
export function assess(input: {
  spec: CheckpointSpec;
  plan: Plan;
  events: readonly BuildEvent[];
  student?: string;
  finalise: boolean;
}): Assessment {
  const { spec, plan, events } = input;

  const gates = verifyCheckpoints(spec, events);
  const build = buildFromEvents(spec, events);
  const stuck = findStuck(spec, events, gates);

  // The drift engine needs a history with at least one implement step; before that
  // there is genuinely nothing to compare, and running it would produce a claim about
  // an empty sequence.
  const hasImplemented = build.steps.some((s) => s.kind === 'implement');
  const drift = hasImplemented ? findDrift(plan, build) : null;

  const implement = gates.filter((g) => g.kind === 'implement');
  const verify = gates.filter((g) => g.kind === 'verify');
  const implemented = {
    reached: implement.filter((g) => g.status === 'pass').length,
    total: implement.length,
  };
  const verified = {
    reached: verify.filter((g) => g.status === 'pass').length,
    total: verify.length,
  };

  const lastRun = latestTestRun(events);
  const testsGreen = lastRun?.green ?? false;

  // Reconcile the drift engine's unbuilt list against the brief's `given`. A boundary
  // box is expected to be unbuilt; anything else unbuilt is real outstanding work.
  const givenKeys = new Set(spec.given.map((c) => normalizeComponent(c)));
  const ownedKeys = new Set(spec.owns.map((c) => normalizeComponent(c)));
  const expectedUnbuilt = (drift?.unbuilt ?? []).filter((c) => givenKeys.has(normalizeComponent(c)));
  const outsideTheSlice = [
    ...new Set(
      [...(drift?.unplanned ?? []), ...plan.nodes.map((n) => n.label)].filter((label) => {
        const key = normalizeComponent(label);
        return !ownedKeys.has(key) && !givenKeys.has(key);
      }),
    ),
  ];

  const blocking = describeBlocking(gates, spec, outsideTheSlice);
  const done = blocking.length === 0 && testsGreen;

  const status: Verdict['status'] = !input.finalise
    ? 'in_progress'
    : done
      ? 'complete'
      : 'escalated';

  return {
    verdict: {
      schema: VERDICT_SCHEMA,
      issued_by: ISSUER,
      student: (input.student ?? spec.student ?? 'anonymous').trim() || 'anonymous',
      project: spec.project,
      role: spec.role,
      status,
      statement: statementFor(status, implemented, verified, blocking, drift),
      checkpoints: gates.map((g) => ({
        id: g.id,
        subject: g.subject,
        kind: g.kind,
        status: g.status,
        at: g.at,
        file: g.file,
        line: g.line,
        out_of_order: g.out_of_order,
        should_follow: g.should_follow,
        attempts: g.attempts,
      })),
      implemented,
      verified,
      drift: drift ? toVerdictDrift(drift) : null,
      stuck,
      concept: spec.concept,
      provenance: build.provenance,
      tests_green: testsGreen,
      at: new Date().toISOString(),
    },
    gates,
    drift,
    expectedUnbuilt,
    outsideTheSlice,
  };
}

/** Everything still outstanding, in the words a student can act on. */
export function describeBlocking(
  gates: readonly GateResult[],
  spec: CheckpointSpec,
  outsideTheSlice: readonly string[],
): string[] {
  const blocking: string[] = [];

  for (const gate of gates) {
    if (gate.status === 'pass') continue;
    if (gate.kind === 'implement') {
      blocking.push(`${gate.subject} is not implemented`);
      continue;
    }
    blocking.push(
      gate.status === 'fail'
        ? `failing: ${gate.subject} — you ran this and it did not hold`
        : `not yet verified: ${gate.subject}`,
    );
  }

  for (const label of outsideTheSlice) {
    blocking.push(`${label} is in your design or your build but is not yours to build`);
  }

  if (gates.filter((g) => g.kind === 'verify').length === 0) {
    blocking.push(
      'this spec has no acceptance gates, so nothing can confirm the slice works — done cannot ' +
        'be claimed',
    );
  }

  // An owned component with no gate at all means MCP-1 and MCP-2 disagree about the
  // slice, which is a bridge problem rather than a student problem — surfaced here
  // because it would otherwise show up as an unearned "complete".
  const gated = new Set(
    gates.filter((g) => g.kind === 'implement').map((g) => normalizeComponent(g.subject)),
  );
  for (const owned of spec.owns) {
    if (!gated.has(normalizeComponent(owned))) {
      blocking.push(
        `${owned} is in your brief but has no gate in this spec — re-derive it with MCP-1 ` +
          'checkpoint_spec rather than trusting this verdict',
      );
    }
  }

  return blocking;
}

function statementFor(
  status: Verdict['status'],
  implemented: { reached: number; total: number },
  verified: { reached: number; total: number },
  blocking: readonly string[],
  drift: DriftReport | null,
): string {
  const counts = `${implemented.reached}/${implemented.total} built, ${verified.reached}/${verified.total} verified`;

  if (status === 'complete') {
    return (
      `Complete. ${counts}, your design covered your slice exactly, and your tests are green. ` +
      (drift?.origin
        ? 'You got there through a detour — see the drift report for where — and you fixed it ' +
          'yourself, which is the part that counts.'
        : 'You built it in the order you designed it.')
    );
  }

  if (status === 'escalated') {
    return (
      `Escalated. ${counts}, and ${blocking.length} condition(s) outstanding. ` +
      (drift?.origin
        ? `The drift report is attached: ${drift.origin.component} was designed after ` +
          `${drift.origin.shouldFollow} and built before it, at ${drift.origin.file}:` +
          `${drift.origin.line ?? '?'}.`
        : 'No ordering drift found — what is outstanding is work rather than a wrong decision.')
    );
  }

  return `In progress. ${counts}. ${blocking.length} condition(s) outstanding.`;
}

/** Narrow the full drift report to what crosses the bridge to MCP-3. */
function toVerdictDrift(report: DriftReport): VerdictDrift {
  return {
    found: !!report.origin,
    explanation: report.explanation,
    origin: report.origin
      ? {
          component: report.origin.component,
          file: report.origin.file,
          line: report.origin.line,
          shouldFollow: report.origin.shouldFollow,
          plannedPosition: report.origin.plannedPosition,
          actualPosition: report.origin.actualPosition,
          dependency: report.origin.dependency,
          at: report.origin.at,
        }
      : null,
    failure: report.failure
      ? {
          test: report.failure.test,
          file: report.failure.file,
          line: report.failure.line,
          message: report.failure.message,
        }
      : null,
    planned_order: report.plannedOrder,
    actual_order: report.actualOrder,
    confidence: report.confidence.score,
    confidence_components: report.confidence.components,
    caveats: report.caveats,
  };
}
