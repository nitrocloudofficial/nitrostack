/**
 * The drift detector — MENTOR's one real algorithm.
 *
 * Input: a plan (what the student meant, ordered) and a build history (what they
 * did, ordered). Output: the single point where the build stopped matching the
 * plan, with a file:line and a stated confidence.
 *
 * ## Which component is the origin?
 *
 * In the pricing fixture the plan is `validate -> discount -> tax -> total` and
 * the build order was `validate, tax, discount, total`. *Two* components sit in
 * the wrong place, so "find a mismatch" is not enough — it would report both and
 * leave the student to guess.
 *
 * The asymmetry that resolves it: **one component jumped the queue, the other was
 * merely displaced by it.** `tax` was built before `discount`, which the plan says
 * must precede it. `discount` broke no stated dependency — it just ended up later.
 * `tax` is the cause; `discount` is the symptom. So:
 *
 * > The origin is the earliest component, in *build* order, that was implemented
 * > before something the *plan* says should have come first.
 *
 * This is why the explanation can be specific and why it matches the student's
 * own diagram rather than a heuristic about code.
 *
 * ## Why confidence is computed, not asserted
 *
 * `MENTOR-CONCEPT.md` §3 makes stated uncertainty a product feature — "a student
 * who learns to check where the AI is guessing has learned something durable."
 * A hardcoded 91% would make that a lie. Every term in `confidence` below is a
 * real property of the two artifacts, and the fixture scores 0.91 because its
 * history is hand-authored rather than git-derived — the one genuine weakness in
 * the demo, surfaced by the product instead of hidden in a footnote.
 */

import {
  dependencyPath,
  labelOf,
  orderDeterminism,
  plannedLabels,
  type Plan,
} from '../../shared/plan.js';
import { actualOrder, normalizeComponent, type Build, type BuildStep } from './build.js';

/** Weights for the origin-claim confidence. Sums to 1. */
export const CONFIDENCE_WEIGHTS = {
  /** Did the plan explicitly order the violated pair? The strongest signal by far. */
  dependency: 0.4,
  /** Was everything the student built actually in the plan? */
  coverage: 0.2,
  /** Does the plan commit to an order at all, or is it disconnected boxes? */
  determinism: 0.15,
  /** Was the history observed (git) or asserted (hand-authored)? */
  provenance: 0.15,
  /** Does the reported failure connect to a file we have steps for? */
  failureLink: 0.1,
} as const;

export interface DriftOrigin {
  /** The component that jumped the queue — the thing to talk to the student about. */
  readonly component: string;
  readonly planNodeId: string;
  readonly file: string;
  readonly line: number | null;
  /** The component it was built ahead of, which the plan put first. */
  readonly shouldFollow: string;
  /** 1-based position in the plan's intended sequence. */
  readonly plannedPosition: number;
  /** 1-based position in the actual build sequence. */
  readonly actualPosition: number;
  /** Whether the plan stated this dependency directly or via a longer path. */
  readonly dependency: 'direct' | 'transitive';
  readonly at: string;
  readonly summary: string;
}

export interface ConfidenceBreakdown {
  readonly score: number;
  readonly components: Record<string, { score: number; weight: number; reason: string }>;
}

export interface DriftReport {
  readonly planName: string;
  readonly project: string;
  /** null when the build followed the plan — a real and useful answer. */
  readonly origin: DriftOrigin | null;
  readonly plannedOrder: readonly string[];
  readonly actualOrder: readonly string[];
  /** Every ordering violation found, origin first. Usually one. */
  readonly violations: readonly DriftOrigin[];
  /** Planned but never implemented. */
  readonly unbuilt: readonly string[];
  /** Implemented but never planned. */
  readonly unplanned: readonly string[];
  readonly failure: Build['failure'];
  readonly confidence: ConfidenceBreakdown;
  /** Everything a reader should distrust, from either artifact plus our own. */
  readonly caveats: readonly string[];
  /** Human-readable one-liner: the sentence MENTOR leads with. */
  readonly explanation: string;
}

/**
 * Locate the point where the build diverged from the plan.
 *
 * Pure and deterministic — no clock, no randomness, no model. The same two
 * artifacts always produce the same report, which is what makes it testable and
 * what stops MENTOR reporting different drift on two runs of an unchanged project.
 */
export function findDrift(plan: Plan, build: Build): DriftReport {
  const caveats: string[] = [...plan.warnings, ...build.warnings];

  const built = actualOrder(build);
  const plannedIds = [...plan.order];

  // Join the two artifacts on the normalized component name.
  const planIdByComponent = new Map<string, string>();
  for (const id of plannedIds) planIdByComponent.set(normalizeComponent(labelOf(plan, id)), id);
  const builtByComponent = new Map<string, BuildStep>();
  for (const s of built) builtByComponent.set(normalizeComponent(s.component), s);

  const shared = plannedIds.filter((id) => builtByComponent.has(normalizeComponent(labelOf(plan, id))));
  const unbuilt = plannedIds
    .filter((id) => !builtByComponent.has(normalizeComponent(labelOf(plan, id))))
    .map((id) => labelOf(plan, id));
  const unplanned = built
    .filter((s) => !planIdByComponent.has(normalizeComponent(s.component)))
    .map((s) => s.component);

  // Said out loud, not left to be inferred from a confidence component. A student who
  // has logged their implement work but not yet run the tests gets a correct ordering
  // claim with nothing tying it to an observed symptom, and MENTOR should volunteer
  // that rather than presenting the claim as though it explained a real failure.
  if (!build.failure) {
    caveats.push(
      'no failure was reported — this describes where the build left the plan, not the cause of ' +
        'a symptom anyone has seen',
    );
  }
  if (unbuilt.length) caveats.push(`planned but never implemented: ${unbuilt.join(', ')}`);
  if (unplanned.length) caveats.push(`implemented but never planned: ${unplanned.join(', ')}`);
  if (plan.cyclic) {
    caveats.push(
      'the plan contains a cycle, so it does not state a single intended sequence — treat any ordering claim below as unreliable',
    );
  }

  // Position lookups, restricted to components present in both artifacts.
  const plannedIndex = new Map<string, number>();
  shared.forEach((id, i) => plannedIndex.set(normalizeComponent(labelOf(plan, id)), i));
  const sharedBuilt = built.filter((s) => planIdByComponent.has(normalizeComponent(s.component)));
  const actualIndex = new Map<string, number>();
  sharedBuilt.forEach((s, i) => actualIndex.set(normalizeComponent(s.component), i));

  // ── the violation scan ──
  // For each component in build order, did it get built before something the plan
  // says should precede it? The first one that did is the origin.
  const violations: DriftOrigin[] = [];
  for (const step of sharedBuilt) {
    const key = normalizeComponent(step.component);
    const nodeId = planIdByComponent.get(key) as string;
    const myPlanned = plannedIndex.get(key) as number;
    const myActual = actualIndex.get(key) as number;

    for (const otherId of shared) {
      const otherKey = normalizeComponent(labelOf(plan, otherId));
      if (otherKey === key) continue;
      const otherPlanned = plannedIndex.get(otherKey) as number;
      const otherActual = actualIndex.get(otherKey) as number;

      // Plan says `other` first, build did `step` first → step jumped the queue.
      if (otherPlanned < myPlanned && otherActual > myActual) {
        const dep = dependencyPath(plan, otherId, nodeId);
        // No path means the plan never ordered this pair; `order` put them in
        // that sequence by canvas position alone. Claiming drift here would be
        // pointing at a line because of where a box sits on screen.
        if (dep === 'none') {
          caveats.push(
            `${step.component} was built before ${labelOf(plan, otherId)}, but the plan never connected them — not counted as drift`,
          );
          continue;
        }
        violations.push({
          component: step.component,
          planNodeId: nodeId,
          file: step.file,
          line: step.line,
          shouldFollow: labelOf(plan, otherId),
          plannedPosition: myPlanned + 1,
          actualPosition: myActual + 1,
          dependency: dep,
          at: step.at,
          summary: step.summary,
        });
        break; // one violation per component is enough to name it the origin
      }
    }
  }

  const origin = violations[0] ?? null;
  const confidence = scoreConfidence({ plan, build, origin, shared, unplanned, built });

  return {
    planName: plan.name,
    project: build.project,
    origin,
    plannedOrder: plannedLabels(plan),
    actualOrder: built.map((s) => s.component),
    violations,
    unbuilt,
    unplanned,
    failure: build.failure,
    confidence,
    caveats,
    explanation: explain(origin, build),
  };
}

/** The sentence MENTOR leads with. */
function explain(origin: DriftOrigin | null, build: Build): string {
  if (!origin) {
    const where = build.failure?.file
      ? `${build.failure.file}${build.failure.line ? `:${build.failure.line}` : ''}`
      : 'the failing test';
    return (
      'Your build followed your plan — every component was implemented in the order you designed. ' +
      `So this bug is not a design drift: it is inside one component's logic. Start at ${where}.`
    );
  }
  const at = origin.line ? ` (${origin.file}:${origin.line})` : origin.file ? ` (${origin.file})` : '';
  return (
    `You designed ${origin.component} to come after ${origin.shouldFollow}. ` +
    `You implemented it before${at}.`
  );
}

interface ScoreInput {
  plan: Plan;
  build: Build;
  origin: DriftOrigin | null;
  shared: string[];
  unplanned: string[];
  built: BuildStep[];
}

/** Turn real properties of the two artifacts into one explainable score. */
function scoreConfidence(input: ScoreInput): ConfidenceBreakdown {
  const { plan, build, origin, unplanned, built } = input;
  const W = CONFIDENCE_WEIGHTS;

  const dependencyScore = !origin ? 0.7 : origin.dependency === 'direct' ? 1 : 0.6;
  const dependencyReason = !origin
    ? 'no ordering violation found — nothing to claim'
    : origin.dependency === 'direct'
      ? `the plan draws ${origin.shouldFollow} -> ${origin.component} as a direct edge`
      : `the plan orders ${origin.shouldFollow} before ${origin.component} only through intermediate steps`;

  const coverage = built.length === 0 ? 0 : (built.length - unplanned.length) / built.length;
  const determinism = orderDeterminism(plan);
  // `observed` sits between the two originals on purpose. A checkpoint log
  // (`learn/checkpoints.ts`) is written as the work happens, so the *sequence* —
  // the only thing MENTOR's claim actually rests on — was witnessed rather than
  // remembered. But the student is still the one who declared each checkpoint
  // reached, and a declaration is not a commit. 0.8 prices in that gap and no more.
  const provenanceScore =
    build.provenance === 'git' ? 1 : build.provenance === 'observed' ? 0.8 : 0.4;
  // Checked against ALL steps, not just `implement` ones: a failure surfaces in a
  // test file, and test-file activity is recorded as a `verify` step. Matching
  // only implement steps would make this signal unreachable in the common case.
  const failureLinked =
    build.failure?.file && build.steps.some((s) => s.file === build.failure?.file) ? 1 : 0;

  const components: ConfidenceBreakdown['components'] = {
    dependency: { score: round3(dependencyScore), weight: W.dependency, reason: dependencyReason },
    coverage: {
      score: round3(coverage),
      weight: W.coverage,
      reason: unplanned.length
        ? `${unplanned.length} of ${built.length} component(s) built were never in the plan`
        : 'every component built was in the plan',
    },
    determinism: {
      score: round3(determinism),
      weight: W.determinism,
      reason:
        determinism >= 0.999
          ? 'the plan is a strict chain — it orders every pair of components'
          : `the plan commits to an order for ${Math.round(determinism * 100)}% of component pairs`,
    },
    provenance: {
      score: provenanceScore,
      weight: W.provenance,
      reason:
        build.provenance === 'git'
          ? 'history derived from real commits'
          : build.provenance === 'observed'
            ? 'sequence recorded by the checkpoint tracker as the work happened, but each ' +
              'checkpoint was self-reported rather than derived from a commit'
            : 'history is hand-authored, not observed from commits — discounted',
    },
    failureLink: {
      score: failureLinked,
      // Three distinct states, not two. "does not link to any recorded step" read as
      // though a failure had been reported and could not be matched, when the common
      // case for a student mid-session is that they never reported one — they have
      // tracked their implement work and not yet run the tests. Describing an absent
      // input as a failed match is the kind of small dishonesty that makes the whole
      // confidence breakdown less believable.
      weight: W.failureLink,
      reason: failureLinked
        ? `the reported failure is in a file this history covers (${build.failure?.file})`
        : build.failure
          ? 'the reported failure does not link to any recorded step'
          : 'no failure was reported, so nothing anchors this claim to something that ' +
            'actually broke — record the test run to raise this',
    },
  };

  let score = Object.values(components).reduce((sum, c) => sum + c.score * c.weight, 0);

  // A cyclic plan states no sequence at all; no combination of other signals
  // should let an ordering claim out of the door at high confidence.
  if (plan.cyclic) score = Math.min(score, 0.35);

  return { score: round3(score), components };
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * The plan-vs-build alignment, as text. Fills the engine's `diff` slot: MENTOR
 * changes no code, so its "diff" is the comparison itself.
 */
export function renderAlignment(report: DriftReport): string {
  const rows: string[] = [];
  rows.push('@@ plan vs build @@');
  rows.push(`  plan : ${report.plannedOrder.join(' -> ')}`);
  rows.push(`  build: ${report.actualOrder.join(' -> ')}`);
  if (report.origin) {
    const o = report.origin;
    rows.push('');
    rows.push(`- planned ${o.component} at position ${o.plannedPosition} (after ${o.shouldFollow})`);
    rows.push(
      `+ built   ${o.component} at position ${o.actualPosition}${o.file ? ` — ${o.file}${o.line ? `:${o.line}` : ''}` : ''}`,
    );
  }
  if (report.failure) {
    rows.push('');
    rows.push(
      `  surfaced at ${report.failure.file}${report.failure.line ? `:${report.failure.line}` : ''} — ${report.failure.message}`,
    );
  }
  return rows.join('\n');
}
